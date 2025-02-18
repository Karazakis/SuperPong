from django.shortcuts import render
from django.http import JsonResponse
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.template.loader import render_to_string
from .models import UserProfile
from .models import Game
from .models import Tournament, Round
from .models import Round
from .models import PendingRequest
from .forms import SignUpForm
from urllib.parse import parse_qs
from django.shortcuts import get_object_or_404
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from django.middleware.csrf import get_token
from django.core.exceptions import ObjectDoesNotExist
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from django.db.models import Avg, Sum, Count
import re
import json
from django.core.serializers.json import DjangoJSONEncoder
from asgiref.sync import sync_to_async




import logging
import os

logger = logging.getLogger(__name__)

def index(request):
    return render(request, "index.html")

class GLTFserverAPIView(APIView):
    def get(self, request, filename):
        file_path = os.path.join(settings.MEDIA_ROOT, 'gltf_files', filename)
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                response = HttpResponse(f.read(), content_type='model/gltf+json')
                response['Content-Disposition'] = 'inline; filename=' + filename
                return response
        else:
            return HttpResponse(status=404)

class HomePageAPIView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, format=None):
        if request.user.is_authenticated:
            html = render_to_string('dashboard.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'dashboard/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'dashboard.js',
                'nav_stat': 'dashboard',
                }
        else:
            html = render_to_string('home.html')
            data = {
                'url': 'home/',
                'html': html,
                'scripts': 'home.js',
                'nav_stat': 'not_logged',
                }
        print(data)
        return Response(data)

class CreateUserAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            html = render_to_string('dashboard.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'dashboard/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'dashboard.js',
                'nav_stat': 'dashboard',
                }
        else:
            html = render_to_string('signup.html')
            data = {
                'url': 'signup/',
                'html': html,
                'scripts': 'signup.js',
                'nav_stat': 'not_logged',
            }
        return Response(data)
    
    def post(self, request):
        form = SignUpForm(request.data)
        if form.is_valid():
            try:
                user = User(
                    username=form.cleaned_data['username'],
                    email=form.cleaned_data['email'],
                )
                user.set_password(form.cleaned_data['password'])
                user.save()
                
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_200_OK)
        else:
            errors_with_field_type = {
                field: {
                    'messages': messages,
                    'type': form.fields[field].__class__.__name__
                } for field, messages in form.errors.items()
            }
            return Response({'errors': errors_with_field_type}, status=status.HTTP_200_OK)



class LoginUserAPIView(APIView):
    permission_classes = [AllowAny]
    
    @csrf_exempt
    def get(self, request):
        if request.user.is_authenticated:
            html = render_to_string('dashboard.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'dashboard/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'dashboard.js',
                'nav_stat': 'dashboard',
                }
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
        return Response(data)
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password are required'}, status=status.HTTP_200_OK)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'Username does not exist'}, status=status.HTTP_200_OK)

        if not user.check_password(password):
            return Response({'error': 'Incorrect password'}, status=status.HTTP_200_OK)

        refresh = RefreshToken.for_user(user)

        csrf_token = get_token(request)

        response = Response({
            'username': user.username,
            'userId': user.id,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
        response.set_cookie('csrftoken', csrf_token)
        return response


class RefreshTokenAPIView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        try:
            refresh = RefreshToken(request.data['refresh'])
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    def get(self, request):
        token = request.GET.get('token')
        if not token:
            return Response({'message': 'Token non fornito'}, status=status.HTTP_200_OK)

        try:
            access_token = AccessToken(token)
            access_token.verify()

            return Response({'message': 'Token valido'}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({'message': 'Token non valido', 'error': str(e)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_200_OK)


class DashboardAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            nav_stat = 'logged_nav'
            html = render_to_string('dashboard.html')
            logging.debug(f"Utente autenticato: {request.user.id}")
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'dashboard/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'dashboard.js',
                'nav_stat': nav_stat,
                }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

def normalize_statistics(individual_stats, global_stats):
    """
    Normalizes individual statistics compared to global statistics.
    If individual equals global, the result is 2.50.
    Scaled from 0 to 5 based on deviation from the global average.
    """
    normalized_stats = {}

    precision_time = individual_stats.get('precision_time', None)
    precision_score = individual_stats.get('precision_score', None)
    global_precision_time = global_stats.get('precision_time', 0)
    global_precision_score = global_stats.get('precision_score', 0)

    deviation_time = (
        (precision_time - global_precision_time) / global_precision_time * 2.50
        if precision_time is not None and global_precision_time > 0 else 0
    )
    deviation_score = (
        (precision_score - global_precision_score) / global_precision_score * 2.50
        if precision_score is not None and global_precision_score > 0 else 0
    )


    combined_deviation = (deviation_time + deviation_score) / 2

    normalized_precision = 2.50 + combined_deviation
    normalized_precision = clamp(normalized_precision, 0, 5)


    normalized_stats['precision'] = round(normalized_precision, 2)

    individual_wins = individual_stats.get('leadership_wins', 0)
    individual_matches = individual_stats.get('leadership_matches', 0)
    global_mean_leadership = 0.5

    if individual_matches > 0:
        individual_leadership_ratio = individual_wins / individual_matches
        deviation_leadership = individual_leadership_ratio - global_mean_leadership
        normalized_leadership = 2.50 + (deviation_leadership / global_mean_leadership) * 2.50
        normalized_leadership = clamp(normalized_leadership, 0, 5)
        normalized_stats['leadership'] = round(normalized_leadership, 2)
    else:
        normalized_stats['leadership'] = 2.50

    for key, individual_value in individual_stats.items():
        if key in ['precision_time', 'precision_score', 'leadership_wins', 'leadership_matches']:
            continue

        global_value = global_stats.get(key, 0)

        if global_value > 0:
            deviation = individual_value - global_value
            normalized_value = 2.50 + (deviation / global_value) * 2.50
            normalized_stats[key] = round(clamp(normalized_value, 0, 5), 2)
        else:
            normalized_stats[key] = 2.50 if individual_value == 0 else 5.0
    return normalized_stats






def clamp(value, min_value=0, max_value=5):
    """Clamps a value between min_value and max_value."""
    return max(min(value, max_value), min_value)


def calculate_global_game_statistics():
    total_games = Game.objects.count()

    if total_games == 0:
        return {
            'precision_time': 1,
            'precision_score': 1,
            'reactivity': 1,
            'madness': 1,
            'leadership': 1,
            'patience': 1,
            'intensity': 1,
        }

    time_games = Game.objects.filter(rules='time')
    score_games = Game.objects.filter(rules='score')

    time_games_count = time_games.count()
    score_games_count = score_games.count()

    if time_games_count > 0:
        precision_time = time_games.aggregate(
            avg_player1_score=Avg('player1_score'),
            avg_player2_score=Avg('player2_score')
        )
        precision_time_value = (
            (precision_time.get('avg_player1_score') or 0) +
            (precision_time.get('avg_player2_score') or 0)
        ) / 2
    else:
        precision_time_value = 0

    if score_games_count > 0:
        precision_score = score_games.aggregate(
            avg_player1_score=Avg('player1_score'),
            avg_player2_score=Avg('player2_score')
        )

        avg_goals_by_player1 = precision_score.get('avg_player2_score') or 0 
        avg_goals_by_player2 = precision_score.get('avg_player1_score') or 0 

        precision_player1 = 5 - avg_goals_by_player1
        precision_player2 = 5 - avg_goals_by_player2

        precision_score_value = (precision_player1 + precision_player2) / 2
    else:
        precision_score_value = 0

    reactivity_hits = Game.objects.aggregate(
        avg_player1_hit=Avg('player1_hit'),
        avg_player2_hit=Avg('player2_hit')
    )

    reactivity = (
        (reactivity_hits.get('avg_player1_hit') or 0) +
        (reactivity_hits.get('avg_player2_hit') or 0)
    ) / 2 if total_games > 0 else None

    madness_data = Game.objects.aggregate(
        avg_balls=Avg('balls')
    )
    madness = madness_data.get('avg_balls') or None

    leadership = total_games if total_games > 0 else None

    patience = (time_games_count / total_games) * 5 if total_games > 0 else None

    intensity_keys = Game.objects.aggregate(
        total_player1_keys=Sum('player1_keyPressCount'),
        total_player2_keys=Sum('player2_keyPressCount')
    )
    total_key_presses = (
        (intensity_keys.get('total_player1_keys') or 0) +
        (intensity_keys.get('total_player2_keys') or 0)
    )
    total_players = 2 * total_games  

    intensity = (total_key_presses / total_players) if total_games > 0 else None

    global_stats = {
        'precision_time': round(precision_time_value, 2) if precision_time_value is not None else None,
        'precision_score': round(precision_score_value, 2) if precision_score_value is not None else None,
        'reactivity': round(reactivity, 2) if reactivity is not None else None,
        'madness': round(madness, 2) if madness is not None else None,
        'leadership': round(leadership, 2) if leadership is not None else None,
        'patience': round(patience, 2) if patience is not None else None,
        'intensity': round(intensity, 2) if intensity is not None else None,
    }

    return global_stats




def calculate_individual_game_statistics(user_profile):
    
    match_history = user_profile.game_played.all()
    total_games = match_history.count()

    if total_games == 0:
        return {
            'precision_time': 1,
            'precision_score': 1,
            'reactivity': 1,
            'madness': 1,
            'leadership': 1,
            'intensity': 1,
        }

    total_time_scores = 0
    total_time_games = 0
    total_score_precision = 0
    total_score_games = 0
    total_hits = 0
    total_balls = 0
    total_key_presses = 0
    total_wins = 0

    for match in match_history:
        if match.rules == 'time':
            if match.player1 == user_profile.user:
                total_time_scores += match.player1_score or 0
            elif match.player2 == user_profile.user:
                total_time_scores += match.player2_score or 0
            total_time_games += 1
        elif match.rules == 'score':
            if match.player1 == user_profile.user:
                opponent_score = match.player2_score or 0
            elif match.player2 == user_profile.user:
                opponent_score = match.player1_score or 0
            else:
                opponent_score = 0
            total_score_precision += max(0, 5 - opponent_score)
            total_score_games += 1

        if match.player1 == user_profile.user:
            total_hits += match.player1_hit or 0
            total_balls += match.balls or 0
            total_key_presses += match.player1_keyPressCount or 0
        elif match.player2 == user_profile.user:
            total_hits += match.player2_hit or 0
            total_balls += match.balls or 0
            total_key_presses += match.player2_keyPressCount or 0

        if match.winner == user_profile.user:
            total_wins += 1

    precision_time_value = total_time_scores / total_time_games if total_time_games > 0 else None
    precision_score_value = total_score_precision / total_score_games if total_score_games > 0 else None
    reactivity_value = total_hits / total_games if total_games > 0 else None
    madness_value = total_balls / total_games if total_games > 0 else None
    intensity_value = total_key_presses / total_games if total_games > 0 else None
    patience_value = (total_time_games / total_games) * 5 if total_games > 0 else None

    individual_stats = {
        'precision_time': round(precision_time_value, 2) if precision_time_value is not None else None,
        'precision_score': round(precision_score_value, 2) if precision_score_value is not None else None,
        'reactivity': round(reactivity_value, 2) if reactivity_value is not None else None,
        'madness': round(madness_value, 2) if madness_value is not None else None,
        'leadership_wins': total_wins,
        'leadership_matches': total_games,
        'intensity': round(intensity_value, 2) if intensity_value is not None else None,
        'patience': round(patience_value, 2) if patience_value is not None else None,
    }

    return individual_stats



class ProfileAPIView(APIView):

    def get(self, request, pk):
        try:
            logger.debug(f"+++++profile pk {pk}")
            user = User.objects.get(pk=pk)
            user_profile = UserProfile.objects.get(user=user)
            friends = user_profile.user_friend_list.all()
            logger.debug(f"friends {friends}")
            match_history = [
                {
                    'created': game.created,
                    'id': game.id,
                    'name': game.name,
                    'mode': game.mode,
                    'rules': game.rules,
                    'limit': game.limit,
                    'balls': game.balls,
                    'boost': game.boost,
                    'status': game.status,
                    'winner': UserProfile.objects.get(user=game.winner).nickname if game.winner else None,
                    'player1': UserProfile.objects.filter(user=game.player1).first().nickname if UserProfile.objects.filter(user=game.player1).exists() else None,
                    'player2': UserProfile.objects.filter(user=game.player2).first().nickname if UserProfile.objects.filter(user=game.player2).exists() else None,
                    'tournament': game.tournament,
                    'player1_score': game.player1_score,
                    'player2_score': game.player2_score,
                }
                for game in user_profile.game_played.all()
            ]
            logger.debug(f"match_history {match_history}")
            tournamnt_history = [
                {
                    'id': tournament.id,
                    'name': tournament.name,
                    'mode': tournament.mode,
                    'rules': tournament.rules,
                    'limit': tournament.limit,
                    'balls': tournament.balls,
                    'boost': tournament.boost,
                    'status': tournament.status,
                    'winner': UserProfile.objects.get(user=tournament.winner).nickname if tournament.winner else None,
                }
                for tournament in user_profile.tournament_played.all()
            ]
            logger.debug(f"tournamnt_history {tournamnt_history}")
            game_wins = user_profile.game_win
            game_losses = user_profile.game_lose
            game_draws = user_profile.game_draw
            game_abandons = user_profile.game_abandon
            tournament_wins = user_profile.tournament_win
            tournament_losses = user_profile.tournament_lose
            tournament_draws = user_profile.tournament_draw
            tournament_abandons = user_profile.tournament_abandon
            
            global_game_statistics = calculate_global_game_statistics()
            individual_game_statistics = calculate_individual_game_statistics(user_profile)
            normalized_game_statistics = normalize_statistics(
                individual_game_statistics, global_game_statistics
            )
            context = {
                'user': user,
                'userprofile': user_profile,
                'friends': friends,
                'match_history': match_history,
                'tournamnt_history': tournamnt_history,
                'game_wins': game_wins,
                'game_losses': game_losses,
                'game_draws': game_draws,
                'game_abandons': game_abandons,
                'tournament_wins': tournament_wins,
                'tournament_losses': tournament_losses,
                'tournament_draws': tournament_draws,
                'tournament_abandons': tournament_abandons,
                'relative_game_statistics': normalized_game_statistics,
            }
            
            html = render_to_string('profile.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': f'profile/{pk}',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'profile.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)
        except User.DoesNotExist:
            return Response({"error": "Utente non trovato."}, status=404)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profilo utente non trovato."}, status=404)


class SettingsAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
                'MEDIA_URL': settings.MEDIA_URL,
            }
            html = render_to_string('settings.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'settings/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'settings.js',
                'nav_stat': 'logged_nav',
                }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)
    
    def post(self, request):
        try:
            user = User.objects.get(pk=request.POST.get('id'))
            user_profile = UserProfile.objects.get(user=user)
            img_profile = request.FILES.get('img_profile')
            if img_profile:                    
                user_folder = os.path.join(settings.MEDIA_ROOT, f'profiles/{user.id}/')
                if not os.path.exists(user_folder):
                    os.makedirs(user_folder)
                fs = FileSystemStorage(location=user_folder)
                filename = fs.save(img_profile.name, img_profile)
                user_profile.img_profile = f'profiles/{user.id}/{filename}'
            else:
                if not user_profile.img_profile:
                    user_profile.img_profile = 'profiles/default.png'
            
            
            errors = {}
            username = request.POST.get('username')
            email = request.POST.get('email')
            password = request.POST.get('password')
            nickname = request.POST.get('nickname')

            if username:
                username = re.sub(r'[<>]', '', username)
                if len(username) < 3:
                    errors['username'] = "Il nome utente deve essere lungo almeno 3 caratteri."
                elif User.objects.filter(username=username).exclude(pk=user.pk).exists():
                    errors['username'] = "Il nome utente è già in uso."

            if email:
                email = re.sub(r'[<>]', '', email)
                email_pattern = r'^[a-zA-Z0-9._%+]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, email):
                    errors['email'] = "Inserisci un indirizzo email valido."
                elif User.objects.filter(email=email).exclude(pk=user.pk).exists():
                    errors['email'] = "L'email è già in uso."

            if password:
                password_pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$'
                if not re.match(password_pattern, password):
                    errors['password'] = "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un carattere speciale."

            if errors:
                return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

            if password:
                user.set_password(password)
            if username:
                user.username = username
            if email:
                user.email = email
            if nickname:
                user_profile.nickname = nickname
            user.save()
            
            p1Right = request.POST.get('right1')
            p1Left = request.POST.get('left1')
            p1Shoot = request.POST.get('shoot1')
            p1Boost = request.POST.get('boost1')
            p2Right = request.POST.get('right2')
            p2Left = request.POST.get('left2')
            p2Shoot = request.POST.get('shoot2')
            p2Boost = request.POST.get('boost2')

            if p1Right:
                user_profile.p1Right = p1Right
            if p1Left:
                user_profile.p1Left = p1Left
            if p1Shoot:
                user_profile.p1Shoot = p1Shoot
            if p1Boost:
                user_profile.p1Boost = p1Boost
            if p2Right:
                user_profile.p2Right = p2Right
            if p2Left:
                user_profile.p2Left = p2Left
            if p2Shoot:
                user_profile.p2Shoot = p2Shoot
            if p2Boost:
                user_profile.p2Boost = p2Boost

            user_profile.save()
            return Response({'success': 'Profilo aggiornato con successo.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LogoutAPIView(APIView):
    def get(self, request):
        try:
            refresh = request.COOKIES.get('refresh')
            token = RefreshToken(refresh)
            token.blacklist()
            response = Response({'success': 'Logout effettuato con successo.'}, status=status.HTTP_200_OK)
            response.delete_cookie('refresh')
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MultiplayerAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            html = render_to_string('multiplayer.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'multiplayer/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'multiplayer.js',
                'nav_stat': 'logged_nav',
                }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

class RemoteAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            html = render_to_string('remote.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'remote/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'remote.js',
                'nav_stat': 'logged_nav',
                }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

class JoinAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            user_profile = get_object_or_404(UserProfile, user=user)

            current_url = request.path

            games = None
            tournaments = None
            active_tournaments = None

            if 'join_lobby' in current_url:
                games = Game.objects.filter(status='not_started', tournament__isnull=True)
            elif 'join_tournament' in current_url:
                tournaments = Tournament.objects.filter(status='not_started')
                active_tournaments = Tournament.objects.filter(status__in=['waiting_for_matches', 'preparing_next_round', 'waiting_for_round','countdown_started','notifying_players'], players__in=[user])

            context = {
                'user': user,
                'userprofile': user_profile,
                'games': games,
                'tournaments': tournaments,
                'active_tournaments': active_tournaments,
            }

            html = render_to_string('join.html', context, request=request)
            dash_base = render_to_string('dashboard-base.html', context, request=request)
            data = {
                'url': current_url.replace('/api', ''),
                'html': html,
                'dash_base': dash_base,
                'scripts': 'join.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

    def post(self, request):
        """
        Aggiunge il giocatore a un gioco o torneo.
        """
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            user_profile = get_object_or_404(UserProfile, user=user)
            data = request.data
            current_url = request.path

            if 'join_lobby' in current_url:
                game_id = data.get('game_id')
                if game_id:
                    game = get_object_or_404(Game, pk=game_id, status='not_started', tournament__isnull=True)
                    if game.player_inlobby < game.player_limit:
                        game.players.add(user)  
                        game.player_inlobby += 1  
                        game.save()

                        user_profile.in_game_lobby = game
                        user_profile.save()

                        return Response({'success': True}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Game is full'}, status=status.HTTP_400_BAD_REQUEST)

            elif 'join_tournament' in current_url:
                tournament_id = data.get('tournament_id')
                if tournament_id:
                    tournament = get_object_or_404(Tournament, pk=tournament_id)

                    if tournament.status == 'not_started':
                        if tournament.players_in_lobby >= tournament.nb_players:
                            return Response({'success': False, 'message': 'Tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
                        if user not in tournament.players.all():
                            tournament.players.add(user)
                            tournament.players_in_lobby += 1  
                            tournament.save()

                            user_profile.in_tournament_lobby = tournament
                            user_profile.tournament_played.add(tournament)
                            user_profile.save()

                        return Response({'success': True}, status=status.HTTP_200_OK)

                    elif tournament.status in ['waiting_for_matches', 'preparing_next_round', 'waiting_for_round','finished','countdown_started','notifying_players']:
                        if user in tournament.players.all():
                            return Response({'success': True, 'message': 'Rejoined the tournament'}, status=status.HTTP_200_OK)
                        else:
                            return Response({'success': False, 'message': 'Cannot join, tournament already started'}, status=status.HTTP_400_BAD_REQUEST)

            return Response({'success': False, 'message': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def delete(self, request, tournament_id=None):
        if request.user.is_authenticated:
            if tournament_id is not None:
                try:
                    tournament = Tournament.objects.get(id=tournament_id)
                    if tournament.owner == request.user:
                        tournament.delete()
                    return Response({'success': True})
                except Tournament.DoesNotExist:
                    return Response({'success': False, 'error': 'Tournament not found'}, status=404)
            return Response({'success': False, 'error': 'Tournament ID not provided'}, status=400)
        else:
            return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        
    def leave(self, request, tournament_id=None):
        if request.user.is_authenticated:
            if tournament_id is not None:
                try:
                    tournament = Tournament.objects.get(id=tournament_id)
                    user = get_object_or_404(User, pk=request.user.id)
                    user_profile = get_object_or_404(UserProfile, user=user)
                    if tournament.players.filter(id=user.id).exists():
                        tournament.players.remove(user)
                        tournament.save()
                    if tournament.status == 'not_started':
                        user_profile.tournament_played.remove(tournament)
                        user_profile.save()
                    return Response({'success': True})
                except Tournament.DoesNotExist:
                    user = get_object_or_404(User, pk=request.user.id)
                    user_profile = get_object_or_404(UserProfile, user=user)

                    user_profile.tournament_played.filter(id=tournament_id).delete()
                    user_profile.save()

                    return Response({'success': True, 'message': 'Tournament not found, but user was removed from lobby.'})
            return Response({'success': False, 'error': 'Tournament ID not provided'}, status=400)
        else:
            return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)
        

        
class CreateAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            source = request.query_params.get('source', 'default')
            user = request.user 
            user_profile = UserProfile.objects.get(user=user)

            if source == 'remote':
                url = 'create_remote/'
                title = 'Create Game'
            elif source == 'local':
                url = 'create_local/'
                title = 'Create Game'
            elif source == 'single':
                url = 'create_single/'
                title = 'Create Game'
            elif source == 'tournament':
                url = 'create_tournament/'
                title = 'Create Tournament'
            else:
                url = 'create_single/' 
                title = 'Create Game'

            context = {
                'user': user,
                'userprofile': user_profile,
                'title': title,
            }
            html = render_to_string('create.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': url,
                'html': html,
                'dash_base': dash_base,
                'scripts': 'create.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

    def post(self, request):

        try:
            source = request.query_params.get('source', 'default')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)

            if source == 'tournament':
                tournament = Tournament.objects.create(
                    name=request.data.get('name', ''),
                    mode=request.data.get('mode', ''),
                    limit=int(request.data.get('limit', 0)),
                    balls=int(request.data.get('balls', 1)),
                    boost=request.data.get('boost', False),
                    nb_players=int(request.data.get('nb_players', 0)),
                    status='not_started',
                    rules=request.data.get('rules', ''), 
                    owner=user
                )
                tournament.players.add(user)
                tournament.players_in_lobby += 1
                tournament.save()

                user_profile.in_tournament_lobby = tournament
                user_profile.tournament_played.add(tournament) 
                user_profile.save()
                logging.debug(f'Torneo creato: {tournament.id}')
                tournament.generate_initial_rounds()
                return Response({'success': tournament.id}, status=status.HTTP_201_CREATED)
            else:
                if request.data.get('rules', '') == 'time':
                    timelimit = int(request.data.get('limit', 0)) * 60
                    player1_score = 0
                    player2_score = 0
                else:
                    timelimit = 0
                    player1_score = request.data.get('limit', 0)
                    player2_score = request.data.get('limit', 0)
                
                game = Game.objects.create(
                    name=request.data.get('name', ''),
                    mode=request.data.get('mode', ''),
                    rules=request.data.get('rules', ''),
                    limit=int(request.data.get('limit', 0)),
                    balls=int(request.data.get('balls', 1)),
                    boost=request.data.get('boost', False),
                    time_left=timelimit,
                    player1_score=player1_score,
                    player2_score=player2_score,
                )
                if request.data.get('mode', '') == '1v1':
                    game.player_limit = 2
                else:
                    game.player_limit = 4
                game.players.add(user)
                game.player1 = user
                game.player_inlobby += 1
                game.save()
                user_profile.in_game_lobby = game
                user_profile.save()
                logging.debug(f'Gioco creato: {game.id}')
                return Response({'success': game.id}, status=status.HTTP_201_CREATED)
        except Exception as e:
            logging.error(f'Errore durante la creazione: {e}')
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)




class TournamentsAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            html = render_to_string('tournaments.html')
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': 'tournaments/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'tournaments.js',
                'nav_stat': 'logged_nav',
                }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

class LobbyAPIView(APIView):
    def get(self, request, pk):
        if request.user.is_authenticated:
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            current_url = request.path
            
            if 'tournament_lobby' in current_url:
                tournament = Tournament.objects.get(pk=pk)

                user_nicknames = [
                    {'userId': player.id, 'username': player.username, 'nickname': player.userprofile.nickname}
                    for player in User.objects.all()
                ]
                user_nicknames_json = json.dumps(user_nicknames)

                rounds = Round.objects.filter(tournament=tournament)
                rounds_list = list(rounds.values()) 
                context = {
                    'user': user,
                    'userprofile': user_profile,
                    'tournament': tournament,
                    'rounds': json.dumps(rounds_list, cls=DjangoJSONEncoder),
                    'user_nicknames': user_nicknames_json,
                }
                html = render_to_string('tournament-lobby.html', context)
                url = f'tournament_lobby/{pk}'
                scripts = 'tournament-lobby.js'
            else:
                game = Game.objects.get(pk=pk)
                context = {
                    'user': user,
                    'userprofile': user_profile,
                    'game': game,
                }
                html = render_to_string('lobby.html', context)
                url = f'lobby/{pk}'
                scripts = 'lobby.js'

            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': url,
                'html': html,
                'dash_base': dash_base,
                'scripts': scripts,
                'nav_stat': 'logged_nav',
            }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)



    def delete(self, request, pk):
        if request.user.is_authenticated:
            current_url = request.path
            try:
                if 'tournament_lobby' in current_url:
                    tournament = Tournament.objects.get(pk=pk)
                    if tournament.owner == request.user:
                        tournament.delete()
                        return Response({'success': True}, status=status.HTTP_200_OK)
                    else:
                        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
                else:
                    game = Game.objects.get(pk=pk)
                    if game.player1 == request.user:
                        game.delete()
                        return Response({'success': True}, status=status.HTTP_200_OK)
                    else:
                        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            except (Game.DoesNotExist, Tournament.DoesNotExist) as e:
                return Response({'error': 'Game or Tournament not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, pk):
        if request.user.is_authenticated:
            current_url = request.path
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            try:
                if 'tournament_lobby' in current_url:
                    return Response({'success': True}, status=status.HTTP_200_OK)
                else:
                    game = Game.objects.get(pk=pk)
                    game.players.remove(request.user)
                    game.player_inlobby -= 1
                    game.save()
                    user_profile.in_game_lobby = None
                    user_profile.save()
                    return Response({'success': True}, status=status.HTTP_200_OK)
            except (Game.DoesNotExist, Tournament.DoesNotExist):
                return Response({'error': 'Game or Tournament not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)




class UserStatusAPIView(APIView):
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user_profile = UserProfile.objects.get(user=user)
            if(user_profile.in_game_lobby):
                game = {
                    'game': user_profile.in_game_lobby.id,
                }
            else:
                game = None

            if(user_profile.in_tournament_lobby):
                tournament = {
                    'tournament': user_profile.in_tournament_lobby.id,
                }
            else:
                tournament = None

            data = {
                'game': game,
                'tournament': tournament,
            }
            return Response(data)
        except User.DoesNotExist:
            return Response({"error": "Utente non trovato."}, status=404)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profilo utente non trovato."}, status=404)


logger = logging.getLogger(__name__)
class UserInfoAPIView(APIView):
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user_profile = UserProfile.objects.get(user=user)
            game_played = user_profile.game_played.all()

            game_history = [
                {
                    'id': game.id,
                    'name': game.name,
                    'mode': game.mode,
                    'rules': game.rules,
                    'limit': game.limit,
                    'balls': game.balls,
                    'boost': game.boost,
                    'status': game.status,
                }
                for game in user_profile.game_played.all()
            ]
            tournament_history = [
                {
                    'id': tournament.id,
                    'name': tournament.name,
                    'mode': tournament.mode,
                    'rules': tournament.rules,
                    'limit': tournament.limit,
                    'balls': tournament.balls,
                    'boost': tournament.boost,
                    'status': tournament.status,
                }
                for tournament in user_profile.tournament_played.all()
            ]

            pending_requests = [
                {
                    'id': req.id,
                    'request_type': req.request_type,
                    'target_user': req.target_user.username,
                    'target_user_id': req.target_user.id,
                    'requesting_user': req.requesting_user.username,
                    'requesting_user_id': req.requesting_user.id,
                    'status': req.status,
                    'creation_date': req.creation_date.isoformat()
                }
                for req in user_profile.pending_requests.all()
            ]

            user_friend_list = [
                {
                    'id': friend.user.id,
                    'username': friend.user.username,
                    'nickname': friend.nickname
                }
                for friend in user_profile.user_friend_list.all()
            ]

            blocked_userslist = [
                {
                    'id': blocked_user.id,
                    'username': blocked_user.user.username,
                    'nickname': blocked_user.nickname
                }
                for blocked_user in user_profile.blocked_users.all()
            ]
            data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'nickname': user_profile.nickname,
                'img_profile': user_profile.img_profile.url if user_profile.img_profile else None,
                'p1Right': user_profile.p1Right,
                'p1Left': user_profile.p1Left,
                'p1Shoot': user_profile.p1Shoot,
                'p1Boost': user_profile.p1Boost,
                'p2Right': user_profile.p2Right,
                'p2Left': user_profile.p2Left,
                'p2Shoot': user_profile.p2Shoot,
                'p2Boost': user_profile.p2Boost,
                'p3Right': user_profile.p3Right,
                'p3Left': user_profile.p3Left,
                'p3Shoot': user_profile.p3Shoot,
                'p3Boost': user_profile.p3Boost,
                'p4Right': user_profile.p4Right,
                'p4Left': user_profile.p4Left,
                'p4Shoot': user_profile.p4Shoot,
                'p4Boost': user_profile.p4Boost,
                'pending_requests': pending_requests,
                'user_friend_list': user_friend_list,
                'blocked_userslist': blocked_userslist,
                'in_game_lobby': user_profile.in_game_lobby.id if user_profile.in_game_lobby else None,
                'game_history': game_history,
                'tournament_history': tournament_history,
            }
            return Response(data)
        
        except User.DoesNotExist:
            return Response({"error": "Utente non trovato."}, status=status.HTTP_404_NOT_FOUND)
        
        except UserProfile.DoesNotExist:
            return Response({"error": "Profilo utente non trovato."}, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        
logger = logging.getLogger(__name__)

class UserRequestAPIView(APIView):
    def post(self, request, request_type, id):
        try:
            request_data = request.data
            user = request.user

            if request_type not in ['friend', 'game', 'tournament']:
                return Response({'error': 'Tipo di richiesta non valido.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(pk=id)
            except User.DoesNotExist:
                logger.error(f"L'utente con ID {id} non esiste.")
                return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)

            if request_data.get('request') == "remove":
                username = User.objects.get(username=request_data.get('target_user'))
            elif request_data.get('request') in ["accept", "decline"]:
                if request_data.get('request') == "accept":
                    requesting_user = User.objects.get(pk=request_data.get('requesting_user'))
                    target_user = User.objects.get(pk=request_data.get('target_user'))
                elif request_data.get('request') == "decline":
                    requesting_user = User.objects.get(pk=request_data.get('requesting_user'))
            else:
                requesting_user = User.objects.get(username=request_data.get('requesting_user'))

            if request_type == 'friend':
                user_profile = UserProfile.objects.get(user=user)

                if request_data.get('request') == 'accept':
                    return self.accept_request(request, target_user, requesting_user)
                elif request_data.get('request') == 'decline':
                    return self.decline_request(request, id, requesting_user)
                elif request_data.get('request') == 'remove':
                    return self.remove_friend(id, username)


                if PendingRequest.objects.filter(
                    target_user=user,
                    requesting_user=requesting_user,
                    request_type=request_type,
                ).exists():
                    return Response({'message': 'La richiesta è già presente.', 'already_exists': True}, status=status.HTTP_200_OK)

                usertocheck = UserProfile.objects.get(user=user)
                user_profile_check = UserProfile.objects.get(user=requesting_user)
                if usertocheck in user_profile_check.user_friend_list.all():
                    return Response({'message': 'Utente già amico', 'already_friend': True}, status=status.HTTP_200_OK)
                
                new_request = PendingRequest.objects.create(
                    request_type=request_type,
                    target_user=user,
                    requesting_user=requesting_user,
                    request=request_data.get('request'),
                )
                target_user_profile = UserProfile.objects.get(user=user)
                target_user_profile.pending_requests.add(new_request)
                return Response({'success': 'Richiesta inviata con successo.'}, status=status.HTTP_200_OK)

            elif request_type == 'game':
                user_profile = UserProfile.objects.get(user=user)

                if request_data.get('request') == 'accept':
                    return self.accept_game_request(request, id, requesting_user)
                elif request_data.get('request') == 'decline':
                    return self.decline_game_request(request, id, requesting_user)

                if PendingRequest.objects.filter(
                    target_user=user,
                    requesting_user=requesting_user,
                    request_type=request_type,
                ).exists():
                    return Response({'error': 'La richiesta è già presente.'}, status=status.HTTP_400_BAD_REQUEST)

                new_request = PendingRequest.objects.create(
                    request_type=request_type,
                    target_user=user,
                    requesting_user=requesting_user,
                    request=request_data.get('request'),
                )
                target_user_profile = UserProfile.objects.get(user=user)
                target_user_profile.pending_requests.add(new_request)

                return Response({'success': 'Invito a giocare inviato con successo.'}, status=status.HTTP_200_OK)

            elif request_type == 'tournament':
                user_profile = UserProfile.objects.get(user=user)

                if request_data.get('request') == 'accept':
                    return self.accept_torunement_request(request, id, requesting_user)
                elif request_data.get('request') == 'decline':
                    return self.decline_tournement_request(request, id, requesting_user)

                if PendingRequest.objects.filter(
                    target_user=user,
                    requesting_user=requesting_user,
                    request_type=request_type,
                ).exists():
                    return Response({'error': 'La richiesta è già presente.'}, status=status.HTTP_400_BAD_REQUEST)

                new_request = PendingRequest.objects.create(
                    request_type=request_type,
                    target_user=user,
                    requesting_user=requesting_user,
                    request=request_data.get('request'),
                )
                target_user_profile = UserProfile.objects.get(user=user)
                target_user_profile.pending_requests.add(new_request)

                return Response({'success': 'Invito a torneo inviato con successo.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            logger.error(f"L'utente con username {request_data.get('requesting_user')} non esiste.")
            return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile per l'utente con ID {user.id} non esiste.")
            return Response({"error": "Profilo utente non trovato."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Errore durante la creazione della richiesta pendente: {e}", exc_info=True)
            return Response({'error': 'Errore durante la creazione della richiesta.'}, status=status.HTTP_400_BAD_REQUEST)

    def accept_request(self, request, target_user, requesting_user):
        try:
            if not request.user.is_authenticated:
                return Response({'error': 'Utente non autenticato.'}, status=status.HTTP_401_UNAUTHORIZED)

            pending_requests = PendingRequest.objects.filter(
                target_user=target_user,
                requesting_user=requesting_user,
                request_type='friend'
            )

            if not pending_requests.exists():
                return Response({'error': 'Richiesta non trovata.'}, status=status.HTTP_404_NOT_FOUND)

            pending_requests.delete()
            requesting_user_profile = UserProfile.objects.get(user=requesting_user)

            target_user_profile = UserProfile.objects.get(user=target_user)
            requesting_user_profile.user_friend_list.add(target_user_profile)

            return Response({'success': 'Richiesta accettata con successo.'}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            logger.error(f"L'utente con ID {target_user.id} non esiste.")
            return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile per l'utente con ID {target_user.id} non esiste.")
            return Response({'error': 'Profilo utente non trovato.'}, status=status.HTTP_404_NOT_FOUND)
        except AttributeError as e:
            logger.error(f"Errore durante la gestione dell'amicizia: {e}", exc_info=True)
            return Response({'error': 'Errore durante la gestione dell\'amicizia.'}, status=status.HTTP_400_BAD_REQUEST)

    def remove_friend(self, id, username):
        try:
            user = User.objects.get(pk=id)
            user_profile = UserProfile.objects.get(user=user)
            friend = User.objects.get(username=username)
            friend_profile = UserProfile.objects.get(user=friend)

            user_profile.user_friend_list.remove(friend_profile)
            friend_profile.user_friend_list.remove(user_profile)

            return Response({'success': 'Amico rimosso con successo.'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)
        except UserProfile.DoesNotExist:
            return Response({'error': 'Profilo utente non trovato.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Errore durante la rimozione dell'amicizia: {e}")
            return Response({'error': 'Errore durante la rimozione dell\'amico.'}, status=status.HTTP_400_BAD_REQUEST)
        
    def decline_request(self, request, id, requesting_user):
        try:
            if not request.user.is_authenticated:
                return Response({'error': 'Utente non autenticato.'}, status=status.HTTP_401_UNAUTHORIZED)

            target_user_base = User.objects.get(pk=id)
            target_user = UserProfile.objects.get(user=target_user_base)

            pending_requests = PendingRequest.objects.filter(
                target_user=target_user.user,
                requesting_user=requesting_user,
                request_type='friend'
            )

            if pending_requests.exists():
                pending_requests.delete()
            requesting_user_profile = UserProfile.objects.get(user=requesting_user)

            return Response({'success': 'Richiesta rifiutata con successo.'}, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            logger.error(f"L'utente con ID {id} non esiste.")
            return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)

        except UserProfile.DoesNotExist:
            logger.error(f"UserProfile per l'utente con ID {id} non esiste.")
            return Response({'error': 'Profilo utente non trovato.'}, status=status.HTTP_404_NOT_FOUND)

        except AttributeError as e:
            logger.error(f"Errore durante la gestione dell'amicizia: {e}", exc_info=True)
            return Response({'error': 'Errore durante la gestione dell\'amicizia.'}, status=status.HTTP_400_BAD_REQUEST)



class UserResponseAPIView(APIView):
    def post(self, request, response_type):
        if response_type in ['request_status']:   
            try:
                response_data = request.data
                user = User.objects.get(pk=response_data['id'])
                user_profile = UserProfile.objects.get(user=user)
                requests = user_profile.requests
                for i, request_data in enumerate(requests):
                    if request_data['request_type'] == response_type:
                        requests[i]['status'] = response_data['status']
                        user_profile.requests = requests
                        user_profile.save()
                        return Response({'success': 'Richiesta risposta con successo.'}, status=status.HTTP_200_OK)
                return Response({'error': 'Richiesta non trovata.'}, status=status.HTTP_404_NOT_FOUND)
            except User.DoesNotExist:
                return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)
        if response_type in ['friend_request', 'tournament_request']:
            pass
            

class BlockUserAPIView(APIView):
    def post(self, request, user_id):
        user_to_block = get_object_or_404(User, id=user_id)
        user_profile_to_block = get_object_or_404(UserProfile, user=user_to_block)
        user_profile = get_object_or_404(UserProfile, user=request.user)
        
        if user_profile.blocked_users.filter(id=user_id).exists():
            user_profile.unblock_user(user_profile_to_block)
        else:
            user_profile.block_user(user_profile_to_block)
            
        blocked_users = user_profile.blocked_users.all()
        blocked_usernames = [user_profile_to_block.user.username for user in blocked_users]

        return Response({'detail': f"User {user_to_block.username} has been blocked."}, status=status.HTTP_200_OK)


class InviteGameAPIView(APIView):
    def post(self, request, pk):
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            user_profile = get_object_or_404(UserProfile, user=user)
            game = get_object_or_404(Game, pk=pk)
            data = request.data
            if game.player_inlobby < game.player_limit:
                game.player_inlobby += 1
                game.players.add(user)
                game.save()
                user_profile.in_game_lobby = game
                user_profile.save()
                return Response({'success': True}, status=status.HTTP_200_OK)
            else:
                return Response({'success': False, 'message': 'Game is full'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)


class InviteTournamentAPIView(APIView):
    def post(self, request, pk):
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            user_profile = get_object_or_404(UserProfile, user=user)
            tournament = get_object_or_404(Tournament, pk=pk)
            tournament.players_in_lobby += 1
            tournament.save()
            user_profile.in_tournament_lobby = tournament
            user_profile.save()
            return Response({'success': True}, status=status.HTTP_200_OK)
        else:
            return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)



class GameAPIView(APIView):
    def get(self, request, pk=None):
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            user_profile = get_object_or_404(UserProfile, user=user)
            
            current_url = request.path
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            if 'single' in current_url or 'local' in current_url:
                game_info = request.GET.dict()
                game_info['time'] = int(game_info['limit'])
                if 'single' in current_url:
                    if '1v1' in  game_info['mode']:
                        players = [
                            {
                                'name': user_profile.nickname, 
                                'score': 0, 
                                'img_profile': user_profile.img_profile,
                                'controls': {
                                    'right': user_profile.p1Right,
                                    'left': user_profile.p1Left,
                                    'shoot': user_profile.p1Shoot,
                                    'boost': user_profile.p1Boost,
                                }
                            },
                            {'name': 'Bot 1', 'score': 0, 'img_profile': 'media/profiles/bot.png'},
                        ]
                    else:
                        players = [
                            {
                                'name': user_profile.nickname, 
                                'score': 0, 
                                'img_profile': user_profile.img_profile,
                                'controls': {
                                    'right': user_profile.p1Right,
                                    'left': user_profile.p1Left,
                                    'shoot': user_profile.p1Shoot,
                                    'boost': user_profile.p1Boost,
                                }
                            },
                            {'name': 'Bot 1', 'score': 0, 'img_profile': 'media/profiles/bot.png'},
                            {'name': 'Bot 2', 'score': 0, 'img_profile': 'media/profiles/bot.png'},
                            {'name': 'Bot 3', 'score': 0, 'img_profile': 'media/profiles/bot.png'},
                        ]
                elif 'local' in current_url:
                    players = [
                        {
                            'name': user_profile.nickname, 
                            'score': 0, 
                            'img_profile': user_profile.img_profile,
                            'controls': {
                                'right': user_profile.p1Right,
                                'left': user_profile.p1Left,
                                'shoot': user_profile.p1Shoot,
                                'boost': user_profile.p1Boost,
                            }
                        },
                        {
                            'name': 'Player 2', 
                            'score': 0, 
                            'img_profile': 'media/profiles/default.png',
                            'controls': {
                                'right': user_profile.p2Right,
                                'left': user_profile.p2Left,
                                'shoot': user_profile.p2Shoot,
                                'boost': user_profile.p2Boost,
                            }
                        },
                        {
                            'name': 'Player 3', 
                            'score': 0, 
                            'img_profile': user_profile.img_profile,
                            'controls': {
                                'right': user_profile.p3Right,
                                'left': user_profile.p3Left,
                                'shoot': user_profile.p3Shoot,
                                'boost': user_profile.p3Boost,
                            }
                        },
                        {
                            'name': 'Player 4', 
                            'score': 0, 
                            'img_profile': user_profile.img_profile,
                            'controls': {
                                'right': user_profile.p4Right,
                                'left': user_profile.p4Left,
                                'shoot': user_profile.p4Shoot,
                                'boost': user_profile.p4Boost,
                            }
                        },
                    ]
                
                context.update({
                    'players': players,
                    'game_info': game_info,
                })
            else:
                game = get_object_or_404(Game, pk=pk)
                player1 = UserProfile.objects.get(user=game.player1)
                player2 = UserProfile.objects.get(user=game.player2)
                if game.tournament:
                    if game.mode == '1v1':
                        if game.player1 == user:
                            player_posit = "p1"
                            posp1right = "p1Right"
                            posp1left = "p1Left"
                            posp1shoot = "p1Shoot"
                            posp1boost = "p1Boost"
                            posp2right = "p2Right"
                            posp2left = "p2Left"
                            posp2shoot = "p2Shoot"
                            posp2boost = "p2Boost"
                        elif game.player2 == user:
                            player_posit = "p2"
                            posp1left = "p2Left"
                            posp1right = "p2Right"
                            posp1shoot = "p2Shoot"
                            posp1boost = "p2Boost"
                            posp2right = "p1Right"
                            posp2left = "p1Left"
                            posp2shoot = "p1Shoot"
                            posp2boost = "p1Boost"
                        
                        players = [
                            {
                                'name': player1.nickname, 
                                'score': game.player1_score, 
                                'img_profile': player1.img_profile,
                                'controls': {
                                    'right': posp1right,
                                    'keyright': user_profile.p1Right,
                                    'left': posp1left,
                                    'keyleft': user_profile.p1Left,
                                    'shoot': posp1shoot,
                                    'keyshoot': user_profile.p1Shoot,
                                    'boost': posp1boost,
                                    'keyboost': user_profile.p1Boost,
                                },
                                'player_posit': player_posit,
                            },
                            {
                                'name': player2.nickname, 
                                'score': game.player2_score, 
                                'img_profile': player2.img_profile,
                                'controls': {
                                    'right': posp2right,
                                    'left': posp2left,
                                    'shoot': posp2shoot,
                                    'boost': posp2boost,
                                }
                            }
                        ]
                        game_info = {
                            'name': game.name,
                            'type': "tournament",
                            'mode': game.mode,
                            'rules': game.rules,
                            'limit': game.limit,
                            'balls': game.balls,
                            'boost': game.boost,
                            'time': game.time_left,
                            'player1_score': game.player1_score,
                            'player2_score': game.player2_score,
                            'tournament_id': game.tournament.id,
                        }
                        context.update({
                            'players': players,
                            'game_info': game_info,
                        })    
                else:
                    if game.player1 == user:
                        player_posit = "p1"
                        posp1right = "p1Right"
                        posp1left = "p1Left"
                        posp1shoot = "p1Shoot"
                        posp1boost = "p1Boost"
                        posp2right = "p2Right"
                        posp2left = "p2Left"
                        posp2shoot = "p2Shoot"
                        posp2boost = "p2Boost"
                        posp3right = "p3Right"
                        posp3left = "p3Left"
                        posp3shoot = "p3Shoot"
                        posp3boost = "p3Boost"
                        posp4right = "p4Right"
                        posp4left = "p4Left"
                        posp4shoot = "p4Shoot"
                        posp4boost = "p4Boost"
                    elif game.player2 == user:
                        player_posit = "p2"
                        posp1left = "p2Left"
                        posp1right = "p2Right"
                        posp1shoot = "p2Shoot"
                        posp1boost = "p2Boost"
                        posp2right = "p1Right"
                        posp2left = "p1Left"
                        posp2shoot = "p1Shoot"
                        posp2boost = "p1Boost"
                        posp3right = "p4Right"
                        posp3left = "p4Left"
                        posp3shoot = "p4Shoot"
                        posp3boost = "p4Boost"
                        posp4right = "p3Right"
                        posp4left = "p3Left"
                        posp4shoot = "p3Shoot"
                        posp4boost = "p3Boost"
                    elif game.player3 == user:
                        player_posit = "p3"
                        posp1left = "p3Left"
                        posp1right = "p3Right"
                        posp1shoot = "p3Shoot"
                        posp1boost = "p3Boost"
                        posp2right = "p4Right"
                        posp2left = "p4Left"
                        posp2shoot = "p4Shoot"
                        posp2boost = "p4Boost"
                        posp3right = "p1Right"
                        posp3left = "p1Left"
                        posp3shoot = "p1Shoot"
                        posp3boost = "p1Boost"
                        posp4right = "p2Right"
                        posp4left = "p2Left"
                        posp4shoot = "p2Shoot"
                        posp4boost = "p2Boost"
                    elif game.player4 == user:
                        player_posit = "p4"
                        posp1left = "p4Left"
                        posp1right = "p4Right"
                        posp1shoot = "p4Shoot"
                        posp1boost = "p4Boost"
                        posp2right = "p1Right"
                        posp2left = "p1Left"
                        posp2shoot = "p1Shoot"
                        posp2boost = "p1Boost"
                        posp3right = "p2Right"
                        posp3left = "p2Left"
                        posp3shoot = "p2Shoot"
                        posp3boost = "p2Boost"
                        posp4right = "p3Right"
                        posp4left = "p3Left"
                        posp4shoot = "p3Shoot"
                        posp4boost = "p3Boost"
                    
                    players = [
                        {
                            'name': player1.nickname, 
                            'score': game.player1_score, 
                            'img_profile': player1.img_profile,
                            'controls': {
                                'right': posp1right,
                                'keyright': user_profile.p1Right,
                                'left': posp1left,
                                'keyleft': user_profile.p1Left,
                                'shoot': posp1shoot,
                                'keyshoot': user_profile.p1Shoot,
                                'boost': posp1boost,
                                'keyboost': user_profile.p1Boost,
                            },
                            'player_posit': player_posit,
                        },
                        {
                            'name': player2.nickname, 
                            'score': game.player2_score, 
                            'img_profile': player2.img_profile,
                            'controls': {
                                'right': posp2right,
                                'left': posp2left,
                                'shoot': posp2shoot,
                                'boost': posp2boost,
                            }
                        },
                        {
                            'name': game.player3, 
                            'score': game.player3_score, 
                            'img_profile': user_profile.img_profile,
                            'controls': {
                                'right': posp3right,
                                'left': posp3left,
                                'shoot': posp3shoot,
                                'boost': posp3boost,
                            }
                        },
                        {
                            'name': game.player4, 
                            'score': game.player4_score, 
                            'img_profile': user_profile.img_profile,
                            'controls': {
                                'right': posp4right,
                                'left': posp4left,
                                'shoot': posp4shoot,
                                'boost': posp4boost,
                            }
                        },
                    ]
                    game_info = {
                        'name': game.name,
                        'type': "remote-game",
                        'mode': game.mode,
                        'rules': game.rules,
                        'limit': game.limit,
                        'balls': game.balls,
                        'boost': game.boost,
                        'time': game.time_left,
                        'player1_score': game.player1_score,
                        'player2_score': game.player2_score,
                    }
                    context.update({
                        'players': players,
                        'game_info': game_info,
                    })
            
            url_without_api = current_url.replace('/api', '')
            
            html = render_to_string('game.html', context)
            dash_base = render_to_string('game-dashboard-base.html', context)
            data = {
                'url': f'game/{pk}' if pk else url_without_api,
                'html': html,
                'dash_base': dash_base,
                'scripts': 'game.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)
        else:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)
    
    def post(self, request, pk=None):
        if request.user.is_authenticated:
            
            if 'local' in request.path:
                data = request.data

                user = get_object_or_404(User, pk=request.user.id)
                user_profile = get_object_or_404(UserProfile, user=user)
                boosts = data.get('boosts', 0)
                player1_score = data.get('scorePlayer1', 0)
                player2_score = data.get('scorePlayer2', 0)
                if boosts == "true":
                    boosts = True
                else:
                    boosts = False
                game = Game.objects.create(
                    name=data.get('name', 'Game'),
                    mode=data.get('mode'),
                    rules=data.get('rules'),
                    limit=data.get('limit'),
                    balls=data.get('balls'),
                    boost=boosts,
                    player1=user,
                    player2=user,
                    player1_score= int(player1_score),
                    player2_score= int(player2_score),
                    player1_hit= data.get('player1_hit', 0),
                    player2_hit= data.get('player2_hit', 0),
                    player1_keyPressCount= data.get('player1_keyPressCount', 0),
                    player2_keyPressCount= data.get('player2_keyPressCount', 0),
                    ballCount= data.get('ballCount', 0),
                    status='finished',
                )
                user_profile.game_played.add(game)
                user_profile.save()
                game.save()
                player1 = UserProfile.objects.get(user=game.player1)
                abandon = data.get('abandon', 0)
                if abandon != 0:
                        if abandon == 1:
                            player1.game_abandon += 1
                            game.winner = game.player2

                if game.player1_score < game.player2_score and game.rules == 'time':
                    player1.game_win += 1
                    game.winner = game.player1
                elif game.player2_score < game.player1_score and game.rules == 'time':
                    player1.game_lose += 1
                    game.winner = game.player2
                elif game.player1_score > game.player2_score and game.rules == 'score':
                    player1.game_win += 1
                    game.winner = game.player1
                elif game.player2_score > game.player1_score and game.rules == 'score':
                    player1.game_lose += 1
                    game.winner = game.player2
                else:
                    player1.game_draw += 1
                    game.winner = None

                player1.save()
                game.save()

                return Response({'success': game.id}, status=status.HTTP_200_OK)
            else:
                data = request.data

                try:
                    
                    game = Game.objects.get(id=pk)
                    player1 = UserProfile.objects.get(user=game.player1)
                    player2 = UserProfile.objects.get(user=game.player2)

                    abandon = data.get('abandon', 0)
                    winner = data.get('winner', None)
                    game.player1_score = data.get('scorePlayer1', game.player1_score)
                    game.player2_score = data.get('scorePlayer2', game.player2_score)
                    game.player1_hit = data.get('player1_hit', game.player1_hit)
                    game.player2_hit = data.get('player2_hit', game.player2_hit)
                    game.player1_keyPressCount = data.get('player1_keyPressCount', game.player1_keyPressCount)
                    game.player2_keyPressCount = data.get('player2_keyPressCount', game.player2_keyPressCount)
                    game.ballCount = data.get('ballCount', game.ballCount)
                    
                    if abandon != 0:
                        if abandon == 1:
                            player1.game_abandon += 1
                            player2.game_win += 1
                            game.winner = game.player2
                        elif abandon == 2:
                            player1.game_win += 1
                            player2.game_abandon += 1
                            game.winner = game.player1
                    elif game.player1_score < game.player2_score and game.rules == 'time':
                        player1.game_win += 1
                        player2.game_lose += 1
                        game.winner = game.player1
                    elif game.player2_score < game.player1_score and game.rules == 'time':
                        player2.game_win += 1
                        player1.game_lose += 1
                        game.winner = game.player2
                    elif game.player1_score > game.player2_score and game.rules == 'score':
                        player1.game_win += 1
                        player2.game_lose += 1
                        game.winner = game.player1
                    elif game.player2_score > game.player1_score and game.rules == 'score':
                        player2.game_win += 1
                        player1.game_lose += 1
                        game.winner = game.player2
                    else:
                        player1.game_draw += 1
                        player2.game_draw += 1
                        game.winner = None


                    game.status = data.get('gameStatus')
                    player1.save()
                    player2.save()
                    game.save()
                    
                    return Response({'success': game.id}, status=status.HTTP_200_OK)
                except Game.DoesNotExist:
                    return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
                except Exception as e:
                    return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

class ForbiddenAPIView(APIView):
    def get(self, request, reason):

        if request.user.is_authenticated:
            if reason == 'game':
                html = render_to_string('forbidden-game.html')
            elif reason == 'tournament':
                html = render_to_string('forbidden-tournament.html')
            elif reason == 'lobby':
                html = render_to_string('forbidden-lobby.html')
    
            user = User.objects.get(pk=request.user.id)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
            }
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
               'url': 'forbidden/' + reason + '/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'forbidden.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)


class StatsAPIView(APIView):
    def get(self, request, game_id=None, tournament_id=None):
        if not request.user.is_authenticated:
            html = render_to_string('login.html')
            data = {
                'url': 'login/',
                'html': html,
                'scripts': 'login.js',
                'nav_stat': 'not_logged',
            }
            return Response(data)

        user = request.user
        user_profile = get_object_or_404(UserProfile, user=user)

        if game_id:
            game = get_object_or_404(Game, pk=game_id)
            player1 = UserProfile.objects.get(user=game.player1)
            player2 = UserProfile.objects.get(user=game.player2)
            if player1 == player2:
                type = 'local-game'
            elif game.tournament:
                type = 'tournament-game'
            else:
                type = 'remote-game'

            context = {
                'user': user,
                'userprofile': user_profile,
                'game': {
                    'id': game.id,
                    'name': game.name,
                    'mode': game.mode,
                    'type': type,
                    'rules': game.rules,
                    'limit': game.limit,
                    'balls': game.balls,
                    'boost': game.boost,
                    'status': game.status,
                    'winner': player1.nickname if game.winner == game.player1 else player2.nickname if game.winner == game.player2 else None,
                    'player1': player1.nickname,
                    'player2': player2.nickname,
                    'player1_score': game.player1_score,
                    'player2_score': game.player2_score,
                    'player1_hit': game.player1_hit,
                    'player2_hit': game.player2_hit,
                    'player1_keyPressCount': game.player1_keyPressCount,
                    'player2_keyPressCount': game.player2_keyPressCount,
                    'ballCount': game.ballCount,
                    'player1_image': player1.img_profile,
                    'player2_image': player2.img_profile,
                },
            }
            html = render_to_string('match-info.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': f'matchinfo/{game_id}/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'match-info.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)

        if tournament_id:
            tournament = get_object_or_404(Tournament, pk=tournament_id)

            games = Game.objects.filter(tournament=tournament)
            games_data = []

            for game in games:
                player1 = UserProfile.objects.get(user=game.player1)
                player2 = UserProfile.objects.get(user=game.player2)
                games_data.append({
                    'id': game.id,
                    'name': game.name,
                    'player1': player1.nickname,
                    'player2': player2.nickname,
                    'winner': player1.nickname if game.winner == game.player1 else player2.nickname if game.winner == game.player2 else None,
                    'player1_score': game.player1_score,
                    'player2_score': game.player2_score,
                    'player1_image': player1.img_profile,
                    'player2_image': player2.img_profile,
                })

            context = {
                'user': user,
                'userprofile': user_profile,
                'tournament': {
                    'id': tournament.id,
                    'name': tournament.name,
                    'mode': tournament.mode,
                    'rules': tournament.rules,
                    'limit': tournament.limit,
                    'balls': tournament.balls,
                    'boost': tournament.boost,
                    'status': tournament.status,
                    'nb_players': tournament.nb_players,
                    'owner': UserProfile.objects.get(user=tournament.owner).nickname,
                    'winner': UserProfile.objects.get(user=tournament.winner).nickname if tournament.winner else None,
                    'players': [UserProfile.objects.get(user=player).nickname for player in tournament.players.all()],
                    'games': games_data,
                },
            }
            html = render_to_string('tournament-info.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
            data = {
                'url': f'tournamentinfo/{tournament_id}/',
                'html': html,
                'dash_base': dash_base,
                'scripts': 'tournament-info.js',
                'nav_stat': 'logged_nav',
            }
            return Response(data)

        return Response(data)
