from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import JSONField

class Tournament(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    mode = models.CharField(max_length=100)
    rules = models.CharField(max_length=100, default='Time')
    limit = models.IntegerField(default=0, null=True, blank=True)
    balls = models.IntegerField(default=1, null=True, blank=True)
    boost = models.BooleanField(default=True)
    nb_players = models.IntegerField(default=0, null=True, blank=True)
    players = models.ManyToManyField(User, related_name='tournament_players')
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tournament_winner', default=None, null=True, blank=True)
    status = models.CharField(max_length=100, default='not_started')
    games = models.ManyToManyField('Game', related_name='tournaments')
    games_structure = JSONField(default=list)

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
    ready_players = models.ManyToManyField(User, related_name='ready_players', blank=True)
    team1 = models.ManyToManyField(User, related_name='games_team1')
    team2 = models.ManyToManyField(User, related_name='games_team2')
    player1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_player1', default=None, null=True, blank=True)
    player2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_player2', default=None, null=True, blank=True)
    player3 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_player3', default=None, null=True, blank=True)
    player4 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_player4', default=None, null=True, blank=True)
    player1_score = models.IntegerField(default=0, null=True, blank=True)
    player2_score = models.IntegerField(default=0, null=True, blank=True)
    player3_score = models.IntegerField(default=0, null=True, blank=True)
    player4_score = models.IntegerField(default=0, null=True, blank=True)
    team1_score = models.IntegerField(default=0, null=True, blank=True)
    team2_score = models.IntegerField(default=0, null=True, blank=True)
    winner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='games_winner', default=None, null=True, blank=True)
    status = models.CharField(max_length=100, default='not_started')

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    nickname = models.CharField(max_length=100)
    user_friend_list = models.ManyToManyField('self', blank=True)
    pending_requests = JSONField(default=list)
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
    img_profile = models.ImageField(upload_to='', default='media/profiles/default.png')
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

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance, nickname=instance.username)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.userprofile.save()
