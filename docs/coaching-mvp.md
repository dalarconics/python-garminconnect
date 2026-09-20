# Fitness Coaching MVP

Personal coaching stack for **mmB 2027** (25 Jul) and **Reto Mariquita–Letras** (~13 Sep 2027).

## Components

| Component | Path |
|-----------|------|
| Coaching engine | `garmin_coaching/` |
| Daily collect script | `scripts/collect_daily.py` |
| Collector API | `services/collector/` |
| Supabase schema | `supabase/schema.sql`, `supabase/seed.sql` |
| n8n workflows | `docs/n8n/*.json` |
| Dashboard (phase 2) | `apps/web/` |
| Figma wireframes | `docs/figma/wireframes.md` |

## Arquitectura cloud (recomendada)

Todo cloud — **sin Mac encendido**. Ver [`docs/cloud-deploy.md`](cloud-deploy.md).

| Pieza | Dónde |
|-------|-------|
| Collector | Railway / Fly.io (worker + volumen tokens) |
| DB | Supabase |
| Cron + WhatsApp | n8n.cloud |
| Dashboard | Vercel |

El despliegue local (`scripts/start_collector.sh`) es solo para desarrollo.

## Quick start (local dev)

```bash
pip install -e ".[coaching]"
python scripts/collect_daily.py --json
python -m services.collector.main
```

## Supabase setup

1. Create project `fitness-coach-diego`
2. Run `supabase/schema.sql` then `supabase/seed.sql` in SQL editor
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the worker

## n8n

Import workflows from `docs/n8n/`. Set `COLLECTOR_URL`, WhatsApp credentials, and Supabase API credential.

## Guards (hard rules)

- ROJO → rest only
- ACWR > 1.3 → −25% volume
- ACWR > 1.5 or OVERREACHING → 48h rest
- Man-in-the-loop via WhatsApp: OK | Descanso | Recortar
