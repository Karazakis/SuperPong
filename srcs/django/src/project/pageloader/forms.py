from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import re

class SignUpForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean_username(self):
        username = self.cleaned_data.get('username')
        # Sanitizza l'input per prevenire XSS
        username = re.sub(r'[<>]', '', username)
        if len(username) < 3:
            raise ValidationError("Il nome utente deve essere lungo almeno 3 caratteri.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email')
        # Sanitizza l'input per prevenire XSS
        email = re.sub(r'[<>]', '', email)
        email_pattern = r'^[a-zA-Z0-9._%+]+@[a-zA-Z0-9.]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Inserisci un indirizzo email valido (almeno 3 caratteri prima della @, almeno 3 caratteri dopo la @, un punto e almeno 2 caratteri dopo il punto).")
        if User.objects.filter(email=email).exists():
            raise ValidationError("L'email è già in uso.")
        return email

    def clean_password(self):
        password = self.cleaned_data.get('password')
        password_pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$'
        if not re.match(password_pattern, password):
            raise ValidationError("La password deve avere almeno 8 caratteri, con almeno una lettera maiuscola, una lettera minuscola e un carattere speciale.")
        return password

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
