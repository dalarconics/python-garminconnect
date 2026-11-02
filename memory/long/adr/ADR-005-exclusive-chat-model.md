# ADR-005:Modelo exclusivo de producto y selección explícita de agentes

- Estado: aceptado y actualizado en T-0046 (migración a Meta Muse `meta-muse-spark`)
- Fecha: 2026-10-17 (actualizado 2026-11-02)
- Task: T-0022 (propuesta); T-0024 (materializacion); T-0046 (migracion a Meta Muse)
- Contexto: el humano solicita migrar el proveedor exclusivo del Coach de producto a Meta Muse (`meta-muse-spark`) manteniendo la insignia estática (`Meta Muse · Spark`) sin selector interactivo, configurable por entorno (`META_MUSE_API_KEY`, `META_MUSE_BASE_URL`, `META_MUSE_MODEL`).
- Decisión: Chat Completions exclusivo `meta-muse-spark` (por defecto `https://api.meta.ai/v1/chat/completions`), sin `tools`, `tool_choice`, `temperature`, `top_p` ni `reasoning_effort`, y sin selector `<select>` ni fallback silencioso a otros modelos.
- Alternativas: mantener modelo fijo sin configuración de endpoint/modelo por entorno impediría operar con Meta Muse; catálogo seleccionable en UI viola el requisito de insignia estática exclusiva (`REQ-017`).
- Consecuencias: indisponibilidad del proveedor lanza error tipado (`CoachProviderError`) sin sustituir modelo; UI exhibe la insignia informativa estática `Meta Muse · Spark`.
