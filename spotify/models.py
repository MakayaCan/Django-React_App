# spotify/models.py
from django.db import models
from django.utils import timezone
from api.models import Room

class SpotifyToken(models.Model):
    user = models.CharField(max_length=50, unique=True)  # Session key or user identifier
    created_at = models.DateTimeField(auto_now_add=True)
    refresh_token = models.CharField(max_length=255, null=True, blank=True)  # Allow null/blank
    access_token = models.CharField(max_length=255)
    expires_in = models.DateTimeField()
    token_type = models.CharField(max_length=50)
    def __str__(self):
        return f"{self.user} - {self.access_token}"

    @property
    def is_expired(self):
        """Check if the token is expired."""
        return self.expires_in <= timezone.now()
    

    
    
class Vote(models.Model):
    user = models.CharField(max_length=50, unique=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    song_id = models.CharField(max_length=50)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)