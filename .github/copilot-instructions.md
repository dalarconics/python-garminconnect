<!-- Generado por IES-OS sync-adapters. Fuente canonica: contratos, skills y memoria del framework/proyecto. Edita las fuentes, no este archivo; 'python scripts/sync-adapters.py' detecta drift. -->

# Instrucciones Copilot — IES-OS

## Reglas IES (no negociables)

1. Ninguna ejecucion sin una task valida del ledger; el prompt operativo se genera
   SOLO con `ies prompt <rol> --task T-XXXX`.
2. Contratos y skills: `ies contract <rol>`, `ies contract --skill <id>`; modelos
   heredados de `config/team.yaml` (`ies env show`), nunca fijados aqui.
3. Entrega en `deliverables/T-XXXX.md` con `sdlc:` por bloque; usa solo la memoria
   que selecciona el prompt. Nunca secretos, deploy ni comandos destructivos.

## Disciplina human-in-the-loop (`ies contract --doc working-discipline`, docs/WORKING_DISCIPLINE.md)

Aprobaciones conversacionales (`Ok`, `Acepto`, `De una`, `Adelante`, `Continua`,
`De acuerdo`, `Run`, `Correr`, `Ejecutar`): cubren solo la propuesta inmediatamente
anterior, no amplian el alcance y autorizan su
ejecucion si es cerrada. No exigen una segunda confirmacion; no son comandos.
Controles de persistencia (`salvar`, `guardar`, `actualizar`): solo persisten. Toda
ejecucion exige prompt cerrado y aprobacion humana explicita. Respuestas en caja
copiable (Articulo II.4); la HITL hace el handoff al coordinator, que crea tasks y
subagentes segun SDLC + EARS + SDD, en paralelo si son independientes (Articulo II.5).

## Sistema multi-agente SDD (resumen completo: `ies contract --doc sdd`, seccion 13.1)

- Destino: SOLO coordinator | planner | implementer | viewer. Orden: `ies spec new`
  -> plan -> `ies spec approve` -> `ies task add` (`--kind fix` en bugs) ->
  `ies prompt` -> worktree -> entrega -> viewer -> merge humano. Nadie despliega.
- Un implementer por task y worktree con `--allowlist` disjunta; `ies git verify --task`
  antes del viewer (DRIFT = BLOCKING); unica memoria editable por un implementer: el
  `memory/long/<nombre>.md` de su allowlist (ADR-017).
- `IES_ACTOR=<rol> ies ...`; `ies doctor` al abrir sesion; `ies task edit --reason`
  para corregir; `ies gate --task T-XXXX` e `ies constitution check` antes de entregar.
- Autonomia (`ies spec new`): hitl = Ok por gate; autonomous = un Ok del plan cubre el
  ciclo con viewer por entrega. El merge a la rama principal siempre es humano.

## Comandos

- `ies status` | `IES_ACTOR=<rol> ies gate --task T-XXXX` | `ies git verify --task T-XXXX`
- arquitectura-python: `lint-imports` (de .ies/gate.yaml)
- arquitectura-web: `npx --prefix apps/web depcruise --config apps/web/.dependency-cruiser.cjs apps/web/lib` (de .ies/gate.yaml)

## Definicion de terminado

- scope (allowlist sin DRIFT), deliverable (`result`, `verification`, `sdlc`),
  constitution (sin BLOCKING), secrets (ninguno), commands (`.ies/gate.yaml` en PASS
  sobre el HEAD, tracked-clean) y sdlc-evidence coherente con tests, diff y CHANGELOG.
- Desplegable: SemVer + CHANGELOG (ADR-009). Task `fix`: el test que reproduce se
  commitea antes del fix y no cambia despues.

## Errores frecuentes

- (sin seccion `## Errores frecuentes` en memory/long/lessons-learned.md; anadela por task documental)

## Reglas completas: `ies contract --doc sdd` | `ies contract --doc working-discipline` | `ies contract <rol>`

Nota: no se fijan modelos en estos archivos; el equipo se hereda de `config/team.yaml` del framework y puede cambiar sin tocar este repo.
