import test from "node:test";
import assert from "node:assert";

test("REQ-015 / P15: OpenAiCoachProvider (MetaMuseCoachProvider) usa meta-muse-spark y https://api.meta.ai/v1/chat/completions sin tools", async () => {
  const {
    OpenAiCoachProvider,
    MetaMuseCoachProvider,
    EXCLUSIVE_MODEL,
    DEFAULT_META_MUSE_API_URL,
  } = await import("../../lib/infra/coach/openAiCoachProvider.ts");

  assert.strictEqual(EXCLUSIVE_MODEL, "meta-muse-spark");
  assert.strictEqual(DEFAULT_META_MUSE_API_URL, "https://api.meta.ai/v1/chat/completions");
  assert.strictEqual(MetaMuseCoachProvider, OpenAiCoachProvider);

  let capturedUrl = null;
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Respuesta generada por Meta Muse Spark.",
            },
          },
        ],
      }),
    };
  };

  const provider = new OpenAiCoachProvider({
    apiKey: "example-mock-key", // mock fixture
    fetchFn: mockFetch,
  });

  const reply = await provider.generateCoachResponse("Contexto del coach: HRV 60", [
    { role: "user", content: "¿Como debo correr hoy?" },
  ]);

  assert.strictEqual(reply, "Respuesta generada por Meta Muse Spark.");
  assert.strictEqual(capturedUrl, "https://api.meta.ai/v1/chat/completions");

  const body = JSON.parse(capturedOptions.body);

  // REQ-015: Modelo exacto meta-muse-spark
  assert.strictEqual(body.model, "meta-muse-spark");

  // REQ-015: CERO reasoning_effort, CERO tools, CERO temperature, CERO top_p
  assert.strictEqual("reasoning_effort" in body, false, "No debe enviar reasoning_effort");
  assert.strictEqual("temperature" in body, false, "No debe enviar temperature");
  assert.strictEqual("top_p" in body, false, "No debe enviar top_p");
  assert.strictEqual("tools" in body, false, "No debe configurar tools");
  assert.strictEqual("tool_choice" in body, false, "No debe configurar tool_choice");

  // Mensajes: system context + historial
  assert.strictEqual(body.messages.length, 2);
  assert.strictEqual(body.messages[0].role, "system");
  assert.strictEqual(body.messages[0].content, "Contexto del coach: HRV 60");
  assert.strictEqual(body.messages[1].role, "user");
  assert.strictEqual(body.messages[1].content, "¿Como debo correr hoy?");
});

test("OpenAiCoachProvider normaliza baseUrl agregando /chat/completions cuando no termina en esa ruta", async () => {
  const { OpenAiCoachProvider } = await import(
    "../../lib/infra/coach/openAiCoachProvider.ts"
  );

  let capturedUrl = null;
  const mockFetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { role: "assistant", content: "OK" } }],
      }),
    };
  };

  const provider = new OpenAiCoachProvider({
    apiKey: "example-mock-key", // mock fixture
    baseUrl: "https://api.meta.ai/v1/",
    model: "meta-muse-spark",
    fetchFn: mockFetch,
  });

  await provider.generateCoachResponse("Prompt", [{ role: "user", content: "Hola" }]);
  assert.strictEqual(capturedUrl, "https://api.meta.ai/v1/chat/completions");
});

test("REQ-016 / P16: OpenAiCoachProvider ante error HTTP lanza error tipificado sin fallback", async () => {
  const { OpenAiCoachProvider, CoachProviderError } = await import(
    "../../lib/infra/coach/openAiCoachProvider.ts"
  );

  const errorStatuses = [401, 403, 404, 429, 500, 502, 503];

  for (const status of errorStatuses) {
    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      return {
        ok: false,
        status,
        statusText: `Error HTTP ${status}`,
        json: async () => ({ error: { message: `Meta Muse failed with ${status}` } }),
      };
    };

    const provider = new OpenAiCoachProvider({
      apiKey: "example-mock-key", // mock fixture
      fetchFn: mockFetch,
    });

    await assert.rejects(
      async () => {
        await provider.generateCoachResponse("Prompt", [{ role: "user", content: "Pregunta" }]);
      },
      (err) => {
        assert.ok(err instanceof CoachProviderError);
        assert.strictEqual(err.statusCode, status);
        return true;
      }
    );

    // Exactamente 1 llamada efectuada: cero intentos de fallback a otros modelos
    assert.strictEqual(callCount, 1, `Fallo ${status} no debe disparar llamada de fallback`);
  }
});
