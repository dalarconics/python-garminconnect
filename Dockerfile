FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md LICENSE ./
COPY garminconnect ./garminconnect
COPY garmin_coaching ./garmin_coaching
COPY services ./services
COPY scripts/garmin_auth.py scripts/garmin_auth.py

RUN pip install --no-cache-dir -e ".[coaching]"

ENV GARMINTOKENS=/data/garmin-tokens
ENV COLLECTOR_PORT=8080
VOLUME ["/data/garmin-tokens"]

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1:${COLLECTOR_PORT}/health || exit 1

CMD ["python", "-m", "services.collector.main"]
