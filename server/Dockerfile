FROM python:3.12.6

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for building Python packages used by the project
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       gcc \
       libpq-dev \
       default-libmysqlclient-dev \
       libssl-dev \
       libffi-dev \
       netcat \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Install pip first and upgrade
RUN pip install --upgrade pip

# Copy requirements and install
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy project
COPY . /app

# Expose ASGI port
EXPOSE 8000

# Default command: run migrations, create admin user, then start Daphne ASGI server
CMD ["bash", "-lc", "python manage.py migrate --noinput && python manage.py create_admin && python manage.py collectstatic --noinput && daphne -b 0.0.0.0 -p 8000 hotel_backend.asgi:application"]
