---
schema_version: 1
project_id: python-garminconnect
next_id: 47
source: ies-cli
last_updated: '2026-11-02T23:10:47Z'
---

# Task Ledger

## T-0046 — Migrar LLM del Coach a Meta Muse y habilitar flujo directo MVP en /api/chat (SemVer 0.7.0)

```yaml
id: T-0046
title: Migrar LLM del Coach a Meta Muse y habilitar flujo directo MVP en /api/chat
  (SemVer 0.7.0)
project_id: python-garminconnect
origin: human
destination: implementer
status: ready
input: Reemplazar el proveedor exclusivo GPT-6 Luna por Meta Muse (meta-muse-spark)
  configurable por entorno (META_MUSE_API_KEY, META_MUSE_BASE_URL, META_MUSE_MODEL)
  y desbloquear la conexion extremo a extremo del chat en modo directo MVP_USER_ID
  sin exigir login OTP previo ni fallar con 401/403/404.
expected_output: Meta Muse configurado en openAiCoachProvider.ts y /api/chat, insignia
  Meta Muse · Spark en CoachModelSelect.tsx, flujo directo Bearer mvp-direct en useCoachConversation,
  SupabaseIdentityService, SupabaseHealthContext y SupabaseConversationRepository,
  ADR-005 y suites de pruebas actualizados, SemVer 0.7.0 MINOR y gate en PASS.
parent_task: null
dependencies: []
priority: medium
profile: fast-track
kind: feature
autonomy: hitl
execution_mode: null
requested_iterations: null
skills: []
memory_refs: []
acceptance_criteria:
- 'AC1: apps/web/lib/infra/coach/openAiCoachProvider.ts y app/api/chat/route.ts usan
  Meta Muse (meta-muse-spark via META_MUSE_MODEL, https://api.meta.ai/v1/chat/completions
  via META_MUSE_BASE_URL, y META_MUSE_API_KEY con fallback a OPENAI_API_KEY), sin
  enviar tools ni tool_choice.'
- 'AC2: apps/web/components/CoachModelSelect.tsx muestra la insignia informativa estática
  ''Meta Muse · Spark'' sin elementos <select> ni <option>.'
- 'AC3: useCoachConversation envía Authorization: Bearer mvp-direct cuando no hay
  sesión OTP activa; SupabaseIdentityService autentica Bearer mvp-direct como MVP_USER_ID;
  SupabaseHealthContext carga el snapshot de salud real de MVP_USER_ID sin exigir
  fila en coach_profile_links; y SupabaseConversationRepository auto-crea o resuelve
  de forma resiliente la conversación cuando expectedRevision === 1 sin lanzar 404
  ni bloquear el llamado al LLM por RLS.'
- 'AC4: ADR-005 y las suites de pruebas chat-server.test.mjs y chat-client.test.mjs
  se actualizan a Meta Muse (meta-muse-spark / Meta Muse · Spark), pasando ies gate,
  next build y actualización de versionInfo.ts/package.json a 0.7.0.'
allowlist:
- apps/web/lib/infra/coach/openAiCoachProvider.ts
- apps/web/app/api/chat/route.ts
- apps/web/components/CoachModelSelect.tsx
- apps/web/hooks/useCoachConversation.ts
- apps/web/lib/infra/auth/supabaseIdentityService.ts
- apps/web/lib/infra/health/supabaseHealthContext.ts
- apps/web/lib/infra/chat/supabaseConversationRepository.ts
- apps/web/tests/chat-server/coach-provider.test.mjs
- apps/web/tests/chat-server/api-routes.test.mjs
- apps/web/tests/chat-client/model-select-static.test.mjs
- apps/web/tests/chat-client/viewmodel-sync.test.mjs
- apps/web/lib/versionInfo.ts
- apps/web/lib/version.test.mjs
- apps/web/CHANGELOG.md
- apps/web/README.md
- apps/web/package.json
- apps/web/package-lock.json
- deliverables/T-0046.md
created_at: '2026-11-02T23:10:47Z'
started_at: null
completed_at: null
blocked_reason: null
superseded_by: null
superseded_reason: null
terminal_status: null
output_ref: null
approval:
  required: true
  approved_by: null
  approved_at: null
metrics: {}
edits: []
```
