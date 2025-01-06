FROM python:3.9-slim

WORKDIR /django

COPY src/requirements.txt .

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc libc-dev libpq-dev pkg-config libcairo2-dev libgirepository1.0-dev python3-apt \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
