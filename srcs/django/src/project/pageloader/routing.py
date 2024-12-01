from django.urls import re_path, path
from . import consumer

websocket_urlpatterns = [
    re_path(r'wss/socket-server/', consumer.ChatConsumer.as_asgi()),
    re_path(r'^wss/lobby/(?P<game_id>\d+)/$', consumer.LobbyConsumer.as_asgi()),
    re_path(r'^wss/game/(?P<game_id>\d+)/$', consumer.GameConsumer.as_asgi()),
    re_path(r'^wss/tournament/(?P<game_id>\d+)/$', consumer.TournamentConsumer.as_asgi()), 
]
