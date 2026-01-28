FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY AI_logic/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY AI_logic/ .

# Expose port
EXPOSE 8000

# Run server
CMD ["uvicorn", "src.api.server:app", "--host", "0.0.0.0", "--port", "8000"]
