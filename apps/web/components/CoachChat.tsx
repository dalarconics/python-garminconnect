"use client";

import { useEffect, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

type StoredChat = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const STORAGE_KEY = "fitness-coach-chats";
const MAX_CHATS = 4;

function loadChats(): StoredChat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredChat[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_CHATS) : [];
  } catch {
    return [];
  }
}

function saveChats(chats: StoredChat[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(chats.slice(0, MAX_CHATS)));
}

export function CoachChat() {
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChats(loadChats());
  }, []);

  const active = chats.find((c) => c.id === activeId) ?? null;

  function persist(next: StoredChat[], id: string | null) {
    const trimmed = next.slice(0, MAX_CHATS);
    setChats(trimmed);
    setActiveId(id);
    saveChats(trimmed);
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    const id = activeId ?? crypto.randomUUID();
    const prior = active?.messages ?? [];
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...prior, userMessage];
    setDraft("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const body = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
      if (!res.ok || !body.ok || !body.reply) {
        setError(body.error || "No se pudo consultar al coach");
        setSending(false);
        return;
      }
      const stored: StoredChat = {
        id,
        title: (active?.title || text).slice(0, 80),
        updatedAt: new Date().toISOString(),
        messages: [...nextMessages, { role: "assistant", content: body.reply }],
      };
      const rest = chats.filter((c) => c.id !== id);
      persist([stored, ...rest], id);
    } catch {
      setError("No se pudo consultar al coach");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="coach-chat" aria-label="Diálogo con el coach">
      <form
        className="coach-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pregunta por tu condición, la sesión o el próximo reto"
          rows={3}
          disabled={sending}
        />
        <div className="coach-composer-bar">
          <button type="button" className="coach-new" onClick={() => setActiveId(null)} disabled={sending}>
            Nueva
          </button>
          <button type="submit" className="coach-send" disabled={sending || !draft.trim()}>
            {sending ? "Pensando…" : "Enviar"}
          </button>
        </div>
      </form>
      {error ? <p className="dash-refresh-status error">{error}</p> : null}
      {active ? (
        <div className="coach-thread">
          {active.messages.map((message, index) => (
            <p key={`${active.id}-${index}`} className={`coach-bubble coach-${message.role}`}>
              {message.content}
            </p>
          ))}
        </div>
      ) : null}
      <h2 className="coach-history-title">Últimas conversaciones</h2>
      {chats.length === 0 ? (
        <p className="muted">Aún no hay conversaciones en este navegador.</p>
      ) : (
        <ul className="coach-history">
          {chats.slice(0, MAX_CHATS).map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                className={chat.id === activeId ? "coach-history-item active" : "coach-history-item"}
                onClick={() => setActiveId(chat.id)}
              >
                <span>{chat.title}</span>
                <span className="muted">{chat.updatedAt.slice(0, 10)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
