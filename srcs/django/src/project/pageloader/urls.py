from .views import index
from django.urls import path
from .views import HomePageAPIView
from .views import CreateUserAPIView
from .views import LoginUserAPIView
from .views import DashboardAPIView
from .views import ProfileAPIView
from .views import SettingsAPIView
from .views import LogoutAPIView
from .views import MultiplayerAPIView
from .views import RemoteAPIView
from .views import JoinAPIView
from .views import CreateAPIView
from .views import TournamentsAPIView
from .views import LobbyAPIView
from .views import RefreshTokenAPIView
from .views import UserInfoAPIView
from django.conf import settings
from django.conf.urls.static import static
from django.urls import re_path
from .views import UserRequestAPIView
from .views import GameAPIView
from .views import UserResponseAPIView
from .views import GLTFserverAPIView

urlpatterns = [
    path('', index, name='index'),
    path('api/gltf/<str:filename>/', GLTFserverAPIView.as_view(), name='gltf'),
    path('api/home/', HomePageAPIView.as_view(), name='api_home'),
    path('api/signup/', CreateUserAPIView.as_view(), name='api_register'),
    path('api/login/', LoginUserAPIView.as_view(), name='api_login'),
    path('api/dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('api/dashboard_nav/', DashboardAPIView.as_view(), name='dashboard_nav'),
    path('api/multiplayer/', MultiplayerAPIView.as_view(), name='multiplayer'),
    path('api/profile/<int:pk>/', ProfileAPIView.as_view(), name='profile'),
    path('api/settings/', SettingsAPIView.as_view(), name='settings'),
    path('api/logout/', LogoutAPIView.as_view(), name='logout'),
    path('api/remote/', RemoteAPIView.as_view(), name='remote'),
    path('api/join_lobby/', JoinAPIView.as_view(), name='join_lobby'),
    path('api/join_tournament/', JoinAPIView.as_view(), name='join_tournament'),
    path('api/create/', CreateAPIView.as_view(), name='create'),
    path('api/lobby/<int:pk>/', LobbyAPIView.as_view(), name='lobby'),
    path('api/tournament_lobby/<int:pk>/', LobbyAPIView.as_view(), name='tournament_lobby'),
    path('api/tournaments/', TournamentsAPIView.as_view(), name='tournaments'),
    path('api/token/refresh/', RefreshTokenAPIView.as_view(), name='token_refresh'),
    path('api/request_user/<int:user_id>/', UserInfoAPIView.as_view(), name='request_user'),
    path('api/request/<str:request_type>/<int:id>/', UserRequestAPIView.as_view(), name='request_api'),
    path('api/response/<str:request_type>/', UserResponseAPIView.as_view(), name='response_api'),
    path('api/game/<int:pk>/', GameAPIView.as_view(), name='game_remote'),
    path('api/game/local/', GameAPIView.as_view(), name='game_local'),
    path('api/game/single/', GameAPIView.as_view(), name='game_single'), 
    re_path(r'^.*$', index, name='spa'),
    # Altre configurazioni URL...
]


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
