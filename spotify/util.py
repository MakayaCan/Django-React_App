from .models import SpotifyToken
from django.utils import timezone
from datetime import timedelta
from .credentials import CLIENT_ID, CLIENT_SECRET
from requests import post, put, get

BASE_URL = "https://api.spotify.com/v1/me/"

def get_user_tokens(session_id):
    """Return the SpotifyToken object for the given user/session."""
    try:
        return SpotifyToken.objects.filter(user=session_id).first()
    except Exception:
        return None


def update_or_create_user_tokens(session_id, access_token, token_type, expires_in, refresh_token=None):
    """Update or create the Spotify token record for a user/session."""
    tokens = get_user_tokens(session_id)
    expires_at = timezone.now() + timedelta(seconds=expires_in)

    if tokens:
        tokens.access_token = access_token
        tokens.token_type = token_type
        tokens.expires_in = expires_at
        if refresh_token:  # Only update if Spotify sent a new one
            tokens.refresh_token = refresh_token
        tokens.save()
    else:
        SpotifyToken.objects.create(
            user=session_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            expires_in=expires_at
        )


def is_spotify_authenticated(session_id):
    """Check if the user is authenticated and refresh token if expired."""
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

    response = post('https://accounts.spotify.com/api/token', data={
        'grant_type': 'refresh_token',
        'refresh_token': tokens.refresh_token,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET
    })

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
    """Make an API request to Spotify on behalf of the user."""
    tokens = get_user_tokens(session_id)
    if not tokens:
        return {'error': 'No tokens found'}

    # Refresh if expired
    if tokens.expires_in <= timezone.now():
        if not refresh_spotify_token(session_id):
            return {'error': 'Failed to refresh token'}

        tokens = get_user_tokens(session_id)  # re-fetch after refresh

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
        return {'error': f'Network issue: {str(e)}'}

    if response.status_code == 204:
        return {'message': 'No content (nothing is playing)'}

    try:
        return response.json()
    except Exception:
        return {
            'error': 'Issue parsing Spotify API response',
            'status_code': response.status_code,
            'raw': response.text
        }
