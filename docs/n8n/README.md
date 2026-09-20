# n8n Workflows — Fitness Coaching MVP

Import the JSON files in this directory into your n8n instance.

## Environment variables (n8n)

| Variable | Description |
|----------|-------------|
| `COLLECTOR_URL` | Base URL of the collector worker, e.g. `http://host.docker.internal:8080` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for upserts |
| `WHATSAPP_TO` | Diego phone in E.164, e.g. `+573001234567` |
| `WHATSAPP_FROM` | Twilio/Meta sender ID |

## Workflows

1. **morning-ingest.json** — Cron 06:00 America/Bogota → POST `/collect` → store message draft
2. **whatsapp-coaching.json** — Cron 07:00 → fetch latest from Supabase → send WhatsApp with man-in-the-loop prompt
3. **alerts-weekly.json** — OVERREACHING/ACWR alerts + Sunday 18:00 weekly review + Garmin token check

## Collector worker

Start locally:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python -m services.collector.main
```

Or with uvicorn:

```bash
uvicorn services.collector.main:app --host 0.0.0.0 --port 8080
```
