import json
from channels.generic.websocket import WebsocketConsumer
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from .models import Game, UserProfile, Tournament, Round
from django.contrib.auth.models import User
import asyncio
import logging
import urllib
logger = logging.getLogger(__name__)

user_channel_mapping = {}

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Estrai l'username dai parametri di query
        query_string = parse_qs(self.scope['query_string'].decode())
        id = query_string.get('id', [''])[0]  # Prendi il primo valore dell'username

        if not id:
            await self.close()  # Chiudi la connessione se non c'è un username
            return

        self.id = id  # Memorizza l'username come attributo dell'istanza

        self.room_name = 'chat_room'
        self.room_group_name = 'chat_room'

        # Aggiungi l'utente al gruppo
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        # Salva l'associazione username-channel_name
        global user_channel_mapping
        user_channel_mapping[self.id] = self.channel_name
        await self.accept()

    async def disconnect(self, close_code):
        # Rimuovi l'utente dal gruppo
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Rimuovi l'associazione username-channel_name
        global user_channel_mapping
        if self.id in user_channel_mapping:
            del user_channel_mapping[self.id]
        await self.send_user_list()

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        list_users = data.get('user_list')
        pending_request = data.get('pending_request')

        if message:
            username = data.get('username')
            await self.dashboard_chat(data['message'], username)
        elif list_users:
            await self.send_user_list()
        elif pending_request:
            await self.send_pending_request(data)

    async def send_user_list(self):
        global user_channel_mapping
        # Ottieni la lista degli username
        user_list = list(user_channel_mapping.keys())

        # Invia la lista degli utenti connessi a tutti gli utenti nel gruppo
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_list',
                'message': {
                    'type': 'user_list',
                    'list': user_list
                }
            }
        )

    async def send_list(self, event):
        # Metodo per inoltrare i messaggi ai client, inclusa la lista degli utenti
        message = event['message']

        # Invia il messaggio al WebSocket
        await self.send(text_data=json.dumps(message))

    async def dashboard_chat(self, message, username):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'username': username,
                    'message': message
                }
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message',
            'player': message['username'],
            'message': message['message']
        }))

    @database_sync_to_async
    def get_user_profile(self):
        return UserProfile.objects.get(user__id=self.id)

    @database_sync_to_async
    def get_requests(self):
        user_profile = UserProfile.objects.get(user__id=self.id)
        return list(user_profile.pending_requests.all())

    async def send_pending_request(self, data):
        if not hasattr(self, 'id'):
            print('Error: self.id is not set')
            return

        if data['pending_request'] == 'get':
            try:
                pending_requests = await self.get_requests()
                
                pending_requests_data = []
                print('requesting user ' + request.requesting_user)
                for request in pending_requests:
                    pending_requests_data.append({
                        'request_type': request.request_type,
                        'target_user': request.target_user.username,
                        'requesting_user': request.requesting_user.username,
                        'status': request.status,
                        'creation_date': request.creation_date.isoformat(),
                    })
                
                await self.send(text_data=json.dumps({
                    'type': 'pending_requests',
                    'requests': pending_requests_data
                }))
                    
            except UserProfile.DoesNotExist:
                print(f'Error: UserProfile with user id {self.id} does not exist')
        elif data['pending_request'] == 'send':
            recipient = data['target_user']
            recipient_channel = user_channel_mapping.get(recipient)
            if recipient_channel:
                await self.channel_layer.send(recipient_channel, {
                    'type': 'pending_request',
                    'message': {
                        'request': data['pending_request'],
                        'target_user': data['target_user'],
                        'requesting_user': data['requesting_user'],
                        'request_type': data['type'],
                    }
                })
            else:
                print('User not found')
        elif data['pending_request'] == 'accept':
            recipient = data['target_user']
            recipient_channel = user_channel_mapping.get(recipient)
            if recipient_channel:
                await self.channel_layer.send(recipient_channel, {
                    'type': 'accept_request',
                    'message': {
                        'request': 'accept',
                        'type': 'accept',
                        'target_user': data['requesting_user'],
                        'requesting_user': data['target_user'],
                        'request_type': 'accept',
                    }
                })
            else:
                print('User not found')
        elif data['pending_request'] == 'remove':
            recipient = data['target_user']
            recipient_channel = user_channel_mapping.get(recipient)
            if recipient_channel:
                await self.channel_layer.send(recipient_channel, {
                    'type': 'remove_request',
                    'message': {
                        'request': 'remove',
                        'target_user': data['target_user'],
                        'requesting_user': data['requesting_user'],
                        'request_type': 'remove',
                    }
                })
            else:
                print('User not found')
            

    async def pending_request(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'friend_request',
            'request': message['request'],
            'target_user': message['target_user'],
            'requesting_user': message['requesting_user'],
            'request_type': message['request_type'],
        }))

    async def accept_request(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'accept',
            'request': message['request'],
            'target_user': message['target_user'],
            'requesting_user': message['requesting_user'],
            'request_type': message['request_type'],
        }))

    async def remove_request(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'remove',
            'request': message['request'],
            'target_user': message['requesting_user'],
            'requesting_user': message['target_user'],
            'request_type': message['request_type'],
        }))



class LobbyConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.room_name = 'lobby'
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = 'lobby'

        self.user = await self.get_user()
        if not self.user:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_connected',
                'username': self.user.username 
            }
        )

        await self.accept()
        slot = await self.assign_player_slot()
        if slot:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'assign_slot',
                    'slot': slot,
                    'player': self.user.username
                }
            )
        await self.send_user_list()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_disconnected',
                'username': self.user.username 
            }
        )

    async def receive(self, text_data):
        logger.info(f'Received message: {text_data}')
        data = json.loads(text_data)
        action = data.get('action')
        username = data.get('username')
        
        if action == 'join_team':
            await self.join_team_db(data['team'], username)
            await self.join_team(data['team'], username)
        elif action == 'leave_team':
            await self.leave_team_db(data['team'], username)
            await self.leave_team(data['team'], username)
        elif action == 'start_game':
            logger.info('Starting game')
            if await self.all_players_ready():
                logger.info('All players ready')
                await self.start_game_db()
                await self.start_game()
        elif action == 'message':
            await self.lobby_chat(data['message'], username)
        elif action == 'join':
            slot = await self.assign_player_slot()
            if slot:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'assign_slot',
                        'slot': slot,
                        'player': self.user.username
                    }
                )
        elif action == 'ready':
            logger.info('Player ready')
            await self.set_player_ready(username, data['status'])
            await self.send_player_ready(username, data['status'])
        elif action == 'leave':
            await self.leave_lobby(username)
            await self.leave_lobby_db(username)

    async def user_disconnected(self, event):
        username = event['username']
        logger.info(f'User {username} disconnected')

        await self.send(text_data=json.dumps({
            'action': 'disconnected',
            'username': username
        }))

    async def user_connected(self, event):
        username = event['username']
        logger.info(f'User {username} connected')
        await self.send(text_data=json.dumps({
            'action': 'connected',
            'username': username
        }))



    @database_sync_to_async
    def join_team_db(self, team, username):
        game = Game.objects.get(id=self.game_id)
        user = User.objects.get(username=username)
        if team == 'team1':
            game.team1.add(user)
        elif team == 'team2':
            game.team2.add(user)
        game.save()

    @database_sync_to_async
    def leave_team_db(self, team, username):
        game = Game.objects.get(id=self.game_id)
        user = User.objects.get(username=username)
        if team == 'team1':
            game.team1.remove(user)
        elif team == 'team2':
            game.team2.remove(user)
        game.save()

    @database_sync_to_async
    def get_user(self):
        try:
            user = User.objects.get(id=self.scope['query_string'].decode().split('=')[1])
            return user
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def assign_player_slot(self):
        game = Game.objects.get(id=self.game_id)
        if game.player1 == self.user:
            slot = 'player1'
        elif game.player2 == self.user:
            slot = 'player2'
        elif game.player3 == self.user:
            slot = 'player3'
        elif game.player4 == self.user:
            slot = 'player4'
        else:
            if game.player1 is None:
                game.player1 = self.user
                slot = 'player1'
            elif game.player2 is None:
                game.player2 = self.user
                slot = 'player2'
            elif game.player3 is None:
                game.player3 = self.user
                slot = 'player3'
            elif game.player4 is None:
                game.player4 = self.user
                slot = 'player4'
            else:
                slot = None
            game.save()
        return slot

    async def assign_slot(self, event):
        slot = event['slot']
        player = event['player']
        await self.send(text_data=json.dumps({
            'action': 'assign_slot',
            'slot': slot,
            'player': player
        }))
    
    @database_sync_to_async
    def get_user_list(self):
        game = Game.objects.get(id=self.game_id)
        return [
            {
                'slot': 'player1',
                'player': game.player1.username if game.player1 else 'Empty',
                'team': 'team1' if game.player1 in game.team1.all() else ('team2' if game.player1 in game.team2.all() else 'none')
            },
            {
                'slot': 'player2',
                'player': game.player2.username if game.player2 else 'Empty',
                'team': 'team1' if game.player2 in game.team1.all() else ('team2' if game.player2 in game.team2.all() else 'none')
            },
            {
                'slot': 'player3',
                'player': game.player3.username if game.player3 else 'Empty',
                'team': 'team1' if game.player3 in game.team1.all() else ('team2' if game.player3 in game.team2.all() else 'none')
            },
            {
                'slot': 'player4',
                'player': game.player4.username if game.player4 else 'Empty',
                'team': 'team1' if game.player4 in game.team1.all() else ('team2' if game.player4 in game.team2.all() else 'none')
            },
        ]

    async def send_user_list(self):
        user_list = await self.get_user_list()
        await self.send(text_data=json.dumps({
            'action': 'user_list',
            'users': user_list
        }))

    async def join_team(self, team, username):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'team_join',
                'message': {
                    'action': 'join', 
                    'team': team,
                    'player': username
                }
            }
        )

    async def team_join(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'action': message['action'],
            'team': message['team'],
            'player': message['player']
        }))

    async def leave_team(self, team, username):
        player_name = username
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'team_leave',
                'message': {
                    'action': 'leave',
                    'team': team,
                    'player': player_name
                }
            }
        )

    async def team_leave(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'action': message['action'],
            'team': message['team'],
            'player': message['player']
        }))

    async def lobby_chat(self, message, username):
        player_name = username
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'player': player_name,
                    'message': message
                }
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'action': 'message',
            'player': message['player'],
            'message': message['message']
        }))

    async def start_game(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_start',
                'url': f'/game/{self.game_id}'
            }
        )

    async def game_start(self, event):
        url = event['url']
        await self.send(text_data=json.dumps({
            'action': 'start_game',
            'url': url
        }))

    @database_sync_to_async
    def start_game_db(self):
        try:
            game = Game.objects.get(id=self.game_id)
            game.status = 'playing'
            game.save()

            for player in [game.player1, game.player2]:
                user_profile = UserProfile.objects.get(user=player)
                if user_profile.in_game_lobby is not None:
                    user_profile.in_game_lobby = None
                    user_profile.game_played.add(game)
                    user_profile.save()
                    
        except Game.DoesNotExist:
            print("Errore: Il gioco con questo ID non esiste.")
        except UserProfile.DoesNotExist:
            print("Errore: UserProfile non trovato per uno dei giocatori.")


    async def send_player_ready(self, username, status):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_ready',
                'message': {
                    'username': username,
                    'status': status
                }
            }
        )
    
    async def player_ready(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'action': 'player_ready',
            'username': message['username'],
            'status': message['status']
        }))

    @database_sync_to_async
    def set_player_ready(self, username, status):
        if status == 'ready':
            game = Game.objects.get(id=self.game_id)
            user = User.objects.get(username=username)
            game.ready_players.add(user)
            game.save()
        else:
            game = Game.objects.get(id=self.game_id)
            user = User.objects.get(username=username)
            game.ready_players.remove(user)
            game.save()

    @database_sync_to_async
    def all_players_ready(self):
        game = Game.objects.get(id=self.game_id)
        return game.ready_players.count() >= (game.players.count() - 1)
    
    @database_sync_to_async
    def leave_lobby_db(self, username):
        game = Game.objects.get(id=self.game_id)
        user = User.objects.get(username=username)
        if game.player1 == user:
            game.player1 = None
        elif game.player2 == user:
            game.player2 = None
        elif game.player3 == user:
            game.player3 = None
        elif game.player4 == user:
            game.player4 = None
        game.save()
    
    async def leave_lobby(self, username):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'handle_leave',
                'action': 'leave',
                'username': username
            }
        )

    async def handle_leave(self, event):
        username = event['username']
        await self.send(text_data=json.dumps({
            'action': 'leave',
            'username': username
        }))


    

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'game_{self.game_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        username = data.get('username')
        message = data.get('message')
        if action == 'message':
            await self.game_chat(message, username)
        elif action == 'move':
            await self.move(data)
        elif action == 'ball_launch':
            await self.ball_launch(data)
        elif action == 'ball_update':
            await self.ball_update(data)
        elif action == 'ball_destroy':
            await self.ball_destroy(data)
        elif action == 'game_over':
            p1 = data.get('p1')
            p2 = data.get('p2')
            await self.game_over(p1, p2)
        elif action == 'game_start':
            await self.game_start()
        elif action == 'time_update':
            await self.time_update(data.get('time'))
        elif action == 'score_update':
            await self.score_update(data.get('score'))

    async def game_chat(self, message, username):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'player': username,
                    'message': message
                }
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'action': 'message',
            'player': message['player'],
            'message': message['message']
        }))


    async def move(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_move',
                'data': data
            }
        )

    async def send_move(self, event):
        data = event['data']
        await self.send(text_data=json.dumps({
            'action': 'move',
            'key': data['key'],
            'state': data['state'],
            'username': data['username']
        }))

    async def ball_launch(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_ball_launch',
                'data': data
            }
        )
    
    async def send_ball_launch(self, event):
        data = event['data']
        await self.send(text_data=json.dumps({
            'action': 'ball_launch',
            'position': data['position'],
            'ballId': data['ballId']
        }))
    
    async def ball_update(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_ball_update',
                'data': data
            }
        )

    async def send_ball_update(self, event):
        data = event['data']
        await self.send(text_data=json.dumps({
            'action': 'ball_update',
            'ballId': data['ballId'],
            'position': data['position'],  
            'velocity': data['velocity'],  
        }))
        
    async def ball_destroy(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_ball_destroy',
                'data': data
            }
        )

    async def send_ball_destroy(self, event):
        data = event['data']
        await self.send(text_data=json.dumps({
            'action': 'ball_destroy',
            'ballId': data['ballId']
        }))

    async def game_over(self, p1, p2):
        logger.info('Game over', p1, p2)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_game_over',
                'p1': p1,
                'p2': p2
            }
        )

    async def game_start(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'start_game'
            }
        )

    async def start_game(self, event):
        await self.send(text_data=json.dumps({
            'action': 'start_game'
        }))

    async def send_game_over(self, event):
        await self.send(text_data=json.dumps({
            'action': 'game_over',
            'p1': event['p1'],
            'p2': event['p2']
        }))

    async def time_update(self, time):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_time_update',
                'time': time
            }
        )

    async def send_time_update(self, event):
        time = event['time']
        await self.send(text_data=json.dumps({
            'action': 'time_update',
            'time': time
        }))

    async def score_update(self, score):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_score_update',
                'score': score
            }
        )

    async def send_score_update(self, event):
        score = event['score']
        await self.send(text_data=json.dumps({
            'action': 'score_update',
            'score': score
        }))




class TournamentConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.tournament_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'tournament_{self.tournament_id}'
        logger.info(f"Connecting to tournament room: {self.room_group_name} with tournament_id: {self.tournament_id}")

        # Recupera l'utente
        self.user = await self.get_user()
        if not self.user:
            logger.warning("User not found. Closing connection.")
            await self.close()
            return

        logger.info(f"User {self.user.username} connected successfully.")
        # Controlla lo stato del torneo
        self.tournament = await self.get_tournament()
        # Recupera il round corrente
        self.current_round = await self.get_current_round()

        # Aggiungi il client al gruppo del torneo
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

         # Aggiungi l'utente al proprio gruppo personalizzato
        await self.channel_layer.group_add(f"user_{self.user.username}", self.channel_name)
        # Accetta la connessione WebSocket
        await self.accept()
        logger.info("Connection accepted.")


        # Se lo stato è 'waiting_for_matches', genera il prossimo round
        if self.tournament.status == 'waiting_for_matches':
            logger.info(f"Tournament {self.tournament.name} is in 'waiting_for_matches' state. Generating next round.")
            try:
                await self.prepare_next_round()
                logger.info("Next round prepared successfully.")
                self.tournament.status = 'waiting_for_round'
                await database_sync_to_async(self.tournament.save)()
                logger.info(f"Tournament status updated to 'waiting_for_round'.")
            except Exception as e:
                logger.error(f"Error during prepare_next_round: {e}")
                await self.close()
                return

        # Se lo stato è 'waiting_for_round', controlla i game del round corrente
        if self.tournament.status == 'waiting_for_round':
            logger.info(f"Tournament {self.tournament.name} is in 'waiting_for_round' state. Checking current round games.")
            try:
                await self.check_current_round_games()
                logger.info("Checked current round games successfully.")
            except Exception as e:
                logger.error(f"Error during check_current_round_games: {e}")
                await self.close()
                return
            
        if self.tournament.status == 'finished':
            tournament_winner = self.tournament.winner
            await self.notify_tournament_end(self.tournament.name, tournament_winner)
            logger.info(f"Notified client of tournament conclusion during connect for tournament: {self.tournament.name}.")
            return


    async def disconnect(self, close_code):
        logger.info(f"Disconnecting from tournament room: {self.room_group_name} with close code: {close_code}")

        # Verifica se l'utente ha già eseguito il leave
        if not getattr(self, 'user_left', False):
            await self.remove_user_from_lobby()
            # Invia aggiornamenti solo se l'utente non ha già lasciato
            

        # Rimuovi il client dal gruppo del torneo
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)


    async def receive(self, text_data):
        """
        Gestisce i messaggi ricevuti dai client WebSocket.
        A seconda dell'azione richiesta (assign_slot, release_slot, player_ready, etc.),
        gestisce la logica corrispondente.
        """
        data = json.loads(text_data)
        action = data.get('action')
        logger.info(f"Received message: {data}")

        try:
            # Gestisci assegnazione/rilascio slot
            if action in ['assign_slot', 'release_slot']:
                await self.manage_slot_status(data)
            
            # Gestisci stato ready
            elif action == 'player_ready':
                await self.manage_ready_status(data)

            # Gestione messaggi chat
            elif action == 'chat_message':
                await self.manage_chat(data['message'], data['username'])
            
            # Gestione team join/leave
            elif action in ['join_team', 'leave_team']:
                await self.manage_team(action, data['team'], data['username'])

            # Gestisci join dell'utente
            elif action == 'join':
                await self.add_user_to_lobby()
                await self.send_lobby_update()  # Invia aggiornamento della lobby
                await self.send_slot_status_update_to_group()  # Invia aggiornamento degli slot

            # Gestisci leave dell'utente
            elif action == 'leave':
                await self.remove_user_from_lobby()  # Questo invia già l'aggiornamento della lobby
                # Non c'è bisogno di inviare di nuovo l'aggiornamento della lobby e degli slot
                self.user_left = True  # Segna che l'utente ha lasciato
                # Invia conferma dell'avvenuto leave
                await self.send(text_data=json.dumps({
                    'type': 'leave_confirmation'
                }))

            # Preparazione torneo
            elif action == 'start_tournament_preparation':
                await self.start_tournament_flow()

            elif action == 'countdown_complete':
                await self.notify_players_to_join()

        except Exception as e:
            logger.error(f"Error processing receive message: {e}")

    async def manage_slot_status(self, data):
        action = data['action']
        slot = data.get('slot')
        username = data.get('username')

        logger.info(f"Action received: {action}, Slot: {slot}, Username: {username}")

        # Controllo se l'utente ha già uno slot assegnato
        user_slot = next((s for s, info in self.current_round.slots.items() if info['username'] == username), None)
        if user_slot:
            logger.warning(f"User {username} already has an assigned slot: {user_slot}. Slot change denied.")
            return  # Se l'utente ha già uno slot, non permettiamo il cambio

        await self.update_slot_status_in_round(slot, username if action == 'assign_slot' else None)

        logger.info(f"Slot status updated successfully for action: {action} on slot: {slot}")

        # Invia l'aggiornamento a tutti i client connessi
        await self.send_slot_status_update_to_group()


    async def manage_ready_status(self, data):
        slot = data.get('slot')
        username = data.get('username')
        ready_status = data.get('status', False)

        logger.info(f"Ready status received: Slot {slot}, Username: {username}, Ready Status: {ready_status}")

        # Verifica che l'utente possa modificare il proprio stato ready
        current_slot_user = self.current_round.slots.get(str(slot), {}).get('username')

        if current_slot_user == username:
            # Controllo se l'utente è già "ready"
            if self.current_round.ready_status.get(str(slot)):
                logger.warning(f"User {username} is already marked as ready. Status change denied.")
                return  # Se l'utente è già "ready", non permettiamo il cambio

            # Aggiorna solo lo stato ready per lo slot specificato
            await self.update_ready_status_in_round(slot, ready_status == 'ready')
            # Invia l'aggiornamento dello stato ready a tutti i client connessi
            await self.send_ready_status_update_to_group()
        else:
            logger.warning(f"User {username} is not authorized to change the ready status for slot {slot}")


    async def update_slot_status_in_round(self, slot, username, player_id=None):
        """
        Aggiorna lo stato degli slot nel round corrente, mantenendo il player_id.
        """
        try:
            await database_sync_to_async(self.current_round.refresh_from_db)()
            slots = self.current_round.slots
            logger.info(f"Current slot status for round.slots {slots}")
            

            # Recupera il player_id direttamente da self.user
            player_id = self.user.id if self.user else None

            # Log per monitorare lo stato attuale e il cambiamento
            logger.info(f"Current slot status for all slots {slots}")


            # Verifica se lo slot è già occupato
            if slots[str(slot)]['username'] != 'empty' and slots[str(slot)]['username'] != username:
                logger.warning(f"Slot {slot} is already occupied by {slots[str(slot)]['username']}. Cannot reassign.")
                return  # Slot già occupato da un altro utente
            
            # Aggiorna lo slot specificato con il nuovo username e player_id (o 'empty')
            if username:
                slots[str(slot)]['username'] = username
                slots[str(slot)]['player_id'] = player_id
                self.current_round.ready_status[str(slot)] = False  # Resetta lo stato ready quando si assegna uno slot
            else:
                slots[str(slot)] = {'username': 'empty', 'player_id': None}
                self.current_round.ready_status[str(slot)] = False  # Resetta lo stato ready quando lo slot è vuoto

            self.current_round.slots = slots
            await database_sync_to_async(self.current_round.save)()
            logger.info(f"Slot status in round DB updated: {slots}")  # Log per confermare aggiornamento DB
        except Exception as e:
            logger.error(f"Error updating slot status in round DB: {e}")


    async def update_ready_status_in_round(self, slot, ready_status):
        """
        Imposta lo stato 'ready' del giocatore nello slot specificato nel round corrente.
        """
        try:
            await database_sync_to_async(self.current_round.refresh_from_db)()
            if not self.current_round:
                logger.error("Current round not found.")
                return

            ready_statuses = self.current_round.ready_status

            logger.info(f"Ready statuses before update: {ready_statuses}")
            # Aggiorna solo lo stato ready per lo slot specificato
            ready_statuses[str(slot)] = ready_status

            logger.info(f"Ready statuses after update: {ready_statuses}")

            self.current_round.ready_status = ready_statuses
            await database_sync_to_async(self.current_round.save)()
            logger.info(f"Ready status saved successfully in the round database.")

        except Exception as e:
            logger.error(f"Error setting ready status in round DB: {e}")

    # async def send_slot_status_update_to_group(self):
    #     """
    #     Invia l'aggiornamento dello stato degli slot del round corrente a tutti i client connessi.
    #     """
    #     current_round = await self.get_current_round()
    #     if not self.current_round:
    #         logger.error("Current round not found.")
    #         return

    #     slots_status = current_round.slots
    #     message = {
    #         'type': 'update_all_slots',
    #         'slots': slots_status
    #     }
    #     await self.channel_layer.group_send(
    #         self.room_group_name,
    #         {
    #             'type': 'send_message_to_clients',
    #             'message': message
    #         }
    #     )
    #     logger.info(f"Slot status update sent to group: {slots_status}")

    async def send_slot_status_update_to_group(self):
        """
        Invia l'aggiornamento dello stato degli slot di tutti i round fino al round corrente,
        e include anche il round successivo se non è l'ultimo round del torneo.
        """
        try:
            logger.info(f"Current round: {self.current_round.round_number if self.current_round else 'None'}")

            # Recupera tutti i round fino al corrente
            rounds = await database_sync_to_async(
                list
            )(Round.objects.filter(
                tournament=self.tournament, 
                round_number__lte=self.current_round.round_number  # Dal primo round al corrente
            ).order_by('round_number'))

            if not rounds:
                logger.error("No rounds found up to the current round.")
                return

            # Verifica se c'è un round successivo
            next_round = None
            if self.current_round.round_number < self.tournament.rounds:
                next_round = await database_sync_to_async(
                    Round.objects.filter(
                        tournament=self.tournament,
                        round_number=self.current_round.round_number + 1
                    ).first
                )()

            # Log dettagliato sui round trovati
            round_numbers = [round_obj.round_number for round_obj in rounds]
            if next_round:
                round_numbers.append(next_round.round_number)
            logger.info(f"Rounds included in update: {round_numbers}")

            # Prepara uno stato cumulativo degli slot
            all_slots_status = {}
            for round_obj in rounds:
                all_slots_status[f'round_{round_obj.round_number}'] = round_obj.slots

            # Aggiungi il round successivo se presente
            if next_round:
                all_slots_status[f'round_{next_round.round_number}'] = next_round.slots

            # Prepara il messaggio
            message = {
                'type': 'update_all_slots',
                'slots': all_slots_status  # Stato cumulativo degli slot
            }

            # Invia il messaggio al gruppo del torneo
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_message_to_clients',
                    'message': message
                }
            )
            logger.info(f"Slot status update sent for rounds: {all_slots_status}")
        except Exception as e:
            logger.error(f"Error in send_slot_status_update_to_group: {e}")



    async def send_ready_status_update_to_group(self):
        """
        Invia l'aggiornamento dello stato 'ready' del round corrente a tutti i client connessi.
        """
        if not self.current_round:
            logger.error("Current round not found.")
            return

        ready_statuses = self.current_round.ready_status
        slots_status = self.current_round.slots 

        logger.info(f"Sending ready status update. Slots: {slots_status}, Ready status: {ready_statuses}")

        message = {
            'type': 'update_ready_status',
            'ready_status': ready_statuses,
            'slots': slots_status
        }
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': message
            }
        )
        logger.info(f"Ready status update sent to group: {ready_statuses}")

    async def send_lobby_update(self):
        """
        Manda la lista aggiornata degli utenti nella lobby insieme allo stato ready.
        """
        try:
            user_list = await self.get_user_list()
            slots = self.current_round.slots

            # Invia l'aggiornamento a tutti i client connessi alla lobby
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_lobby',
                    'user_list': user_list,  # Lista degli utenti con stato ready
                    'slots': slots, 
                    'ready_status': self.current_round.ready_status  # Includi lo stato ready
                }
            )
        except Exception as e:
            logger.error(f"Error sending lobby update: {e}")


    async def update_lobby(self, event):
        """
        Aggiorna la lobby con i dati ricevuti.
        """
        user_list = event['user_list']
        slots = event['slots']
        ready_status = event['ready_status']
        try:
            await self.send(text_data=json.dumps({
                'type': 'update_lobby',
                'user_list': user_list,
                'slots': slots,
                'ready_status': ready_status
            }))
        except Exception as e:
            logger.error(f"Error updating lobby: {e}")

    async def send_message_to_clients(self, event):
        """
        Invia i messaggi a tutti i client connessi.
        """
        message = event['message']
        try:
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to clients: {e}")

    async def manage_chat(self, message, username):
        """
        Gestisce i messaggi di chat nella lobby.
        """
        try:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_message_to_clients',
                    'message': {
                        'type': 'chat_message',
                        'message': message,
                        'username': username
                    }
                }
            )
            logger.info(f"Chat message sent by {username}: {message}")
        except Exception as e:
            logger.error(f"Error sending chat message: {e}")

    async def manage_team(self, action, team, username):
        """
        Gestisce le azioni di join e leave dei team.
        """
        try:
            message = {
                'type': 'update_team',
                'team': team,
                'username': username,
                'action': action
            }
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'send_message_to_clients',
                'message': message
            })
        except Exception as e:
            logger.error(f"Error managing team: {e}")

    async def add_user_to_lobby(self):
        """
        Aggiunge l'utente alla lobby tramite WebSocket, ma l'aggiunta al torneo è gestita tramite APIView.
        Questa funzione aggiorna solo lo stato della lobby.
        """
        try:
            # Recupera l'utente dalla funzione get_user
            user = await self.get_user()
            if not user:
                logger.error("User not found, cannot update lobby")
                return

            tournament = await self.get_tournament()
            if not tournament:
                logger.error(f"Tournament {self.tournament_id} does not exist.")
                return

            logger.info(f"User {user.username} joined lobby via WebSocket.")
            
            # # Aggiorna lo stato della lobby e invia gli aggiornamenti sugli slot
            # await self.send_lobby_update()
            # await self.send_slot_status_update_to_group()
            
        except Exception as e:
            logger.error(f"Error updating lobby: {e}")



    async def remove_user_from_lobby(self):
        """
        Rimuove l'utente dalla lobby e aggiorna lo stato degli slot se l'utente occupava uno slot.
        Permette la rimozione solo se il torneo non è ancora iniziato (status = 'not_started').
        Se il torneo è già iniziato, rimuove solo lo stato 'ready' e aggiorna la lobby.
        """
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
            user = self.user

            # Controlla lo stato del torneo
            if tournament.status == 'not_started':
                # Verifica se l'utente occupava uno slot
                if self.current_round:
                    slot_to_release = None
                    for slot, slot_data in self.current_round.slots.items():
                        if slot_data['username'] == user.username:
                            slot_to_release = slot
                            break

                    # Se l'utente occupava uno slot, resettiamo l'eventuale ready
                    if slot_to_release:
                        await self.update_ready_status_in_round(slot_to_release, False)
                        await self.send_ready_status_update_to_group()

                # Invia l'aggiornamento della lobby per aggiornare il ready nella lista utenti
                await self.send_lobby_update()
                logger.info(f"Players in lobby before removal: {tournament.players_in_lobby}")

                # Rimuovi l'utente dalla lobby solo se esiste nel torneo
                if await database_sync_to_async(tournament.players.filter(id=user.id).exists)():
                    await database_sync_to_async(tournament.players.remove)(user)
                    tournament.players_in_lobby -= 1
                    await database_sync_to_async(tournament.save)()

                    logger.info(f"User {user.username} removed from tournament and lobby.")
            
            else:
                # Torneo già iniziato: rimuovi solo lo stato ready e aggiorna la lobby
                if self.current_round:
                    slot_to_release = None
                    for slot, slot_data in self.current_round.slots.items():
                        if slot_data['username'] == user.username:
                            slot_to_release = slot
                            break

                    # Rimuovi lo stato ready dallo slot, ma non il giocatore
                    if slot_to_release:
                        await self.update_ready_status_in_round(slot_to_release, False)
                        await self.send_ready_status_update_to_group()

                    logger.info(f"User {user.username} removed from lobby, but still in the tournament.")
            
            # Invia aggiornamento della lobby
            await self.send_lobby_update()

        except Exception as e:
            logger.error(f"Error removing user from lobby: {e}")



    @database_sync_to_async
    def get_user(self):
        """
        Recupera l'utente corrente dal database.
        """
        try:
            query_string = self.scope['query_string'].decode()
            query_params = dict(urllib.parse.parse_qsl(query_string))
            user_id = query_params.get('id', None)
            if user_id:
                return User.objects.get(id=user_id)
            return None
        except User.DoesNotExist:
            return None

    @database_sync_to_async
    def get_user_list(self):
        """
        Recupera la lista degli utenti presenti nella lobby.
        """
        logger.info(f"Attempting to retrieve user list for tournament_id: {self.tournament_id}")
        try:
            tournament = Tournament.objects.prefetch_related('players').get(id=self.tournament_id)
            users = tournament.players.all()
            user_list = [{'username': user.username} for user in users]
            logger.info(f"User list: {user_list}")
            return user_list
        except Tournament.DoesNotExist:
            logger.error(f"Tournament with id {self.tournament_id} does not exist.")
            return []  # Se il torneo non esiste, restituisce una lista vuota
        except Exception as e:
            logger.error(f"Error getting user list: {e}")
            return []

    @database_sync_to_async
    def get_tournament(self):
        """
        Recupera il torneo corrente dal database.
        """
        try:
            return Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            return None

    async def get_current_round(self):
        """
        Recupera il round corrente basato sul torneo.
        """
        try:
            # Recupera il round non iniziato
            current_round = await database_sync_to_async(Round.objects.filter(
                tournament=self.tournament, status='not_started'
            ).first)()

            if current_round:
                return current_round

            # Se non ci sono round 'not_started', restituisce l'ultimo round
            total_rounds = self.tournament.rounds  # Numero totale di round
            final_round = await database_sync_to_async(Round.objects.filter(
                tournament=self.tournament, round_number=total_rounds
            ).first)()

            if final_round:
                logger.info(f"No 'not_started' rounds found. Returning final round {final_round.round_number}.")
                return final_round
            else:
                logger.warning("No valid rounds found. Tournament may be in an invalid state.")
                return None

        except Exception as e:
            logger.error(f"Error retrieving current round: {e}")
            return None


    async def send_message_to_client(self, event):
        """
        Metodo per inviare il messaggio al client specifico.
        """
        message = event['message']
        await self.send(text_data=json.dumps(message))


    async def start_tournament_flow(self):
        """
        Gestisce la preparazione del torneo e l'inizio del round con un countdown sincronizzato.
        """
        logger.info("Starting tournament flow...")

        # Ottieni il torneo e imposta lo stato su 'waiting_for_matches'
        tournament = await self.get_tournament()
        if not tournament:
            logger.error(f"Tournament {self.tournament_id} does not exist.")
            return

        logger.info(f"Tournament {tournament.name} found with status {tournament.status}.")
        tournament.status = 'waiting_for_matches'
        await database_sync_to_async(tournament.save)()
        logger.info(f"Tournament status updated to 'waiting_for_matches'.")

        # Blocca gli slot del round
        round = await self.get_current_round()
        if not round:
            logger.error("Current round not found.")
            return
        
        # Log dettagliati per verificare gli slot
        logger.debug(f"Round {round.round_number} retrieved with slots: {round.slots}")

        # Blocca gli slot del round
        slots = round.slots
        for slot_key, slot_data in slots.items():
            logger.debug(f"Processing slot {slot_key}: {slot_data}")
            if slot_data['username'] != 'empty':
                slot_data['locked'] = True
            else:
                logger.warning(f"Slot {slot_key} is empty and will not be locked.")

        # Aggiorna gli slot nel round
        round.slots = slots
        await database_sync_to_async(round.save)()
        logger.info(f"Slots updated and locked: {round.round_number} retrieved with slots: {round.slots}")

        # Invia il messaggio di blocco degli slot a tutti i client
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': {
                    'type': 'block_slots',
                    'message': 'Slots are now locked, preparing the tournament...'
                }
            }
        )
        # Aspetta il messaggio dal client per confermare la fine del countdown
        logger.info("Waiting for countdown to complete on client side...")


    async def notify_players_to_join(self):
        """
        Invia una notifica a ciascun giocatore per unirsi al game in base agli slot assegnati
        e assegna i giocatori ai campi del game.
        """
        try:
            round = await self.get_current_round()
            if not round:
                logger.error("Current round not found.")
                return

            logger.info(f"Notifying players for round {round.round_number}.")

            # Recupera tutti i game associati al round in modo asincrono
            games = await database_sync_to_async(list)(round.games.all())
            logger.debug(f"Games in round {round.round_number}: {[game.name for game in games]}")

            # Ottieni gli slot
            slots = list(round.slots.items())  # Converti in lista ordinata
            players_per_game = len(slots) // len(games) if games else 0

            if players_per_game == 0:
                logger.error("No players per game could be calculated. Check the number of slots and games.")
                return

            max_attempts = 5  # Numero massimo di tentativi per l'assegnazione
            for attempt in range(max_attempts):
                all_games_assigned = True  # Verifica se tutti i giochi sono stati completati
                for idx, game in enumerate(games):
                    # Calcola gli indici degli slot per questo game
                    start_idx = idx * players_per_game
                    end_idx = start_idx + players_per_game
                    game_slots = slots[start_idx:end_idx]

                    logger.debug(f"Assigning slots {start_idx} to {end_idx} for game {game.name}.")

                    # Assegna i giocatori ai campi del game in base agli slot
                    for player_idx, (slot, slot_data) in enumerate(game_slots):
                        player_id = slot_data.get('player_id')
                        username = slot_data.get('username')

                        # Log per ispezionare ogni slot e i suoi contenuti
                        logger.debug(f"Slot {slot}: player_id={player_id}, username={username}")

                        if player_id:
                            try:
                                # Recupera il giocatore tramite il player_id
                                player = await database_sync_to_async(User.objects.get)(id=player_id)

                                # Assegna il giocatore al campo corretto del game
                                if player_idx == 0:
                                    game.player1 = player
                                elif player_idx == 1:
                                    game.player2 = player
                                elif player_idx == 2 and game.mode != '1v1':
                                    game.player3 = player
                                elif player_idx == 3 and game.mode != '1v1':
                                    game.player4 = player

                                logger.debug(f"Assigned {player.username} to game {game.name} (ID: {game.id}) as player{player_idx + 1}")
                            except User.DoesNotExist:
                                logger.error(f"Player with ID {player_id} not found for slot {slot}.")
                                all_games_assigned = False
                        else:
                            logger.error(f"No player assigned to slot {slot}. Skipping this slot.")
                            all_games_assigned = False

                if all_games_assigned:
                    # Se tutti i giochi sono stati completati, termina il loop
                    break
                else:
                    logger.warning(f"Attempt {attempt + 1}/{max_attempts} failed to assign all players. Retrying...")
                    await asyncio.sleep(1)

            if not all_games_assigned:
                logger.error("Failed to assign all players to games after maximum attempts.")
                return

            # Salva tutti i giochi
            for game in games:
                await database_sync_to_async(game.save)()
                logger.debug(f"Game {game.name} saved with players.")

            # Invia notifiche ai giocatori
            for idx, game in enumerate(games):
                for player_idx in range(players_per_game):
                    player = getattr(game, f"player{player_idx + 1}", None)
                    if player:
                        message = {
                            'type': 'join_game_notification',
                            'slot': f"{idx * players_per_game + player_idx + 1}",
                            'username': player.username,
                            'game_link': f'/api/game/{game.id}/'  # Link per joinare il game
                        }
                        await self.channel_layer.group_send(
                            f"user_{player.username}",
                            {
                                'type': 'send_message_to_client',
                                'message': message
                            }
                        )
                        logger.debug(f"Notification sent to {player.username} for game {game.name}.")

            logger.info("Notifications sent to all players to join the game.")
        except Exception as e:
            logger.error(f"Error sending notifications to join game: {e}")


    async def prepare_next_round(self):
        """
        Prepara il prossimo round
        """
        # Controlla se esiste già un round successivo
        next_round_number = (self.current_round.round_number + 1)
        next_round_exists = await database_sync_to_async(Round.objects.filter(
            tournament=self.tournament, round_number=next_round_number).exists)()

        if next_round_exists:
            logger.info(f"Round {next_round_number} already exists. Skipping round generation.")
            return

        # Genera il prossimo round
        message = await database_sync_to_async(self.tournament.generate_next_round)()
        logger.info(message)


    # DA CONTROLLARE BENE

    async def check_current_round_games(self):
        """
        Controlla lo stato dei game del round corrente, aggiorna gli slot del round successivo
        (se esiste) e aggiorna lo stato del round se necessario. Gestisce anche il round finale.
        """
        if not self.current_round:
            logger.warning("No current round found to check games.")
            return

        logger.info(f"Checking games for round {self.current_round.round_number}.")

        # Recupera i game del round corrente
        games = await database_sync_to_async(list)(
            self.current_round.games.select_related('winner').all()
        )
        if not games:
            logger.warning(f"No games found for round {self.current_round.round_number}.")
            return

        # Recupera il round successivo
        next_round_number = self.current_round.round_number + 1
        next_round = await database_sync_to_async(
            Round.objects.filter(tournament=self.tournament, round_number=next_round_number).first
        )()
        is_final_round = not next_round  # Se non c'è un round successivo, siamo alla finale

        if is_final_round:
            logger.info(f"Final round detected: round {self.current_round.round_number}.")

        all_finished = True  # Assume che tutti i game siano finiti
        updated_slots = {}  # Per aggiornare gli slot del round successivo
        tournament_winner = None  # Per il vincitore del torneo, se siamo alla finale

        # Aggiorna gli slot del round successivo per ogni game finito
        if next_round:
            # Recupera gli slot correnti del next_round
            slots = await database_sync_to_async(lambda: next_round.slots)()

            for idx, game in enumerate(games):
                logger.info(f"Processing game {game.name}, status: {game.status}")
                slot_key = str(idx + 1)

                if game.status == 'finished':
                    winner = game.winner

                    if not winner:
                        logger.warning(f"Game {game.name} has no winner. Skipping slot update.")
                        continue

                    logger.info(f"Game {game.name} finished. Assigning winner {winner.username} to slot {slot_key}.")
                    slots[slot_key] = {'player_id': winner.id, 'username': winner.username}
                else:
                    all_finished = False

            # Salva gli slot aggiornati
            next_round.slots = slots
            await database_sync_to_async(next_round.save)()
            updated_slots = slots
            logger.info(f"Next round slots updated: {slots}.")

        # Se siamo alla finale, gestisci il vincitore del torneo
        if is_final_round:
            logger.info(f"#####Final round")
            if len(games) == 1:  # Ci aspettiamo un solo game nella finale
                logger.info(f"#####Final round  2")
                final_game = games[0]
                logger.info(f"#####Final round game: {games[0]}")
                if final_game.status == 'finished' and final_game.winner:
                    tournament_winner = final_game.winner
                    logger.info(f"Final game finished. Tournament winner: {tournament_winner.username}.")
                    await self.handle_tournament_end(tournament_winner)
                    return
                else:
                    logger.warning("Final game is not finished or has no winner.")
                    logger.debug(f"Final game status: {final_game.status}")
                    logger.debug(f"Final game winner: {final_game.winner}")

            else:
                logger.error("Unexpected number of games in final round. Check tournament configuration.")

        # Notifica i client con gli slot aggiornati
        if next_round and updated_slots:
            logger.info(f"Notifying clients with updated slots: {updated_slots}.")
            await self.notify_clients_of_slot_updates(next_round_number, updated_slots)

        # Marca il round come completato se tutti i game sono finiti
        if all_finished:
            logger.info(f"All games in round {self.current_round.round_number} are finished. Marking round as finished.")
            await self.mark_round_as_finished()
        else:
            logger.info(f"Not all games in round {self.current_round.round_number} are finished. Waiting for completion.")





    async def update_next_round_slot(self, next_round, slot_key, winner):
        """
        Aggiorna lo slot del round successivo con i dati del vincitore.
        """
        next_round.slots[slot_key] = {'player_id': winner.id, 'username': winner.username}
        await database_sync_to_async(next_round.save)()
        logger.info(f"Updated slot {slot_key} in round {next_round.round_number} with winner {winner.username}.")



    async def notify_clients_of_slot_updates(self, next_round_number, updated_slots):
        """
        Notifica i client con tutti gli slot aggiornati del prossimo round.
        """
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': {
                    'type': 'update_next_round_slots',
                    'round_number': next_round_number,
                    'slots': updated_slots
                }
            }
        )
        logger.info(f"Notified clients of updated slots for round {next_round_number}: {updated_slots}.")



    async def mark_round_as_finished(self):
        """
        Marca il round corrente come 'finished' e aggiorna lo stato del torneo.
        """
        self.current_round.status = 'finished'
        await database_sync_to_async(self.current_round.save)()
        logger.info(f"Round {self.current_round.round_number} marked as finished.")

        # Aggiorna il round corrente al prossimo round
        self.current_round = await self.get_current_round()

        # Aggiorna lo stato del torneo
        self.tournament.status = 'preparing_next_round'
        await database_sync_to_async(self.tournament.save)()
        logger.info(f"Tournament status updated to 'preparing_next_round'.")


    async def handle_tournament_end(self, tournament_winner):
        """
        Gestisce la fine del torneo, aggiornando lo stato e notificando i client.
        """
        self.tournament.status = 'finished'
        self.tournament.winner = tournament_winner
        await database_sync_to_async(self.tournament.save)()
        logger.info(f"Tournament {self.tournament.name} marked as finished with winner: {tournament_winner.username if tournament_winner else 'None'}.")


    async def notify_tournament_end(self, tournament_name, tournament_winner):
        """
        Prepara e invia un messaggio ai client per notificare la fine del torneo.
        """
        message = {
            'type': 'tournament_finished',
            'message': f"The tournament '{tournament_name}' has concluded!",
            'winner': {
                'username': tournament_winner.username if tournament_winner else None,
                'player_id': tournament_winner.id if tournament_winner else None,
            } if tournament_winner else None
        }

        # Notifica i client tramite WebSocket
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': message
            }
        )
        logger.info(f"Notified clients of tournament conclusion with winner: {tournament_winner.username if tournament_winner else 'None'}.")

