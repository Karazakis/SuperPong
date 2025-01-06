from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserChangeForm, PasswordChangeForm
from .models import UserProfile
from django.core.exceptions import ValidationError
import re

class SignUpForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean_username(self):
        username = self.cleaned_data.get('username', '').strip()
        if not username:
            raise ValidationError("Username cannot be empty or contain only spaces.")
        if len(username) < 3:
            raise ValidationError("Username must be at least 3 characters long.")
        if len(username) > 20:
            raise ValidationError("Username cannot be over 20 characters long.")
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            raise ValidationError("Username can contain only letters, numbers and underscore.")
        if User.objects.filter(username=username).exists():
            raise ValidationError("Username already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        if not email:
            raise ValidationError("Email cannot be empty or contain only spaces.")
        if len(email) > 40:
            raise ValidationError("Email address cannot be over 40 characters long.")
        if not re.match(r'^(?!.*\.\.)[a-zA-Z0-9._%+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValidationError("Insert a valid email address.")
        if User.objects.filter(email=email).exists():
            raise ValidationError("Email address already taken.")
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password', '').strip()
        if not password:
            raise ValidationError("Password cannot be empty or contain only spaces.")
        if len(password) < 8:
            raise ValidationError("Password must have at least 8 characters.")
        if not re.search(r'[A-Z]', password):
            raise ValidationError("Password must have at least one uppercase character.")
        if not re.search(r'[a-z]', password):
            raise ValidationError("Password must have at least one lowercase character.")
        if not re.search(r'\W', password):
            raise ValidationError("Password must have at least one special character.")
        return password

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user

class UserSettingsForm(UserChangeForm):
    password = forms.CharField(widget=forms.PasswordInput, required=False, min_length=8)
    email = forms.EmailField(required=False)
    username = forms.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean_username(self):
        username = self.cleaned_data.get('username', '').strip()
        if username:
            if len(username) < 3:
                raise ValidationError("Username must be at least 3 characters long.")
            if len(username) > 20:
                raise ValidationError("Username cannot be over 20 characters long.")
            if not re.match(r'^[a-zA-Z0-9_]+$', username):
                raise ValidationError("Username can contain only letters, numbers and underscore.")
            if User.objects.filter(username=username).exists():
                raise ValidationError("Username already taken.")
        elif not self.instance.username:
            raise ValidationError("Username cannot be empty or contain only spaces.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        if email:
            if len(email) > 40:
                raise ValidationError("Email address cannot be over 40 characters long.")
            email_pattern = r'^(?!.*\.\.)[a-zA-Z0-9._%+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, email):
                raise ValidationError("Insert a valid email address.")
            if User.objects.filter(email=email).exists():
                raise ValidationError("Email address already taken.")
        elif not self.instance.email:
            raise ValidationError("Email cannot be empty or contain only spaces.")
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password', '').strip()
        if password:
            if len(password) < 8:
                raise ValidationError("Password must have at least 8 characters.")
            if not re.search(r'[A-Z]', password):
                raise ValidationError("Password must have at least one uppercase character.")
            if not re.search(r'[a-z]', password):
                raise ValidationError("Password must have at least one lowercase character.")
            if not re.search(r'\W', password):
                raise ValidationError("Password must have at least one special character.")
        return password

    def save(self, commit=True):
        user = super().save(commit=False)
        password = self.cleaned_data.get("password")
        if password:
            user.set_password(password)
        if commit:
            user.save()
        return user
