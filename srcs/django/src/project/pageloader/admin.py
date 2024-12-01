from django.contrib import admin

from .models import UserProfile, PendingRequest, Tournament, Game

admin.site.register(UserProfile)
admin.site.register(PendingRequest)
admin.site.register(Tournament)
admin.site.register(Game)

