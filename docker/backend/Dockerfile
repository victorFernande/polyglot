FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Initialize database on start
CMD ["sh", "-c", "python -c 'from models import init_db; init_db()' && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]
