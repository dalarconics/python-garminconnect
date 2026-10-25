---
schema_version: 1
project_id: python-garminconnect
next_id: 46
source: ies-cli
last_updated: '2026-10-25T17:31:30Z'
---

# Task Ledger

## T-0045 — Incluir indicadores de potencia de ciclismo en collector, LastActivityCard y nuevo menú lateral /potencia (SemVer 0.6.0)

```yaml
id: T-0045
title: Incluir indicadores de potencia de ciclismo en collector, LastActivityCard
  y nuevo menú lateral /potencia (SemVer 0.6.0)
project_id: python-garminconnect
origin: human
destination: implementer
status: done
input: 1) Collector y last_activity extraen FTP ciclismo, W/kg, avg_power, max_power,
  norm_power, IF, TSS y cadencia. 2) Menú lateral DashboardNav incluye /potencia con
  KPIs, 7 zonas de Coggan y vatios objetivo para Letras y 70.3 Cartagena. 3) SemVer
  0.6.0 MINOR sincronizado, pytest, ruff, npm test, npm run build e ies gate en PASS.
expected_output: Indicadores de potencia en collector, LastActivityCard, página /potencia
  con 7 zonas de Coggan y metas Letras/70.3 Cartagena, SemVer 0.6.0 MINOR y tests/gate
  en PASS.
parent_task: null
dependencies: []
priority: medium
profile: fast-track
autonomy: hitl
execution_mode: null
requested_iterations: null
skills: []
memory_refs: []
acceptance_criteria:
- pytest -q && ruff check . pasan
- npm --prefix apps/web test && npm --prefix apps/web run build pasan
- ies gate --task T-0045 en PASS
allowlist:
- garmin_coaching/collector.py
- garmin_coaching/last_activity.py
- tests/test_last_activity.py
- apps/web/lib/potencia.ts
- apps/web/lib/potencia.test.mjs
- apps/web/lib/dashboard.ts
- apps/web/components/DashboardNav.tsx
- apps/web/components/LastActivityCard.tsx
- apps/web/app/(dashboard)/potencia/page.tsx
- apps/web/app/globals.css
- apps/web/lib/version.test.mjs
- apps/web/CHANGELOG.md
- apps/web/README.md
- apps/web/package.json
- apps/web/package-lock.json
- deliverables/T-0045.md
created_at: '2026-10-25T17:16:05Z'
started_at: '2026-10-25T17:31:30Z'
completed_at: '2026-10-25T17:31:30Z'
blocked_reason: null
superseded_by: null
superseded_reason: null
terminal_status: null
output_ref: deliverables/T-0045.md
approval:
  required: true
  approved_by: null
  approved_at: null
metrics:
  git_before: f0de318ce571e82eca1829451244d9df2fbfa2e1
  git_after: f0de318ce571e82eca1829451244d9df2fbfa2e1
  result: success
edits: []
```
