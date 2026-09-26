export const DEFAULT_OPENAI_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
] as const;

export const COACH_MODEL_STORAGE_KEY = "fitness-coach-model";

export function parseModelsEnv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function serverModelCatalog(): { models: string[]; defaultModel: string } {
  const fromEnv = parseModelsEnv(process.env.OPENAI_MODELS);
  const defaultModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const merged = [...new Set([defaultModel, ...fromEnv, ...DEFAULT_OPENAI_MODELS])];
  return { models: merged, defaultModel };
}

export function pickModel(requested: string | undefined, catalog: string[], fallback: string): string {
  if (requested && catalog.includes(requested)) return requested;
  if (catalog.includes(fallback)) return fallback;
  return catalog[0] || "gpt-4o-mini";
}

export function loadPreferredModel(defaultModel: string): string {
  if (typeof window === "undefined") return defaultModel;
  try {
    const stored = window.localStorage.getItem(COACH_MODEL_STORAGE_KEY);
    return stored || defaultModel;
  } catch {
    return defaultModel;
  }
}

export function savePreferredModel(model: string) {
  window.localStorage.setItem(COACH_MODEL_STORAGE_KEY, model);
}
