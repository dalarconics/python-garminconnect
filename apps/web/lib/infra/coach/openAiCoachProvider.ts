import type { ICoachProviderPort } from "../../chat/application/ports";
import { CoachProviderError } from "../../chat/domain/errors";

export { CoachProviderError };

export const EXCLUSIVE_MODEL = "meta-muse-spark";
export const DEFAULT_META_MUSE_API_URL = "https://api.meta.ai/v1/chat/completions";

function normalizeChatCompletionsUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_META_MUSE_API_URL;
  }
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }
  return `${trimmed}/chat/completions`;
}

export interface OpenAiCoachProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

export class OpenAiCoachProvider implements ICoachProviderPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenAiCoachProviderOptions = {}) {
    this.apiKey =
      options.apiKey ||
      process.env.META_MUSE_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";
    this.baseUrl = normalizeChatCompletionsUrl(
      options.baseUrl || process.env.META_MUSE_BASE_URL
    );
    this.model =
      (options.model || process.env.META_MUSE_MODEL || EXCLUSIVE_MODEL).trim() ||
      EXCLUSIVE_MODEL;
    this.fetchFn = options.fetchFn || fetch;
  }

  async generateCoachResponse(
    contextPrompt: string,
    recentMessages: { role: string; content: string }[]
  ): Promise<string> {
    if (!this.apiKey) {
      throw new CoachProviderError(
        "El servicio del entrenador no está disponible en este momento. Intenta de nuevo más tarde.",
        503,
        "MISSING_API_KEY"
      );
    }

    const fullMessages = [
      { role: "system" as const, content: contextPrompt },
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

    const payload = {
      model: this.model,
      messages: fullMessages,
    };

    let res: Response;
    try {
      res = await this.fetchFn(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (networkErr) {
      throw new CoachProviderError(
        `Error de red al conectar con el proveedor: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`,
        502,
        "NETWORK_ERROR"
      );
    }

    if (!res.ok) {
      let errorMessage = `Meta Muse respondió con código ${res.status}`;
      try {
        const errorBody = (await res.json()) as { error?: { message?: string } };
        if (errorBody?.error?.message) {
          errorMessage = errorBody.error.message;
        }
      } catch {
        // Non-JSON response
      }

      throw new CoachProviderError(errorMessage, res.status, `META_MUSE_HTTP_${res.status}`);
    }

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      throw new CoachProviderError("Respuesta no válida del proveedor de inferencia", 502, "INVALID_RESPONSE_JSON");
    }

    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new CoachProviderError("El proveedor de inferencia no devolvió contenido", 502, "EMPTY_CHOICE");
    }

    return reply;
  }
}

export const MetaMuseCoachProvider = OpenAiCoachProvider;
