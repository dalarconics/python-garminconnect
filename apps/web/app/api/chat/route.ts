import { NextResponse } from "next/server";
import { conditionPrompt, loadCondition } from "@/lib/condition";
import { pickModel, serverModelCatalog } from "@/lib/openaiModels";

export const dynamic = "force-dynamic";

type IncomingMessage = { role?: string; content?: string };

const MAX_MESSAGES = 12;
const MAX_CHARS = 4000;

function sanitize(messages: IncomingMessage[]) {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: String(message.content || "").slice(0, MAX_CHARS),
    }))
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_MESSAGES);
}

export async function GET() {
  const { models, defaultModel } = serverModelCatalog();
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    models,
    defaultModel,
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "Falta OPENAI_API_KEY en el proyecto de Vercel" },
      { status: 503 }
    );
  }

  let payload: { messages?: IncomingMessage[]; model?: string };
  try {
    payload = (await request.json()) as { messages?: IncomingMessage[]; model?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const messages = sanitize(payload.messages || []);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, error: "Falta el mensaje" }, { status: 400 });
  }

  let system: string;
  try {
    const condition = await loadCondition();
    system = conditionPrompt(condition);
  } catch (err) {
    const error = err instanceof Error ? err.message : "No se pudo leer la condición";
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }

  const catalog = serverModelCatalog();
  const model = pickModel(payload.model, catalog.models, catalog.defaultModel);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [{ role: "system", content: system }, ...messages],
      }),
      cache: "no-store",
    });
    const body = (await res.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: body.error?.message || `OpenAI respondió ${res.status}` },
        { status: 502 }
      );
    }
    const reply = body.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ ok: false, error: "OpenAI no devolvió texto" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, reply, model });
  } catch (err) {
    const error = err instanceof Error ? err.message : "No se pudo consultar OpenAI";
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
}
