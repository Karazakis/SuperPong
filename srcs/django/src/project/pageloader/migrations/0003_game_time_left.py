# Generated by Django 4.2.16 on 2024-12-06 20:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pageloader', '0002_game_ballcount_game_player1_keypresscount_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='time_left',
            field=models.IntegerField(blank=True, default=0, null=True),
        ),
    ]
