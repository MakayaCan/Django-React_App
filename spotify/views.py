# spotify/views.py
from django.shortcuts import redirect
from django.http import JsonResponse
from .credentials import REDIRECT_URI, CLIENT_SECRET, CLIENT_ID
from rest_framework.views import APIView
from requests import Request, post
from rest_framework import status
from rest_framework.response import Response
from .util import (
    update_or_create_user_tokens,
    is_spotify_authenticated,
    execute_spotify_api_request,
    pause_song,
    play_song,
    skip_song,   # <-- make sure this exists in util.py
)
from api.models import Room
from .models import Vote


class AuthURL(APIView):
    def get(self, request, format=None):
        scopes = 'user-read-playback-state user-modify-playback-state user-read-currently-playing streaming'
        url = Request('GET', 'https://accounts.spotify.com/authorize', params={
            'scope': scopes,
            'response_type': 'code',
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID
        }).prepare().url
        return Response({'url': url}, status=status.HTTP_200_OK)


def spotify_callback(request):
    code = request.GET.get('code')
    error = request.GET.get('error')

    if error:
        return JsonResponse({'error': error}, status=400)

    if not code:
        return JsonResponse({'error': 'Authorization code not provided'}, status=400)

    token_response = post('https://accounts.spotify.com/api/token', data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
    })

    if token_response.status_code != 200:
        return JsonResponse({'error': 'Failed to authenticate with Spotify', 'details': token_response.text}, status=400)

    data = token_response.json()
    access_token = data.get('access_token')
    token_type = data.get('token_type')
    refresh_token = data.get('refresh_token')
    expires_in = data.get('expires_in')

    if not access_token or not token_type or not expires_in:
        return JsonResponse({'error': 'Incomplete token response from Spotify'}, status=400)

    if not request.session.exists(request.session.session_key):
        request.session.create()

    update_or_create_user_tokens(
        request.session.session_key,
        access_token,
        token_type,
        expires_in,
        refresh_token
    )

    return redirect('http://127.0.0.1:8000')


class IsAuthenticated(APIView):
    def get(self, request, format=None):
        if not request.session.exists(request.session.session_key):
            request.session.create()

        session_id = request.session.session_key
        is_authenticated = is_spotify_authenticated(session_id)

        return Response({
            'status': is_authenticated,
            'session_id': session_id
        }, status=status.HTTP_200_OK)


class CurrentSong(APIView):
    def get(self, request, format=None):
        room_code = request.session.get('room_code')
        room = Room.objects.filter(code=room_code).first()

        if room is None:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        host = room.host
        endpoint = "player/currently-playing"
        response = execute_spotify_api_request(host, endpoint)

        if 'error' in response or 'item' not in response:
            return Response(response, status=response.get('status', status.HTTP_204_NO_CONTENT))

        item = response.get('item')
        duration = item.get('duration_ms')
        progress = response.get('progress_ms')
        images = item.get('album', {}).get('images', [])
        album_cover = images[0]['url'] if images else ''
        is_playing = response.get('is_playing')
        song_id = item.get('id')
        artists = item.get('artists', [])
        artist_string = ", ".join([artist.get('name') for artist in artists])

        votes = len(Vote.objects.filter(room=room, song_id=song_id))
        song = {
            'title': item.get('name'),
            'artist': artist_string,
            'duration': duration,
            'time': progress,
            'image_url': album_cover,
            'is_playing': is_playing,
            'votes': votes,
            'votes_required': room.votes_to_skip,
            'id': song_id
        }

        self.update_room_song(room, song_id)
        return Response(song, status=status.HTTP_200_OK)
    
    def update_room_song(self, room, song_id):
        current_song = room.current_song
        if current_song != song_id:
            room.current_song = song_id
            room.save(update_fields=['current_song'])
            Vote.objects.filter(room=room).delete()


class PauseSong(APIView):
    def put(self, request, format=None):
        if not request.session.exists(request.session.session_key):
            request.session.create()

        user_session = request.session.session_key
        room_code = request.session.get('room_code')
        room = Room.objects.filter(code=room_code).first()

        if room is None:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        if user_session == room.host or room.guest_can_pause:
            result = pause_song(room.host)
            if 'error' in result:
                return Response(result, status=result.get('status', status.HTTP_400_BAD_REQUEST))
            return Response({'message': 'Paused'}, status=status.HTTP_200_OK)

        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)


class PlaySong(APIView):
    def put(self, request, format=None):
        if not request.session.exists(request.session.session_key):
            request.session.create()

        user_session = request.session.session_key
        room_code = request.session.get('room_code')
        room = Room.objects.filter(code=room_code).first()

        if room is None:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        if user_session == room.host or room.guest_can_pause:
            result = play_song(room.host)
            if 'error' in result:
                return Response(result, status=result.get('status', status.HTTP_400_BAD_REQUEST))
            return Response({'message': 'Playing'}, status=status.HTTP_200_OK)

        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)


class SkipSong(APIView):
    def post(self, request, format=None):
        if not request.session.exists(request.session.session_key):
            request.session.create()

        room_code = request.session.get('room_code')
        room = Room.objects.filter(code=room_code).first()

        if room is None:
            return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        votes = Vote.objects.filter(room=room, song_id=room.current_song)
        votes_needed = room.votes_to_skip

        if request.session.session_key == room.host or len(votes) + 1 >= votes_needed:
            votes.delete()
            result = skip_song(room.host)
            if 'error' in result:
                return Response(result, status=result.get('status', status.HTTP_400_BAD_REQUEST))
            return Response({'message': 'Skipped'}, status=status.HTTP_200_OK)
        else:
            Vote.objects.create(
                user=request.session.session_key,
                room=room,
                song_id=room.current_song
            )
            return Response({'message': 'Voted to skip'}, status=status.HTTP_200_OK)
