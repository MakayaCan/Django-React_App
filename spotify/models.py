# spotify/models.py
from django.db import models
from django.utils import timezone

class SpotifyToken(models.Model):
    user = models.CharField(max_length=50, unique=True)  # Session key or user identifier
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255, null=True, blank=True)  # Allow null/blank
    token_type = models.CharField(max_length=50)
    expires_in = models.DateTimeField()

    def __str__(self):
        return f"{self.user} - {self.access_token}"

    @property
    def is_expired(self):
        """Check if the token is expired."""
        return self.expires_in <= timezone.now()
