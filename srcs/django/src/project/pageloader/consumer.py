import json
from channels.generic.websocket import WebsocketConsumer
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from .models import Game
from django.contrib.auth.models import User
import asyncio

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
    
    async def send_pending_request(self, data):
        recipient = data['target_user']
        print(data)
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

    async def pending_request(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'pending_request',
            'request': message['request'],
            'target_user': message['target_user'],
            'requesting_user': message['requesting_user'],
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

    async def receive(self, text_data):
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
            if await self.all_players_ready():
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
            await self.set_player_ready(username, data['status'])
            await self.send_player_ready(username, data['status'])
              
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
        game = Game.objects.get(id=self.game_id)
        game.status = 'playing'
        game.save()

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
        return game.ready_players.count() >= (game.players.count())