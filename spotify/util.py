# spotify/util.py
from .models import SpotifyToken
from django.utils import timezone
from datetime import timedelta
from .credentials import CLIENT_ID, CLIENT_SECRET
from requests import post, put, get

BASE_URL = "https://api.spotify.com/v1/me/"


def get_user_tokens(session_id):
    """Return the SpotifyToken object for the given user/session."""
    return SpotifyToken.objects.filter(user=session_id).first()


def update_or_create_user_tokens(session_id, access_token, token_type, expires_in, refresh_token=None):
    """Update or create the Spotify token record for a user/session."""
    tokens = get_user_tokens(session_id)
    expires_at = timezone.now() + timedelta(seconds=expires_in)

    if tokens:
        tokens.access_token = access_token
        tokens.token_type = token_type
        tokens.expires_in = expires_at
        if refresh_token:
            tokens.refresh_token = refresh_token
        tokens.save(update_fields=["access_token", "token_type", "expires_in", "refresh_token"])
    else:
        SpotifyToken.objects.create(
            user=session_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            expires_in=expires_at
        )


def is_spotify_authenticated(session_id):
    """Check if the user is authenticated and refresh the token if expired."""
    tokens = get_user_tokens(session_id)
    if not tokens:
        return False

    if tokens.expires_in <= timezone.now():
        return refresh_spotify_token(session_id)
    return True


def refresh_spotify_token(session_id):
    """Refresh the Spotify token using the refresh token."""
    tokens = get_user_tokens(session_id)
    if not tokens or not tokens.refresh_token:
        return False

    try:
        response = post(
            'https://accounts.spotify.com/api/token',
            data={
                'grant_type': 'refresh_token',
                'refresh_token': tokens.refresh_token,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            }
        )
    except Exception:
        return False

    if response.status_code != 200:
        return False

    data = response.json()
    access_token = data.get('access_token')
    token_type = data.get('token_type', tokens.token_type)
    expires_in = data.get('expires_in', 3600)
    new_refresh_token = data.get('refresh_token', tokens.refresh_token)

    if not access_token:
        return False

    update_or_create_user_tokens(session_id, access_token, token_type, expires_in, new_refresh_token)
    return True


def execute_spotify_api_request(session_id, endpoint, post_=False, put_=False):
    """
    Make an API request to Spotify on behalf of the user/session.
    Always returns a dict with either valid data or an 'error' key.
    """
    tokens = get_user_tokens(session_id)
    if not tokens:
        return {'error': 'No Spotify tokens found for this user/session'}

    # Refresh token if expired
    if tokens.expires_in <= timezone.now():
        if not refresh_spotify_token(session_id):
            return {'error': 'Failed to refresh Spotify token'}
        tokens = get_user_tokens(session_id)

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f"Bearer {tokens.access_token}"
    }
    url = BASE_URL + endpoint

    try:
        if post_:
            response = post(url, headers=headers)
        elif put_:
            response = put(url, headers=headers)
        else:
            response = get(url, headers=headers)
    except Exception as e:
        return {'error': f'Network error while calling Spotify: {str(e)}'}

    # Spotify returns 204 (No Content) on some successful calls
    if response.status_code == 204:
        return {'success': True, 'status': 204}

    # Try parsing JSON response
    try:
        data = response.json()
    except Exception:
        return {
            'error': 'Failed to parse Spotify API response',
            'status': response.status_code,
            'raw': response.text
        }

    if response.status_code not in (200, 201):
        # Standardize error payload
        return {
            'error': data.get('error', {'message': 'Spotify API error'}),
            'status': response.status_code
        }

    return data


# ---- CONTROL HELPERS ----

def play_song(session_id):
    """Send a play command to Spotify for the user."""
    return execute_spotify_api_request(session_id, "player/play", put_=True)


def pause_song(session_id):
    """Send a pause command to Spotify for the user."""
    return execute_spotify_api_request(session_id, "player/pause", put_=True)


def skip_song(session_id):
    """Send a skip command to Spotify for the user."""
    return execute_spotify_api_request(session_id, "player/next", post_=True)
