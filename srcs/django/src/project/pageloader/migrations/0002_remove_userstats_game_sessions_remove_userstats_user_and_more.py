# Generated by Django 4.2.16 on 2024-11-09 15:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pageloader', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userstats',
            name='game_sessions',
        ),
        migrations.RemoveField(
            model_name='userstats',
            name='user',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='stats',
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_abandon',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_draw',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_lose',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_played',
            field=models.ManyToManyField(blank=True, related_name='user_profiles', to='pageloader.game'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_win',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_abandon',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_draw',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_lose',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_played',
            field=models.ManyToManyField(blank=True, related_name='user_profiles', to='pageloader.tournament'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_win',
            field=models.IntegerField(default=0),
        ),
        migrations.DeleteModel(
            name='GameSession',
        ),
        migrations.DeleteModel(
            name='UserStats',
        ),
    ]
