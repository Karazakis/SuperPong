from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import JSONField
import math


class Tournament(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    mode = models.CharField(max_length=100)  # Es. '1v1', '2v2', '4dm'
    rules = models.CharField(max_length=100, default='Time')
    limit = models.IntegerField(default=0, null=True, blank=True)
    balls = models.IntegerField(default=1, null=True, blank=True)
    boost = models.BooleanField(default=True)
    nb_players = models.IntegerField(default=0, null=True, blank=True)  # Numero totale di giocatori
    players_in_lobby = models.IntegerField(default=0, null=True, blank=True)  # Giocatori nella lobby
    players = models.ManyToManyField(User, related_name='tournament_players')  # Giocatori che partecipano al torneo
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_tournaments', default=None, null=True, blank=True)  # Proprietario del torneo
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournament_winner', default=None, null=True, blank=True)  # Vincitore del torneo
    status = models.CharField(max_length=100, default='not_started')  # Stato del torneo: 'not_started', 'in_progress', 'finished'
    rounds = models.IntegerField(default=0)  # Numero totale di round

    def calculate_rounds(self):
        """Calcola il numero di round in base al numero di giocatori."""
        if self.mode == '1v1':
            return math.ceil(math.log2(self.nb_players))
        elif self.mode == '2v2':
            return math.ceil(math.log2(self.nb_players // 2))  # Ogni partita ha 4 giocatori
        elif self.mode == '4dm':
            return math.ceil(math.log2(self.nb_players // 4))  # Supponendo riduzione fino a 4 giocatori
        else:
            return 1  # Default per modalità sconosciute

    def calculate_games_per_round(self):
        """Calcola il numero di game per round in base alla modalità."""
        if self.mode == '1v1':
            return self.nb_players // 2  # Ogni partita ha 2 giocatori
        elif self.mode == '2v2':
            return self.nb_players // 4  # Ogni partita ha 4 giocatori
        elif self.mode == '4dm':
            return self.nb_players // 4  # Per esempio, nel deathmatch con 4 giocatori
        else:
            return 1  # Default per altre modalità

    def generate_initial_rounds(self):
        """Genera solo il primo round e i relativi game."""
        games_per_round = self.calculate_games_per_round()

        # Genera solo il primo round
        round_instance = Round.objects.create(
            tournament=self,
            round_number=1,
            status='not_started'
        )
        round_instance.generate_initial_slot_status(self)
        round_instance.generate_games(games_per_round, self.mode, self.rules, self.limit, self.balls, self.boost)  # Genera i game all'interno del round
        
        self.rounds = self.calculate_rounds()
        self.save()

    def generate_next_round(self):
        """
        Genera il round successivo se esiste uno stato di round 'not_started' e restituisce messaggi di stato.
        """
        max_rounds = self.rounds

        current_round = Round.objects.filter(tournament=self, status='not_started').first()

        if not current_round:
            return "No 'not_started' rounds found. The tournament may be complete."

        current_round_number = current_round.round_number
        next_round_number = current_round_number + 1

        if next_round_number > max_rounds:
            return f"Reached the final round: current round number: {current_round_number}; next_round_number: {next_round_number}, max_rounds: {max_rounds}"

        if Round.objects.filter(tournament=self, round_number=next_round_number).exists():
            return f"Round {next_round_number} already exists."

        players_remaining = self.calculate_remaining_players(current_round_number)
        games_per_round = players_remaining // (2 if self.mode == '1v1' else 4)

        # Genera il prossimo round
        next_round = Round.objects.create(
            tournament=self,
            round_number=next_round_number,
            status='not_started'
        )

        # Inizializza gli slot solo per i giocatori rimanenti
        next_round.generate_slot_status_for_remaining_players(players_remaining)

        # Genera i giochi per il round
        next_round.generate_games(games_per_round, self.mode, self.rules, self.limit, self.balls, self.boost)

        self.save()

        return f"Generated new round {next_round_number} with {games_per_round} games."


    def calculate_remaining_players(self, current_round_number):
        """
        Calcola il numero di giocatori rimanenti in base al round attuale e alla modalità.
        """
        if self.mode == '1v1':
            return self.nb_players // (2 ** current_round_number)  # Dimezza ogni round
        elif self.mode == '2v2':
            return self.nb_players // (4 ** current_round_number)  # Dimezza ogni due round
        elif self.mode == '4dm':
            return max(4, self.nb_players // (4 ** current_round_number))  # Mantiene almeno 4 giocatori
        return 1


class Round(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='tournament_rounds')
    round_number = models.IntegerField(default=1)  # Numero del round nel torneo
    games = models.ManyToManyField('Game', related_name='round_games')  # Game che si svolgono in questo round
    status = models.CharField(max_length=100, default='not_started')  # Stato del round: 'not_started', 'in_progress', 'finished'
    start_time = models.DateTimeField(null=True, blank=True)  # Orario di inizio del round (opzionale)
    end_time = models.DateTimeField(null=True, blank=True)  # Orario di fine del round (opzionale)
    slots = models.JSONField(default=dict)  # Stato degli slot per i giocatori in questo round
    ready_status = models.JSONField(default=dict)  # Stato di ready dei giocatori

    def generate_games(self, num_games, mode, rules, limit, balls, boost):
        """Genera i game per il round in base al numero di game e le regole del torneo."""
        if rules == 'time':
            time_left = limit * 60
            player_limit = 0
        else:
            time_left = 0
            player_limit = limit
        for i in range(1, num_games + 1):                
            game = Game.objects.create(
                name=f"{self.tournament.name} - Round {self.round_number} - Game {i}",
                mode=mode,
                rules=rules,
                limit=limit,
                time_left=time_left,
                balls=balls,
                boost=boost,
                tournament=self.tournament,
                status='not_started',
                player1_score=player_limit,
                player2_score=player_limit,
            )
            self.games.add(game)
        self.save()

    def generate_initial_slot_status(self, tournament):
        """Inizializza gli slot e lo stato 'ready' del round basandosi sul numero di giocatori nel torneo."""
        if not self.slots:  # Assicurati di non sovrascrivere se gli slot sono già presenti
            self.slots = {
                i: {'player_id': None, 'username': 'empty'}
                for i in range(1, tournament.nb_players + 1)
            }
        if not self.ready_status:  # Assicurati di non sovrascrivere se lo stato 'ready' è già presente
            self.ready_status = {i: False for i in range(1, tournament.nb_players + 1)}
        
        self.save()

    def generate_slot_status_for_remaining_players(self, remaining_players):
        """
        Genera lo stato degli slot solo per i giocatori rimanenti in gara, usando valori placeholder.
        """
        self.slots = {
            i: {'player_id': None, 'username': f'winner match #{i}'}
            for i in range(1, remaining_players + 1)
        }
        self.ready_status = {i: False for i in range(1, remaining_players + 1)}
        
        self.save()


class Game(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    mode = models.CharField(max_length=100)
    rules = models.CharField(max_length=100, default='Time')
    limit = models.IntegerField(default=0, null=True, blank=True)
    balls = models.IntegerField(default=1, null=True, blank=True)
    boost = models.BooleanField(default=True)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, null=True, blank=True)
    players = models.ManyToManyField(User, related_name='game_players')
    player_limit = models.IntegerField(default=0, null=True, blank=True)
    player_inlobby = models.IntegerField(default=0, null=True, blank=True)
    ready_players = models.ManyToManyField(User, related_name='game_ready_players', blank=True)
    team1 = models.ManyToManyField(User, related_name='games_team1')
    team2 = models.ManyToManyField(User, related_name='games_team2')
    player1 = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='games_player1', default=None, null=True, blank=True)
    player2 = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='games_player2', default=None, null=True, blank=True)
    player3 = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='games_player3', default=None, null=True, blank=True)
    player4 = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='games_player4', default=None, null=True, blank=True)
    player1_status = models.CharField(max_length=100, default='not_ready')
    player2_status = models.CharField(max_length=100, default='not_ready')
    player1_hit = models.IntegerField(default=0, null=True, blank=True)
    player2_hit = models.IntegerField(default=0, null=True, blank=True)
    player1_keyPressCount = models.IntegerField(default=0, null=True, blank=True)
    player2_keyPressCount = models.IntegerField(default=0, null=True, blank=True)
    ballCount = models.IntegerField(default=0, null=True, blank=True)
    player3_status = models.CharField(max_length=100, default='not_ready')
    player4_status = models.CharField(max_length=100, default='not_ready')
    player1_score = models.IntegerField(default=0, null=True, blank=True)
    player2_score = models.IntegerField(default=0, null=True, blank=True)
    player3_score = models.IntegerField(default=0, null=True, blank=True)
    player4_score = models.IntegerField(default=0, null=True, blank=True)
    team1_score = models.IntegerField(default=0, null=True, blank=True)
    team2_score = models.IntegerField(default=0, null=True, blank=True)
    time_left = models.IntegerField(default=0, null=True, blank=True)
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_winner', default=None, null=True, blank=True)
    status = models.CharField(max_length=100, default='not_started')
    created = models.DateTimeField(auto_now_add=True, null=True, blank=True)

def user_directory_path(instance, filename):
    # Il file verrà caricato in MEDIA_ROOT / profiles / user_<id> / <filename>
    return f'profiles/{instance.user.id}/{filename}'


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    blocked_users = models.ManyToManyField('self', symmetrical=False, related_name='blocked_by', blank=True)
    nickname = models.CharField(max_length=100)
    user_friend_list = models.ManyToManyField('self', blank=True, symmetrical=True)
    pending_requests = models.ManyToManyField('PendingRequest', related_name='user_profiles', blank=True)
    in_game_lobby = models.ForeignKey(Game, on_delete=models.SET_NULL, related_name='lobby_players', default=None, null=True, blank=True)
    in_tournament_lobby = models.ForeignKey(Tournament, on_delete=models.SET_NULL, related_name='lobby_players', default=None, null=True, blank=True)
    game_played = models.ManyToManyField(Game, related_name='user_profiles', blank=True)
    game_win = models.IntegerField(default=0)
    game_lose = models.IntegerField(default=0)
    game_draw = models.IntegerField(default=0)
    game_abandon = models.IntegerField(default=0)
    tournament_played = models.ManyToManyField(Tournament, related_name='user_profiles', blank=True)
    tournament_win = models.IntegerField(default=0)
    tournament_lose = models.IntegerField(default=0)
    tournament_draw = models.IntegerField(default=0)
    tournament_abandon = models.IntegerField(default=0)
    img_profile = models.ImageField(upload_to=user_directory_path, default='profiles/default.png')
    p1Right = models.CharField(max_length=20, default='ArrowRight')
    p1Left = models.CharField(max_length=20, default='ArrowLeft')
    p1Shoot = models.CharField(max_length=20, default='Control')
    p1Boost = models.CharField(max_length=20, default='Space')
    p2Right = models.CharField(max_length=20, default='')
    p2Left = models.CharField(max_length=20, default='')
    p2Shoot = models.CharField(max_length=20, default='')
    p2Boost = models.CharField(max_length=20, default='')
    p3Right = models.CharField(max_length=20, default='')
    p3Left = models.CharField(max_length=20, default='')
    p3Shoot = models.CharField(max_length=20, default='')
    p3Boost = models.CharField(max_length=20, default='')
    p4Right = models.CharField(max_length=20, default='')
    p4Left = models.CharField(max_length=20, default='')
    p4Shoot = models.CharField(max_length=20, default='')
    p4Boost = models.CharField(max_length=20, default='')

    def __str__(self):
        return self.user.username

    def add_friend(self, friend_profile):
        self.user_friend_list.add(friend_profile)
        self.save()

    def block_user(self, user):
        if not self.blocked_users.filter(id=user.id).exists():
            self.blocked_users.add(user)
            self.save()

    def unblock_user(self, user):
        if self.blocked_users.filter(id=user.id).exists():
            self.blocked_users.remove(user)
            self.save()

    def remove_friend(self, friend_profile):
        self.user_friend_list.remove(friend_profile)
        self.save()

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance, nickname=instance.username)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.userprofile.save()


class PendingRequest(models.Model):
    REQUEST_TYPES = [
        ('friend', 'Friend'),
        ('game', 'Game'),
        ('tournament', 'Tournament'),
    ]
    
    REQUEST_STATUSES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    id = models.AutoField(primary_key=True)
    request_type = models.CharField(max_length=10, choices=REQUEST_TYPES)
    target_user = models.ForeignKey(User, related_name='received_requests', on_delete=models.CASCADE)
    requesting_user = models.ForeignKey(User, related_name='sent_requests', on_delete=models.CASCADE)
    request = models.CharField(max_length=10)
    creation_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=REQUEST_STATUSES, default='pending')

    def __str__(self):
        return f"{self.requesting_user} -> {self.target_user} [{self.request_type}]"
