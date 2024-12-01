# Generated by Django 4.2.13 on 2024-06-09 14:57

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('pageloader', '0008_rename_score_limit_tournament_limit_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='winner',
            field=models.ForeignKey(blank=True, default=None, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='games_winner', to=settings.AUTH_USER_MODEL),
        ),
        migrations.RemoveField(
            model_name='tournament',
            name='players',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='game_played',
        ),
        migrations.RemoveField(
            model_name='userprofile',
            name='tournament_played',
        ),
        migrations.AddField(
            model_name='tournament',
            name='players',
            field=models.ManyToManyField(related_name='tournament_players', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='game_played',
            field=models.ManyToManyField(blank=True, related_name='user_profiles', to='pageloader.game'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='tournament_played',
            field=models.ManyToManyField(blank=True, related_name='user_profiles', to='pageloader.tournament'),
        ),
    ]
