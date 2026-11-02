import test from "node:test";
import assert from "node:assert";

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "synthetic-test-key";

test("API /api/conversations rechaza 401 sin sesion y responde no-store", async () => {
  const { GET, POST } = await import(
    "../../app/api/conversations/route.ts"
  );

  // Request GET sin header Authorization
  const getReq = new Request("http://localhost:3000/api/conversations", {
    method: "GET",
  });
  const getRes = await GET(getReq);
  assert.strictEqual(getRes.status, 401);
  assert.strictEqual(getRes.headers.get("Cache-Control"), "no-store");

  // Request POST sin header Authorization
  const postReq = new Request("http://localhost:3000/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Nueva conversacion" }),
  });
  const postRes = await POST(postReq);
  assert.strictEqual(postRes.status, 401);
  assert.strictEqual(postRes.headers.get("Cache-Control"), "no-store");
});

test("API /api/chat valida payload, auth y cache no-store", async () => {
  const { POST } = await import(
    "../../app/api/chat/route.ts"
  );

  // 1. Sin sesion -> 401
  const noAuthReq = new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: "00000000-0000-0000-0000-000000000001",
      operation_id: "00000000-0000-0000-0000-000000000002",
      content: "¿Como entreno hoy?",
      expected_revision: 1,
    }),
  });
  const noAuthRes = await POST(noAuthReq);
  assert.strictEqual(noAuthRes.status, 401);
  assert.strictEqual(noAuthRes.headers.get("Cache-Control"), "no-store");

  // 2. Con mensaje mayor a 4000 caracteres -> 400 o 401
  const longReq = new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer invalid-or-synthetic",
    },
    body: JSON.stringify({
      conversation_id: "00000000-0000-0000-0000-000000000001",
      operation_id: "00000000-0000-0000-0000-000000000002",
      content: "x".repeat(4001),
      expected_revision: 1,
    }),
  });
  const longRes = await POST(longReq);
  assert.ok(longRes.status === 400 || longRes.status === 401);
  assert.strictEqual(longRes.headers.get("Cache-Control"), "no-store");
});

test("AC3: Flujo directo MVP (Bearer mvp-direct) autentica MVP_USER_ID, carga salud sin coach_profile_links y auto-crea conversacion", async () => {
  const { SupabaseIdentityService } = await import(
    "../../lib/infra/auth/supabaseIdentityService.ts"
  );
  const { SupabaseHealthContext } = await import(
    "../../lib/infra/health/supabaseHealthContext.ts"
  );
  const { SupabaseConversationRepository } = await import(
    "../../lib/infra/chat/supabaseConversationRepository.ts"
  );
  const { MVP_USER_ID } = await import("../../lib/infra/supabase.ts");

  const identity = new SupabaseIdentityService();
  const auth = await identity.authenticateUser("Bearer mvp-direct");
  assert.strictEqual(auth.userId, MVP_USER_ID);
  assert.strictEqual(auth.email, "diego@tricoach.local");

  // Mock Supabase client que no tiene coach_profile_links ni permite escrituras por RLS
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null }),
          }),
          maybeSingle: async () => ({ data: null, error: { message: "no link" } }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: "RLS blocked" } }),
        }),
      }),
      update: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: null, error: { message: "RLS blocked" } }),
            }),
          }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: "RLS blocked" } }),
        }),
      }),
    }),
  };

  const health = new SupabaseHealthContext({ supabaseClient: mockSupabase });
  const ctx = await health.getHealthContext(MVP_USER_ID);
  assert.strictEqual(ctx.profileId, MVP_USER_ID);
  assert.match(ctx.promptText, /Eres el coach de Diego/);

  const repo = new SupabaseConversationRepository({ supabaseClient: mockSupabase });
  const convId = "00000000-0000-0000-0000-000000000999";
  const opId = "00000000-0000-0000-0000-000000000888";

  const claim = await repo.claimOperation(MVP_USER_ID, opId, convId, 1, "Hola coach");
  assert.strictEqual(claim.status, "CLAIMED");
  assert.strictEqual(claim.conversation.id, convId);

  const completed = await repo.completeOperation(
    MVP_USER_ID,
    opId,
    convId,
    "Hola Diego, listo para entrenar."
  );
  assert.strictEqual(completed.conversation.revision, 2);
  assert.strictEqual(completed.assistantMessage.content, "Hola Diego, listo para entrenar.");
});
