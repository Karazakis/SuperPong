from django.shortcuts import render

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
from .models import Tournament
from .forms import SignUpForm
from urllib.parse import parse_qs
from django.shortcuts import get_object_or_404
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from django.middleware.csrf import get_token

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
                response = HttpResponse(f.read(), content_type='model/gltf+json')  # Modifica il Content-Type qui
                response['Content-Disposition'] = 'inline; filename=' + filename  # Facoltativo: fornisce il nome del file
                return response
        else:
            return HttpResponse(status=404)

class HomePageAPIView(APIView):
    def get(self, request, format=None):
        # Controlla se l'utente è autenticato
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
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            errors_with_field_type = {
                field: {
                    'messages': messages,
                    'type': form.fields[field].__class__.__name__
                } for field, messages in form.errors.items()
            }
            logger.warning(f"Errori di validazione: {errors_with_field_type}")
            return Response({'errors': errors_with_field_type}, status=status.HTTP_400_BAD_REQUEST)



class LoginUserAPIView(APIView):
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
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'error': 'Username does not exist'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(password):
            return Response({'error': 'Incorrect password'}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)

        # Genera il token CSRF
        csrf_token = get_token(request)

        # Imposta il token CSRF nel cookie di risposta
        response = Response({
            'username': user.username,
            'userId': user.id,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)
        response.set_cookie('csrftoken', csrf_token)  # Imposta il token CSRF nel cookie
        return response


class RefreshTokenAPIView(APIView):
    def post(self, request):
        try:
            refresh = RefreshToken(request.data['refresh'])
            return Response({
                'access': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class DashboardAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            nav_stat = 'logged_nav'
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

class ProfileAPIView(APIView):

    def get(self, request, pk):
        try:
            print(' diahane ')
            user = User.objects.get(pk=pk)
            user_profile = UserProfile.objects.get(user=user)
            context = {
                'user': user,
                'userprofile': user_profile,
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
                if(user_profile.img_profile != 'profiles/default.png'):
                    # Cancella l'immagine precedente
                    os.remove(f'{settings.BASE_DIR}/static/media/{user_profile.img_profile}')
                # Crea il percorso della cartella in base all'ID dell'utente
                user_folder = f'{settings.BASE_DIR}/static/media/profiles/{user.id}/'
                if not os.path.exists(user_folder):
                    os.makedirs(user_folder)
                # Salva l'immagine nel percorso specificato
                fs = FileSystemStorage(location=user_folder)
                filename = fs.save(img_profile.name, img_profile)
                user_profile.img_profile = f'profiles/{user.id}/{filename}'
            username = request.POST.get('username')
            email = request.POST.get('email')
            password = request.POST.get('password')
            nickname = request.POST.get('nickname')
            img_profile = request.FILES.get('img_profile')
            p1Right = request.POST.get('right1')
            p1Left = request.POST.get('left1')
            p1Shoot = request.POST.get('shoot1')
            p1Boost = request.POST.get('boost1')
            p2Right = request.POST.get('right2')
            p2Left = request.POST.get('left2')
            p2Shoot = request.POST.get('shoot2')
            p2Boost = request.POST.get('boost2')
            p3Right = request.POST.get('right3')
            p3Left = request.POST.get('left3')
            p3Shoot = request.POST.get('shoot3')
            p3Boost = request.POST.get('boost3')
            p4Right = request.POST.get('right4')
            p4Left = request.POST.get('left4')
            p4Shoot = request.POST.get('shoot4')
            p4Boost = request.POST.get('boost4')


            if username:
                user.username = username
            if email:
                user.email = email
            if password:
                user.set_password(password)
            if nickname:
                user_profile.nickname = nickname
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
            if p3Right:
                user_profile.p3Right = p3Right
            if p3Left:
                user_profile.p3Left = p3Left
            if p3Shoot:
                user_profile.p3Shoot = p3Shoot
            if p3Boost:
                user_profile.p3Boost = p3Boost
            if p4Right:
                user_profile.p4Right = p4Right
            if p4Left:
                user_profile.p4Left = p4Left
            if p4Shoot:
                user_profile.p4Shoot = p4Shoot
            if p4Boost:
                user_profile.p4Boost = p4Boost
            user_profile.save()
            user.save()
            return Response({'success': 'Profilo aggiornato con successo.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LogoutAPIView(APIView):
    def get(self, request):
        try:
            refresh = request.COOKIES.get('refresh')
            token = RefreshToken(refresh)
            token.blacklist()
            # Cancella il cookie di refresh
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

            if 'join_lobby' in current_url:
                games = Game.objects.filter(status='not_started', tournament__isnull=True)
            elif 'join_tournament' in current_url:
                tournaments = Tournament.objects.filter(status='not_started')

            context = {
                'user': user,
                'userprofile': user_profile,
                'games': games,
                'tournaments': tournaments,
            }

            html = render_to_string('join.html', context)
            dash_base = render_to_string('dashboard-base.html', context)
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
        if request.user.is_authenticated:
            user = get_object_or_404(User, pk=request.user.id)
            data = request.data
            current_url = request.path

            if 'join_lobby' in current_url:
                game_id = data.get('game_id')
                if game_id:
                    game = get_object_or_404(Game, pk=game_id, status='not_started', tournament__isnull=True)
                    if game.player_inlobby < game.player_limit:
                        game.player_inlobby += 1
                        game.save()
                        return Response({'success': True}, status=status.HTTP_200_OK)
                    else:
                        return Response({'success': False, 'message': 'Game is full'}, status=status.HTTP_400_BAD_REQUEST)

            elif 'join_tournament' in current_url:
                tournament_id = data.get('tournament_id')
                if tournament_id:
                    tournament = get_object_or_404(Tournament, pk=tournament_id, status='not_started')
                    tournament.nb_players += 1
                    tournament.save()
                    return Response({'success': True}, status=status.HTTP_200_OK)

            return Response({'success': False, 'message': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'success': False, 'message': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

        
class CreateAPIView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            source = request.query_params.get('source', 'default')
            user = request.user  # Utilizza direttamente request.user
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
                url = 'create_single/'  # Default URL
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

            if source == 'tournament':
                tournament = Tournament.objects.create(
                    name=request.data.get('name', ''),
                    mode=request.data.get('mode', ''),
                    limit=int(request.data.get('timelimit', 0)),
                    balls=int(request.data.get('balls', 1)),
                    boost=request.data.get('boost', False),
                    nb_players=int(request.data.get('nb_players', 0)),
                    status='not_started'
                )
                tournament.players.add(user)  # Aggiungi l'utente all'elenco dei giocatori
                tournament.save()
                logging.debug(f'Torneo creato: {tournament.id}')
                return Response({'success': tournament.id}, status=status.HTTP_201_CREATED)
            else:
                if request.data.get('rules', '') == 'time':
                    rules_limit = int(request.data.get('timelimit', 0))
                else:
                    rules_limit = int(request.data.get('scorelimit', 0))

                game = Game.objects.create(
                    name=request.data.get('name', ''),
                    mode=request.data.get('mode', ''),
                    rules=request.data.get('rules', ''),
                    limit=rules_limit,
                    balls=int(request.data.get('balls', 1)),
                    boost=request.data.get('boost', False)
                )
                if request.data.get('mode', '') == '1v1':
                    game.player_limit = 2
                else:
                    game.player_limit = 4
                game.players.add(user)
                game.player1 = user
                game.player_inlobby += 1
                game.save()
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
                context = {
                    'user': user,
                    'userprofile': user_profile,
                    'tournament': tournament,
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
            try:
                game = Game.objects.get(pk=pk)
                if game.player1 == request.user:
                    game.delete()
                    return Response({'success': True}, status=status.HTTP_200_OK)
                else:
                    return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            except Game.DoesNotExist:
                return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, pk):
        if request.user.is_authenticated:
            try:
                game = Game.objects.get(pk=pk)
                if game.player1 == request.user:
                    game.player1 = None
                elif game.player2 == request.user:
                    game.player2 = None
                elif game.player3 == request.user:
                    game.player3 = None
                elif game.player4 == request.user:
                    game.player4 = None
                game.player_inlobby -= 1
                game.save()
                return Response({'success': True}, status=status.HTTP_200_OK)
            except Game.DoesNotExist:
                return Response({'error': 'Game not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)



        
class UserInfoAPIView(APIView):
    def get(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user_profile = UserProfile.objects.get(user=user)
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
                'p4Boost': user_profile.p4Boost
            }
            return Response(data)
        except User.DoesNotExist:
            return Response({"error": "Utente non trovato."}, status=404)
        except UserProfile.DoesNotExist:
            return Response({"error": "Profilo utente non trovato."}, status=404)


        
class UserRequestAPIView(APIView):
    def post(self, request, request_type, id):  # Modifica la firma del metodo post per accettare request_type
        try:
            # Trova l'utente associato all'ID
            user = User.objects.get(pk=id)
            # Estrai i dati dalla richiesta POST
            request_data = request.data
            request_data['request_type'] = request_type  # Includi il tipo di richiesta nei dati della richiesta

            # Verifica se la richiesta esiste già nell'elenco delle richieste dell'utente
            user_profile = UserProfile.objects.get(user=user)
            requests = user_profile.requests
            if request_data not in requests:
                # Aggiungi la richiesta all'attributo requests dell'utente solo se non esiste già
                requests.append(request_data)
                user_profile.requests = requests
                user_profile.save()
                return Response({'success': 'Richiesta inviata con successo.'}, status=status.HTTP_200_OK)
            else:
                #PER DIEGO se è tutto identico
                return Response({'error': 'La richiesta è già presente.'}, status=status.HTTP_400_BAD_REQUEST)
                #PER DIEGO altrimenti modifichi il campo della richiesta esistente diverso, se modificabile, altrimenti se è una richiesta già risposta o altri motivi di incompatibilità, da errore.
        except User.DoesNotExist:
            return Response({'error': 'L\'utente non esiste.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
            
            if 'remote' in current_url:
                game = get_object_or_404(Game, pk=pk)
                players = [
                    {'name': game.player1, 'score': game.player1_score, 'img_profile': user_profile.img_profile},
                    {'name': game.player2, 'score': game.player2_score, 'img_profile': user_profile.img_profile},
                    {'name': game.player3, 'score': game.player3_score, 'img_profile': user_profile.img_profile},
                    {'name': game.player4, 'score': game.player4_score, 'img_profile': user_profile.img_profile},
                ]
                game_info = {
                    'type': game.mode,
                    'rules': game.rules,
                    'timelimit': game.limit,
                    'scorelimit': game.score_limit,
                    'balls': game.balls,
                    'boost': game.boost,
                }
                context.update({
                    'game': game,
                    'players': players,
                    'game_info': game_info,
                })
            elif 'single' in current_url or 'local' in current_url:
                game_info = request.GET.dict()
                if 'single' in current_url:
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
                            'img_profile': user_profile.img_profile,
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
                game_info = request.GET.dict()
                user_id = request.GET.get('userid')
                if user_id:
                    user = get_object_or_404(User, pk=user_id)
                    user_profile = get_object_or_404(UserProfile, user=user)
                
                players = [
                    {'name': user_profile.nickname, 'score': 0, 'img_profile': user_profile.img_profile},
                ]
                
                context.update({
                    'game_info': game_info,
                    'players': players,
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

