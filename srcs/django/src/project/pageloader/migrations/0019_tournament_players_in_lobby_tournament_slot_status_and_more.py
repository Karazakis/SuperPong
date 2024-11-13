# Generated by Django 4.2.13 on 2024-08-13 16:47

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('pageloader', '0018_rename_games_structure_tournament_rounds_structure_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tournament',
            name='players_in_lobby',
            field=models.IntegerField(blank=True, default=0, null=True),
        ),
        migrations.AddField(
            model_name='tournament',
            name='slot_status',
            field=models.JSONField(default=dict),
        ),
        migrations.AlterField(
            model_name='round',
            name='ready_players',
            field=models.ManyToManyField(blank=True, related_name='ready_players_rounds', to=settings.AUTH_USER_MODEL),
        ),
    ]
