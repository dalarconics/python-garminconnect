# Figma Wireframes — Fitness Coach MVP (Phase 2)

Create a Figma file named **Fitness Coach MVP** with two frames.

## Frame 1: Hoy

```
+----------------------------------+
| Fitness Coach          mmB 307d  |
+----------------------------------+
| READINESS                        |
| [ ROJO 2/5 ]  HRV 42  BB +65     |
+----------------------------------+
| MACROCICLO                       |
| R0 Recuperacion                  |
| Reto Letras: 358d                |
+----------------------------------+
| HOY                              |
| Descanso total                   |
| Guards: overreaching, acwr_high  |
+----------------------------------+
| [ Confirmar ] [ Descanso ]       |
+----------------------------------+
```

Components: `ReadinessBadge`, `MetricRow`, `SessionCard`, `MilestoneCountdown`, `ActionButtons`.

## Frame 2: Tendencia (14/30 días)

```
+----------------------------------+
| Tendencia          14d | 30d     |
+----------------------------------+
| VO2max chart (line)              |
| HRV chart (line)                 |
| ACWR chart (line, ref 1.3)       |
+----------------------------------+
| Readiness distribution           |
| VERDE ████ AMARILLO ██ ROJO █    |
+----------------------------------+
```

Data source: Supabase `readiness_daily`, `training_load`, `daily_snapshots` — read-only via anon key + RLS in phase 2.

## Design tokens

- VERDE: `#22c55e`
- AMARILLO: `#eab308`
- ROJO: `#ef4444`
- Background: `#0f172a`
- Card: `#1e293b`
