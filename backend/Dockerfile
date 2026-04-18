FROM python:3.11-slim
WORKDIR /app

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

COPY requirements.txt .
RUN apt-get update && apt-get install -y gcc libffi-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get remove -y gcc libffi-dev \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
COPY . .

# Switch to non-root user
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 10000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000", "--proxy-headers", "--forwarded-allow-ips", "*"]
