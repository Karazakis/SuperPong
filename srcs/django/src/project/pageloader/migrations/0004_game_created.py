# Generated by Django 4.2.17 on 2024-12-23 19:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pageloader', '0003_game_time_left'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='created',
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
    ]
