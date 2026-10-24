---
schema_version: 1
project_id: python-garminconnect
layer: immediate
last_updated: '2026-10-24T18:16:39Z'
source: ies bye
---

# Handoff

Ultima sesion: S-20261024-002 (cerrada 2026-10-24T18:16:39Z).

## Para reanudar

```bash
ies init          # abre nueva sesion y muestra status
ies status        # revisa bloqueos y siguiente accion
ies task add      # crea la siguiente task
```

Task sugerida al reanudar: (crear nueva)

## Trabajo pendiente propuesto

Followups declarados por los agentes en sus entregas. No son tasks: el humano decide cuales crear con `ies task add` (en SDD, tras reabrir o crear la spec).

- [T-0021] Propuesta I-LAYOUT: implementar SPEC-002 en worktree tras aprobación, con pruebas Safari y versión acordada.
- [T-0021] Propuesta V-LAYOUT: viewer independiente de I-LAYOUT, después del gate humano de entrega.
- [T-0022] Propuesta C-GOV para alinear configuración canónica y registrar modelos efectivos.
- [T-0022] Propuestas I-UI, I-SERVER e I-CLIENT con viewers independientes y gates separados.
- [T-0024] I-UI del PLAN-002, pendiente de gate G2; sin task implementer creada ni despachada.
- [T-0042] SPEC-005: Especificación formal del adaptador GarminOfficialClient en services/collector/ y migración a GARMIN_PERSONAL_API_KEY (eliminando garmin_tokens y garth).
- [T-0042] SPEC-006: Plan de extracción de Tri-Coach (apps/web, garmin_coaching, services/collector, supabase, .ies) hacia su repositorio independiente tri-coach.

## Cobertura SDLC pendiente

Bloques declarados `parcial` o `no-aplica` en entregas cerradas (ADR-011); el humano decide si generan followups.

- [T-0019] release: no-aplica
- [T-0019] despliegue: no-aplica
- [T-0023] release: no-aplica
- [T-0023] despliegue: no-aplica
- [T-0040] diseno: no-aplica
- [T-0041] release: no-aplica
- [T-0041] diseno: no-aplica
- [T-0041] despliegue: no-aplica
- [T-0041] operacion-mantenimiento: no-aplica
- [T-0041] seguridad: no-aplica
- [T-0043] diseno: no-aplica
- [T-0043] despliegue: no-aplica
- [T-0043] operacion-mantenimiento: no-aplica
- [T-0043] seguridad: no-aplica

