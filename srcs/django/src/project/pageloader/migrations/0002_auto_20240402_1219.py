# Generated by Django 3.2.25 on 2024-04-02 12:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pageloader', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='powerup',
            new_name='boost',
        ),
        migrations.RenameField(
            model_name='game',
            old_name='score_limit',
            new_name='limit',
        ),
        migrations.RemoveField(
            model_name='game',
            name='time_limit',
        ),
        migrations.AddField(
            model_name='game',
            name='rules',
            field=models.CharField(default='Time', max_length=100),
        ),
    ]
