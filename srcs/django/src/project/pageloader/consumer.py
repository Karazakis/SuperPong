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
from asgiref.sync import sync_to_async
from django.db.models import F
logger = logging.getLogger(__name__)

user_channel_mapping = {}

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_string = parse_qs(self.scope['query_string'].decode())
        id = query_string.get('id', [''])[0]

        if not id:
            await self.close() 
            return

        self.id = id

        self.room_name = 'chat_room'
        self.room_group_name = 'chat_room'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        global user_channel_mapping
        user_channel_mapping[self.id] = self.channel_name
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        global user_channel_mapping
        if self.id in user_channel_mapping:
            del user_channel_mapping[self.id]
        await self.send_user_list()

    async def receive(self, text_data):
        logger.info(f'Received message: {text_data}')
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
        user_list = list(user_channel_mapping.keys())

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
        message = event['message']
        await self.send(text_data=json.dumps(message))
    
    async def dashboard_chat(self, message, username):
        user = await sync_to_async(User.objects.get)(username=username)
        profile = await sync_to_async(UserProfile.objects.get)(user=user)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'username':username,
                    'nickname': profile.nickname,
                    'message': message
                }
            }
        )

    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'message',
            'player': message['username'],
            'nickname': message['nickname'],
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
            logger.info(f'Sending request to {recipient}')
            if recipient_channel:
                targetLobby = data.get('target_lobby')
                if targetLobby:
                    await self.channel_layer.send(recipient_channel, {
                        'type': 'pending_request',
                        'message': {
                            'request': data.get('pending_request'),
                            'target_user': data.get('target_user'),
                            'requesting_user': data.get('requesting_user'),
                            'request_type': data.get('type'),
                            'target_lobby': data.get('target_lobby'),
                        }
                    })
                else:
                    logger.warning("Invalid target_lobby value: Not numeric")
                    await self.channel_layer.send(recipient_channel, {
                        'type': 'pending_request',
                        'message': {
                            'request': data.get('pending_request'),
                            'target_user': data.get('target_user'),
                            'requesting_user': data.get('requesting_user'),
                            'request_type': data.get('type'),
                        }
                    })

            else:
                print('User not found')
        elif data['pending_request'] == 'accept':
            recipient = data['target_user']
            logger.info(f'Accepting request from {data}')
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
        logger.info(f'Pending request:asdasdasdzxccx<<<< {message}')
        if message['request_type'] != 'friend':
            await self.send(text_data=json.dumps({
                'type': 'pending_request',
                'request': message['request'],
                'target_user': message['target_user'],
                'requesting_user': message['requesting_user'],
                'request_type': message['request_type'],
                'target_lobby': message['target_lobby'],
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'pending_request',
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
                await self.start_game()
        elif action == 'start_game_host':
            await self.start_game_db()
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
        elif action == 'delete':
            await self.delete_game()

    async def delete_game(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'handle_delete',
            }
        )

    async def handle_delete(self, event):
        await self.send(text_data=json.dumps({
            'action': 'delete'
        }))

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
        userprofile = await self.get_user_profile(username)
        await self.send(text_data=json.dumps({
            'action': 'connected',
            'username': username,
            'nickname': userprofile.nickname
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
    def get_user_profile(self, username):
        user = User.objects.get(username=username)
        return UserProfile.objects.get(user=user)

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
        player1 = UserProfile.objects.get(user=game.player1) if game.player1 else None
        player2 = UserProfile.objects.get(user=game.player2) if game.player2 else None
        return [
            {
                'slot': 'player1',
                'nickname': player1.nickname if player1 else 'Empty',
                'player': game.player1.username if game.player1 else 'Empty',
                'team': 'team1' if game.player1 in game.team1.all() else ('team2' if game.player1 in game.team2.all() else 'none')
            },
            {
                'slot': 'player2',
                'nickname': player2.nickname if player2 else 'Empty',
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

        username = self.scope['user'].username if self.scope['user'].is_authenticated else "Anonymous"
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_status',
                'action': 'player_rejoin',
                'username': username
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        username = self.scope['user'].username if self.scope['user'].is_authenticated else "Anonymous"
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_status',
                'action': 'player_leave',
                'username': username
            }
        )

    async def player_status(self, event):
        await self.send(text_data=json.dumps({
            'action': event['action'],
            'username': event['username']
        }))

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
        elif action == 'start_game':
            await self.game_start()
        elif action == 'time_update':
            await self.time_update(data.get('time'))
            await self.time_update_db(data.get('time'))
        elif action == 'score_update':
            await self.score_update(data.get('score'))
            await self.score_update_db(data.get('score'))
        elif action == 'leave':
            await self.leave_game(username)
        elif action == 'join':
            await self.join_game(username)

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

    @database_sync_to_async
    def time_update_db(self, time):
        game = Game.objects.get(id=self.game_id)
        if ((time <= 0 and game.time_left > 1) or time < 0):
            return
        game.time_left = time
        game.save()

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
    
    @database_sync_to_async
    def score_update_db(self, score):
        game = Game.objects.get(id=self.game_id)
        game.player1_score = score['p1']
        game.player2_score = score['p2']
        game.save()

    async def leave_game(self, username):
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

    async def join_game(self, username):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'handle_join',
                'action': 'join',
                'username': username
            }
        )
    
    async def handle_join(self, event):
        username = event['username']
        await self.send(text_data=json.dumps({
            'action': 'join',
            'username': username
        }))
    



class TournamentConsumer(AsyncWebsocketConsumer):
    users_in_lobby = {}
    processed_tournaments = set()
    pending_players = {}
    player_assignments = {}

    async def connect(self):
        self.tournament_id = self.scope['url_route']['kwargs']['game_id']
        self.room_group_name = f'tournament_{self.tournament_id}'
        logger.info(f"Connecting to tournament room: {self.room_group_name} with tournament_id: {self.tournament_id}")

        if self.tournament_id not in TournamentConsumer.users_in_lobby:
            TournamentConsumer.users_in_lobby[self.tournament_id] = set()
            TournamentConsumer.pending_players[self.tournament_id] = set()

        self.user = await self.get_user()
        if not self.user:
            logger.warning("User not found. Closing connection.")
            await self.close()
            return

        logger.info(f"User {self.user.username} connected successfully.")
        self.tournament = await self.get_tournament()
        self.current_round = await self.get_current_round()

        TournamentConsumer.users_in_lobby[self.tournament_id].add(self.user.username)

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.channel_layer.group_add(f"user_{self.user.username}", self.channel_name)
        await self.accept()
        logger.info("Connection accepted.")


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
            tournament_winner = await sync_to_async(lambda: self.tournament.winner, thread_sensitive=False)()
            await self.update_user_profiles(tournament_winner)
            await self.notify_tournament_end(self.tournament.name, tournament_winner)
            logger.info(f"Notified client of tournament conclusion during connect for tournament: {self.tournament.name}.")


        if self.tournament.status == 'notifying_players':
            logger.info("Tournament is in notifying players state. Restarting notifications.")
            await self.resend_notifications(self.tournament_id)


    async def disconnect(self, close_code):
        logger.info(f"Disconnecting from tournament room: {self.room_group_name} with close code: {close_code}")
        userleft = getattr(self, 'user_left', False)
        logger.info(f"++++++++++++++++++User left: {userleft}")
        if userleft == True:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            return
        else:
            logger.info("User left is False. Performing cleanup. pippinino")
            await self.handle_disconnect_cleanup()


    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        logger.info(f"Received message: {data}")

        try:
            if action in ['assign_slot', 'release_slot']:
                await self.manage_slot_status(data)
            
            elif action == 'player_ready':
                await self.manage_ready_status(data)

            elif action == 'chat_message':
                await self.manage_chat(data['message'], data['username'])
            
            elif action in ['join_team', 'leave_team']:
                await self.manage_team(action, data['team'], data['username'])

            elif action == 'join':
                await self.add_user_to_lobby()
                await self.send_lobby_update()
                await self.send_slot_status_update_to_group()
                if self.tournament.status == 'notifying_players':
                    logger.info("NEGRISTI Tournament is in notifying players state. Restarting notifications.")
                    await self.resend_notifications(self.tournament_id)

            elif action == 'player_joined_game':
                username = data.get('username')
                if username:
                    self.user_left = True
                    await self.handle_player_joined_game(username)
                else:
                    logger.warning("Player joined game action received without a username.")

            elif action == 'leave':
                users_in_lobby = TournamentConsumer.users_in_lobby.get(self.tournament_id, set())
                pending_players = TournamentConsumer.pending_players.get(self.tournament_id, set())
                if self.user.username in users_in_lobby:
                    users_in_lobby.remove(self.user.username)
                    logger.info(f"User {self.user.username} removed from lobby {self.tournament_id}. Current lobby: {users_in_lobby}")

                await self.remove_user_from_lobby()
                self.user_left = True
                await self.send(text_data=json.dumps({
                    'type': 'leave_confirmation'
                }))

            elif action == 'start_tournament_preparation':
                tournament = await self.get_tournament()
                if not tournament:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Tournament not found.'
                    }))
                    return
                
                if tournament.status == 'finished':
                    await self.send(text_data=json.dumps({
                        'type': 'tournament_status',
                        'status': 'finished',
                        'message': 'The tournament has already finished. Cannot start.'
                    }))
                    return
                
                current_round = await self.get_current_round()
                ready_status = current_round.ready_status
                if not all(ready_status.values()):
                    return
                
                await self.start_tournament_flow()
                

            elif action == 'countdown_complete':
                await self.reset_ready_statuses()
                await self.notify_players_to_join()
                tournament = await self.get_tournament()
                tournament.status = 'notifying_players'
                await database_sync_to_async(tournament.save)()

        except Exception as e:
            logger.error(f"Error processing receive message: {e}")


    async def handle_player_joined_game(self, username):
            try:
                logger.info("Entered handle_player_joined_game.")
                logger.info(f"Received username: {username}")

                if self.tournament_id not in TournamentConsumer.pending_players:
                    TournamentConsumer.pending_players[self.tournament_id] = set()

                if username not in TournamentConsumer.pending_players[self.tournament_id]:
                    TournamentConsumer.pending_players[self.tournament_id].add(username)
                    logger.info(f"Player {username} added to pending_players for tournament {self.tournament_id}. Current: {TournamentConsumer.pending_players[self.tournament_id]}")
                else:
                    logger.warning(f"Player {username} is already in pending_players for tournament {self.tournament_id}.")

                current_round = await self.get_current_round()
                if not current_round:
                    logger.error("No current round found.")
                    return

                all_players_ready = True
                for slot, slot_data in current_round.slots.items():
                    slot_username = slot_data.get('username')
                    if slot_username and slot_username not in TournamentConsumer.pending_players[self.tournament_id]:
                        all_players_ready = False
                        break

                if all_players_ready:
                    tournament = await self.get_tournament()
                    tournament.status = 'waiting_for_matches'
                    await database_sync_to_async(tournament.save)()
                    logger.info(f"All players are ready. Tournament {self.tournament_id} status updated to 'waiting_for_matches'.")
                    TournamentConsumer.pending_players[self.tournament_id].clear()
                    logger.info(f"Pending players for tournament {self.tournament_id} have been reset.")

            except Exception as e:
                logger.error(f"Error handling player joined game: {e}")



    async def handle_disconnect_cleanup(self):
        try:
            self.user = await self.get_user()
            if not self.user:
                logger.warning("User not found during disconnect cleanup. Skipping cleanup.")
                return

            current_round = await self.get_current_round()

            authorized = 'true'
            if current_round:
                for slot, slot_data in current_round.slots.items():
                    if slot_data.get('username') == self.user.username:
                        authorized = 'false'
                        break
                if authorized == 'false':
                    ready_statuses = current_round.ready_status
                    for slot in ready_statuses:
                        ready_statuses[slot] = False

                    current_round.ready_status = ready_statuses
                    await database_sync_to_async(current_round.save)()

                logger.info(f"All players' ready statuses reset in round {current_round.round_number}.")

            await self.send_lobby_update()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_message_to_clients',
                    'message': {
                        'type': 'disconnected',
                        'authorized': authorized
                    }
                }
            )

            logger.info(f"User {self.user.username} disconnected. Authorized: {authorized}")

        except Exception as e:
            logger.error(f"Error during disconnect cleanup: {e}")

    async def reset_ready_statuses(self):
        try:
            current_round = await self.get_current_round()
            if not current_round:
                logger.error("Current round not found. Cannot reset ready statuses.")
                return

            ready_statuses = {slot: False for slot in current_round.ready_status}
            current_round.ready_status = ready_statuses

            await database_sync_to_async(current_round.save)()
            logger.info("All ready statuses have been reset to 'false'.")

            await self.send_ready_status_update_to_group(custom_message_type='reset_ready_statuses')
            logger.info("Ready status reset update sent to group.")
        except Exception as e:
            logger.error(f"Error resetting ready statuses: {e}")

    async def manage_slot_status(self, data):
        action = data['action']
        slot = data.get('slot')
        username = data.get('username')

        logger.info(f"Action received: {action}, Slot: {slot}, Username: {username}")

        user_slot = next((s for s, info in self.current_round.slots.items() if info['username'] == username), None)
        if user_slot:
            logger.warning(f"User {username} already has an assigned slot: {user_slot}. Slot change denied.")
            return

        await self.update_slot_status_in_round(slot, username if action == 'assign_slot' else None)

        logger.info(f"Slot status updated successfully for action: {action} on slot: {slot}")

        await self.send_slot_status_update_to_group()


    # async def manage_ready_status(self, data):
    #     slot = data.get('slot')
    #     username = data.get('username')
    #     ready_status = data.get('status', False)

    #     logger.info(f"Ready status received: Slot {slot}, Username: {username}, Ready Status: {ready_status}")

    #     current_round = await self.get_current_round()
    #     if not current_round:
    #         logger.error("Current round not found.")
    #         return

    #     current_slot_user = current_round.slots.get(str(slot), {}).get('username')

    #     if current_slot_user == username:
    #         current_status = self.current_round.ready_status.get(str(slot), False)
    #         if current_status == (ready_status == 'ready'):
    #             logger.warning(f"User {username} is already marked as ready: {current_status}. Status change denied.")
    #             return

    #         await self.update_ready_status_in_round(slot, ready_status == 'ready')
    #         await self.send_ready_status_update_to_group()
    #     else:
    #         logger.warning(f"User {username} is not authorized to change the ready status for slot {slot}")

    async def manage_ready_status(self, data):
        slot = data.get('slot')
        user_id = data.get('userId')  # Recupera il userId dal messaggio
        ready_status = data.get('status', False)

        logger.info(f"Ready status received: Slot {slot}, UserID: {user_id}, Ready Status: {ready_status}")

        # Recupera il round corrente
        current_round = await self.get_current_round()
        if not current_round:
            logger.error("Current round not found.")
            return

        # Verifica il player_id associato allo slot
        current_slot_user_id = current_round.slots.get(str(slot), {}).get('player_id')
        logger.info(f"Current player ID in slot {slot}: {current_slot_user_id}, USERID: {user_id}")

        if int(current_slot_user_id) == int(user_id):
            logger.info(f"DIOCANISSIMO")
            current_status = self.current_round.ready_status.get(str(slot), False)
            if current_status == ready_status:
                logger.warning(f"UserID {user_id} is already marked as ready: {current_status}. Status change denied.")
                return
            logger.info(f"DIOCANISSIMO2222")
            # Aggiorna lo stato "ready" per il round
            await self.update_ready_status_in_round(slot, ready_status)
            logger.info(f"Ready status updated for UserID {user_id} in Slot {slot}.")
            await self.send_ready_status_update_to_group()
        else:
            logger.warning(f"UserID {user_id} is not authorized to change the ready status for Slot {slot}")




    async def update_slot_status_in_round(self, slot, username, player_id=None):
        try:
            await database_sync_to_async(self.current_round.refresh_from_db)()
            slots = self.current_round.slots
            logger.info(f"Current slot status for round.slots {slots}")
            
            player_id = self.user.id if self.user else None
            logger.info(f"Current slot status for all slots {slots}")

            if slots[str(slot)]['username'] != 'empty' and slots[str(slot)]['username'] != username:
                logger.warning(f"Slot {slot} is already occupied by {slots[str(slot)]['username']}. Cannot reassign.")
                return
            
            if username:
                slots[str(slot)]['username'] = username
                slots[str(slot)]['player_id'] = player_id
                self.current_round.ready_status[str(slot)] = False
            else:
                slots[str(slot)] = {'username': 'empty', 'player_id': None}
                self.current_round.ready_status[str(slot)] = False

            self.current_round.slots = slots
            await database_sync_to_async(self.current_round.save)()
            logger.info(f"Slot status in round DB updated: {slots}")
        except Exception as e:
            logger.error(f"Error updating slot status in round DB: {e}")


    async def update_ready_status_in_round(self, slot, ready_status):
        try:
            current_round = await self.get_current_round()
            if not current_round:
                logger.error("Current round not found.")
                return

            ready_statuses = current_round.ready_status

            if str(slot) in ready_statuses:
                ready_statuses[str(slot)] = ready_status
            else:
                logger.warning(f"Slot {slot} not found in current round ready statuses.")

            current_round.ready_status = ready_statuses
            await database_sync_to_async(current_round.save)()
            logger.info(f"Ready status saved successfully in the current round database.")

        except Exception as e:
            logger.error(f"Error setting ready status in round DB: {e}")



    async def send_slot_status_update_to_group(self):
        try:
            logger.info(f"Current round: {self.current_round.round_number if self.current_round else 'None'}")

            rounds = await database_sync_to_async(
                list
            )(Round.objects.filter(
                tournament=self.tournament, 
                round_number__lte=self.current_round.round_number
            ).order_by('round_number'))

            if not rounds:
                logger.error("No rounds found up to the current round.")
                return

            next_round = None
            if self.current_round.round_number < self.tournament.rounds:
                next_round = await database_sync_to_async(
                    Round.objects.filter(
                        tournament=self.tournament,
                        round_number=self.current_round.round_number + 1
                    ).first
                )()

            round_numbers = [round_obj.round_number for round_obj in rounds]
            if next_round:
                round_numbers.append(next_round.round_number)
            logger.info(f"Rounds included in update: {round_numbers}")

            all_slots_status = {}
            for round_obj in rounds:
                all_slots_status[f'round_{round_obj.round_number}'] = round_obj.slots

            if next_round:
                all_slots_status[f'round_{next_round.round_number}'] = next_round.slots

            message = {
                'type': 'update_all_slots',
                'slots': all_slots_status
            }

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



    async def send_ready_status_update_to_group(self, custom_message_type='update_ready_status'):
        try:
            current_round = await self.get_current_round()
            if not current_round:
                logger.error("Current round not found.")
                return

            ready_statuses = current_round.ready_status
            slots_status = current_round.slots

            logger.info(f"Sending ready status update. Slots: {slots_status}, Ready status: {ready_statuses}")

            message = {
                'type': custom_message_type,
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
        except Exception as e:
            logger.error(f"Error in send_ready_status_update_to_group: {e}")


    async def send_lobby_update(self):
        try:            
            user_list = await self.get_user_list()
            users_in_lobby = TournamentConsumer.users_in_lobby.get(self.tournament_id, set())

            users_in_lobby_details = [
                user for user in user_list if user['username'] in users_in_lobby
            ]

            slots = self.current_round.slots
            ready_status = self.current_round.ready_status

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'update_lobby',
                    'user_list': users_in_lobby_details,
                    'slots': slots,
                    'ready_status': ready_status
                }
            )
            logger.info(f"Lobby update sent for tournament {self.tournament_id}.")
        except Exception as e:
            logger.error(f"Error sending lobby update for tournament {self.tournament_id}: {e}")



    async def update_lobby(self, event):
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
        message = event['message']
        try:
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending message to clients: {e}")

    async def manage_chat(self, message, username):
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


    async def add_user_to_lobby(self):
        try:
            user = await self.get_user()
            if not user:
                logger.error("User not found, cannot update lobby")
                return

            tournament = await self.get_tournament()
            if not tournament:
                logger.error(f"Tournament {self.tournament_id} does not exist.")
                return

            logger.info(f"User {user.username} joined lobby via WebSocket.")
            
        except Exception as e:
            logger.error(f"Error updating lobby: {e}")



    async def remove_user_from_lobby(self):
        try:
            tournament = await database_sync_to_async(Tournament.objects.get)(id=self.tournament_id)
            user = self.user
            current_round = await self.get_current_round()

            if tournament.status == 'not_started':
                if current_round:
                    slot_to_release = None
                    for slot, slot_data in current_round.slots.items():
                        if slot_data['username'] == user.username:
                            slot_to_release = slot
                            break

                    if slot_to_release:
                        await self.update_ready_status_in_round(slot_to_release, False)
                        await self.send_ready_status_update_to_group()

                await self.send_lobby_update()
                logger.info(f"Players in lobby before removal: {tournament.players_in_lobby}")

                if await database_sync_to_async(tournament.players.filter(id=user.id).exists)():
                    await database_sync_to_async(tournament.players.remove)(user)
                    tournament.players_in_lobby -= 1
                    await database_sync_to_async(tournament.save)()

                    logger.info(f"User {user.username} removed from tournament and lobby.")
            
            else:
                if current_round:
                    slot_to_release = None
                    for slot, slot_data in current_round.slots.items():
                        if slot_data['username'] == user.username:
                            slot_to_release = slot
                            break

                    if slot_to_release:
                        await self.update_ready_status_in_round(slot_to_release, False)
                        await self.send_ready_status_update_to_group()

                    logger.info(f"User {user.username} removed from lobby, but still in the tournament.")
            
            await self.send_lobby_update()

        except Exception as e:
            logger.error(f"Error removing user from lobby: {e}")



    @database_sync_to_async
    def get_user(self):
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
        logger.info(f"Attempting to retrieve user list for tournament_id: {self.tournament_id}")
        try:
            tournament = Tournament.objects.prefetch_related('players').get(id=self.tournament_id)
            users = tournament.players.all()
            user_list = [{'username': user.username} for user in users]
            logger.info(f"User list: {user_list}")
            return user_list
        except Tournament.DoesNotExist:
            logger.error(f"Tournament with id {self.tournament_id} does not exist.")
            return []
        except Exception as e:
            logger.error(f"Error getting user list: {e}")
            return []

    @database_sync_to_async
    def get_tournament(self):
        try:
            return Tournament.objects.get(id=self.tournament_id)
        except Tournament.DoesNotExist:
            return None

    async def get_current_round(self):
        try:
            current_round = await database_sync_to_async(Round.objects.filter(
                tournament=self.tournament, status='not_started'
            ).first)()

            if current_round:
                return current_round

            total_rounds = self.tournament.rounds
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
        message = event['message']
        await self.send(text_data=json.dumps(message))


    async def start_tournament_flow(self):
        logger.info("Starting tournament flow...")

        tournament = await self.get_tournament()
        if not tournament:
            logger.error(f"Tournament {self.tournament_id} does not exist.")
            return

        logger.info(f"Tournament {tournament.name} found with status {tournament.status}.")
        tournament.status = 'waiting_for_matches'
        await database_sync_to_async(tournament.save)()
        logger.info(f"Tournament status updated to 'waiting_for_matches'.")

        round = await self.get_current_round()
        if not round:
            logger.error("Current round not found.")
            return

        slots = round.slots
        players_to_block = []
        first_slot_user = None
        for slot_key, slot_data in slots.items():
            if slot_data.get('player_id'):
                slot_data['locked'] = True
                players_to_block.append(slot_data['player_id'])
                if not first_slot_user:
                    first_slot_user = slot_data['username']
            else:
                logger.warning(f"Slot {slot_key} is empty and will not be locked.")

        round.slots = slots
        await database_sync_to_async(round.save)()
        logger.info(f"Slots updated and locked: {round.round_number} retrieved with slots: {round.slots}")

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': {
                    'type': 'block_slots',
                    'message': 'Slots are now locked, preparing the tournament...',
                    'players_to_block': players_to_block
                }
            }
        )
        logger.info(f"Players to block sent to clients: {players_to_block}")

        if first_slot_user:
            logger.info(f"Authorizing {first_slot_user} to start the countdown.")
            tournament.status = 'countdown_started'
            await database_sync_to_async(tournament.save)()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_message_to_clients',
                    'message': {
                        'type': 'start_countdown',
                        'authorized_client': first_slot_user
                    }
                }
            )
        else:
            logger.warning("No user found in the first slot to start the countdown.")
        logger.info("Waiting for countdown to complete on client side...")


    async def notify_players_to_join(self):
        try:
            round = await self.get_current_round()
            if not round:
                logger.error("Current round not found.")
                return

            logger.info(f"Notifying players for round {round.round_number}.")

            games = await database_sync_to_async(list)(round.games.all())

            slots = list(round.slots.items())
            players_per_game = len(slots) // len(games) if games else 0

            if players_per_game == 0:
                logger.error("No players per game could be calculated. Check the number of slots and games.")
                return

            max_attempts = 5
            for attempt in range(max_attempts):
                all_games_assigned = True
                for idx, game in enumerate(games):
                    start_idx = idx * players_per_game
                    end_idx = start_idx + players_per_game
                    game_slots = slots[start_idx:end_idx]

                    for player_idx, (slot, slot_data) in enumerate(game_slots):
                        player_id = slot_data.get('player_id')
                        username = slot_data.get('username')

                        if player_id:
                            try:
                                player = await database_sync_to_async(User.objects.get)(id=player_id)
                                playerprofile = await database_sync_to_async(UserProfile.objects.get)(user=player)
                                if player_idx == 0:
                                    await database_sync_to_async(setattr)(game, 'player1', player)
                                elif player_idx == 1:
                                    await database_sync_to_async(setattr)(game, 'player2', player)
                                elif player_idx == 2 and game.mode != '1v1':
                                    await database_sync_to_async(setattr)(game, 'player3', player)
                                elif player_idx == 3 and game.mode != '1v1':
                                    await database_sync_to_async(setattr)(game, 'player4', player)
                                await database_sync_to_async(setattr)(game, 'status', 'in_progress')
                                await database_sync_to_async(playerprofile.game_played.add)(game)
                                await database_sync_to_async(playerprofile.save)()
                                await database_sync_to_async(game.save)()
                            except User.DoesNotExist:
                                logger.error(f"Player with ID {player_id} not found for slot {slot}.")
                                all_games_assigned = False
                        else:
                            logger.error(f"No player assigned to slot {slot}. Skipping this slot.")
                            all_games_assigned = False

                if all_games_assigned:
                    break
                else:
                    logger.warning(f"Attempt {attempt + 1}/{max_attempts} failed to assign all players. Retrying...")
                    await asyncio.sleep(1)

            if not all_games_assigned:
                logger.error("Failed to assign all players to games after maximum attempts.")
                return

            for game in games:
                await database_sync_to_async(game.save)()

            for idx, game in enumerate(games):
                for player_idx in range(players_per_game):
                    player = getattr(game, f"player{player_idx + 1}", None)
                    if player:
                        is_pending = player.username in TournamentConsumer.pending_players.get(self.tournament_id, set())
                        flag = True 
                        message = {
                            'type': 'join_game_notification',
                            'slot': f"{idx * players_per_game + player_idx + 1}",
                            'username': player.username,
                            'game_link': f'/api/game/{game.id}/',
                            'show_popup': flag
                        }

                        await self.channel_layer.group_send(
                            f"user_{player.username}",
                            {
                                'type': 'send_message_to_client',
                                'message': message
                            }
                        )

            logger.info("Notifications sent to all players to join the game.")
        except Exception as e:
            logger.error(f"Error sending notifications to join game: {e}")

    async def resend_notifications(self, tournament_id):
        try:
            round = await self.get_current_round()
            if not round:
                logger.error("Current round not found.")
                return

            games = await sync_to_async(
                lambda: list(round.games.select_related("player1", "player2").all())
            )()
            logger.info(f" vediamo se luke è luke Notifying players for round {round.round_number}.")
            
            for idx, game in enumerate(games):
                for player_idx in range(2):
                    player = getattr(game, f"player{player_idx + 1}", None)
                    if player:
                        
                        is_pending = player.username in TournamentConsumer.pending_players[self.tournament_id]
                        flag = not is_pending 
                        
                        message = {
                            'type': 'join_game_notification',
                            'slot': f"{idx * 2 + player_idx + 1}",
                            'username': player.username,
                            'game_link': f'/api/game/{game.id}/',
                            'show_popup': flag
                        }

                        await self.channel_layer.group_send(
                            f"user_{player.username}",
                            {
                                'type': 'send_message_to_client',
                                'message': message
                            }
                        )
            logger.info(f"All pending notifications resent for tournament {tournament_id}.")
        
        except Exception as e:
            logger.error(f"Error resending notifications for tournament {tournament_id}: {e}", exc_info=True)




    async def prepare_next_round(self):
        next_round_number = (self.current_round.round_number + 1)
        next_round_exists = await database_sync_to_async(Round.objects.filter(
            tournament=self.tournament, round_number=next_round_number).exists)()

        if next_round_exists:
            logger.info(f"Round {next_round_number} already exists. Skipping round generation.")
            return

        message = await database_sync_to_async(self.tournament.generate_next_round)()
        logger.info(message)


    async def check_current_round_games(self):
        if not self.current_round:
            logger.warning("No current round found to check games.")
            return

        logger.info(f"Checking games for round {self.current_round.round_number}.")

        games = await database_sync_to_async(list)(
            self.current_round.games.select_related('winner').all()
        )
        if not games:
            logger.warning(f"No games found for round {self.current_round.round_number}.")
            return

        next_round_number = self.current_round.round_number + 1
        next_round = await database_sync_to_async(
            Round.objects.filter(tournament=self.tournament, round_number=next_round_number).first
        )()
        is_final_round = not next_round

        if is_final_round:
            logger.info(f"Final round detected: round {self.current_round.round_number}.")

        all_finished = True
        updated_slots = {}
        tournament_winner = None

        if next_round:
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

            next_round.slots = slots
            await database_sync_to_async(next_round.save)()
            updated_slots = slots
            logger.info(f"Next round slots updated: {slots}.")

        if is_final_round:
            logger.info(f"#####Final round")
            if len(games) == 1:
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
                    return

            else:
                logger.error("Unexpected number of games in final round. Check tournament configuration.")

        if next_round and updated_slots:
            logger.info(f"Notifying clients with updated slots: {updated_slots}.")
            await self.send_slot_status_update_to_group()

        if all_finished:
            logger.info(f"All games in round {self.current_round.round_number} are finished. Marking round as finished.")
            await self.mark_round_as_finished()
        else:
            logger.info(f"Not all games in round {self.current_round.round_number} are finished. Waiting for completion.")



    async def update_next_round_slot(self, next_round, slot_key, winner):
        next_round.slots[slot_key] = {'player_id': winner.id, 'username': winner.username}
        await database_sync_to_async(next_round.save)()
        logger.info(f"Updated slot {slot_key} in round {next_round.round_number} with winner {winner.username}.")


    async def mark_round_as_finished(self):
        self.current_round.status = 'finished'
        await database_sync_to_async(self.current_round.save)()
        logger.info(f"Round {self.current_round.round_number} marked as finished.")

        self.current_round = await self.get_current_round()

        self.tournament.status = 'preparing_next_round'
        await database_sync_to_async(self.tournament.save)()
        logger.info(f"Tournament status updated to 'preparing_next_round'.")


    async def handle_tournament_end(self, tournament_winner):
        self.tournament.status = 'finished'
        self.tournament.winner = tournament_winner
        await database_sync_to_async(self.tournament.save)()
        logger.info(f"Tournament {self.tournament.name} marked as finished with winner: {tournament_winner.username if tournament_winner else 'None'}.")


    async def notify_tournament_end(self, tournament_name, tournament_winner):
        message = {
            'type': 'tournament_finished',
            'message': f"The tournament '{tournament_name}' has concluded!",
            'winner': {
                'username': tournament_winner.username if tournament_winner else None,
                'player_id': tournament_winner.id if tournament_winner else None,
            } if tournament_winner else None
        }

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'send_message_to_clients',
                'message': message
            }
        )
        logger.info(f"Notified clients of tournament conclusion with winner: {tournament_winner.username if tournament_winner else 'None'}.")


    async def update_user_profiles(self, tournament_winner):
        try:
            if self.tournament_id in TournamentConsumer.processed_tournaments:
                logger.info(f"Tournament {self.tournament_id} has already been processed. Skipping profile updates.")
                return

            TournamentConsumer.processed_tournaments.add(self.tournament_id)

            if tournament_winner:
                try:
                    winner_profile = await database_sync_to_async(lambda: UserProfile.objects.get(user=tournament_winner))()
                    winner_profile.tournament_win = F('tournament_win') + 1
                    await database_sync_to_async(winner_profile.save)()
                    logger.info(f"Updated tournament wins for {tournament_winner.username}.")
                except UserProfile.DoesNotExist:
                    logger.error(f"UserProfile for winner {tournament_winner.username} does not exist.")

            all_users = await database_sync_to_async(lambda: list(self.tournament.players.all()))()
            for user in all_users:
                if user != tournament_winner:
                    try:
                        loser_profile = await database_sync_to_async(lambda: UserProfile.objects.get(user=user))()
                        loser_profile.tournament_lose = F('tournament_lose') + 1
                        await database_sync_to_async(loser_profile.save)()
                        logger.info(f"Updated tournament losses for {user.username}.")
                    except UserProfile.DoesNotExist:
                        logger.error(f"UserProfile for user {user.username} does not exist.")
        except Exception as e:
            logger.error(f"Error updating user profiles for tournament {self.tournament_id}: {e}")

