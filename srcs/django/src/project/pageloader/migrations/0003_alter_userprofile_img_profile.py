# Generated by Django 3.2.25 on 2024-04-03 20:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pageloader', '0002_auto_20240402_1219'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='img_profile',
            field=models.ImageField(default='media/profiles/default.png', upload_to=''),
        ),
    ]
