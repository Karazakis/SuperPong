# Usa un'immagine base che ha già python installato
FROM python:3.9-slim

# Imposta il working directory
WORKDIR /django

# Copia il file requirements.txt nel working directory
COPY src/requirements.txt .

# Installa le dipendenze di sistema necessarie per psycopg2, pycairo e altre librerie
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc libc-dev libpq-dev pkg-config libcairo2-dev libgirepository1.0-dev python3-apt \
    && rm -rf /var/lib/apt/lists/*

# Installa le dipendenze del progetto
RUN pip install --no-cache-dir -r requirements.txt

# Copia il resto del codice dell'applicazione
COPY . .

# Comando per eseguire la tua applicazione
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
