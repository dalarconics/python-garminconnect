"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type StoredChat,
  chatHref,
  loadChats,
  setPendingFirstMessage,
} from "@/lib/coachStorage";

export function CoachChat() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [chats, setChats] = useState<StoredChat[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    setChats(loadChats());
    void fetch("/api/chat")
      .then((res) => res.json())
      .then((body: { configured?: boolean }) => setApiOk(Boolean(body.configured)))
      .catch(() => setApiOk(false));
  }, []);

  function startConversation(text: string) {
    const id = crypto.randomUUID();
    setPendingFirstMessage(id, text);
    router.push(chatHref(id));
  }

  return (
    <section className="coach-chat" aria-label="Diálogo con el coach">
      <form
        className="coach-composer"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          startConversation(text);
        }}
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pregunta por tu condición, la sesión o el próximo reto"
          rows={3}
        />
        <div className="coach-composer-bar">
          <button
            type="button"
            className="coach-new"
            onClick={() => router.push(chatHref(crypto.randomUUID()))}
          >
            Nueva
          </button>
          <button type="submit" className="coach-send" disabled={!draft.trim()}>
            Enviar
          </button>
        </div>
      </form>

      {apiOk === false ? (
        <p className="dash-refresh-status error" style={{ marginTop: "0.5rem" }}>
          Para activar el coach, configura <code>OPENAI_API_KEY</code> en Vercel y redeploy.
        </p>
      ) : null}

      <h2 className="coach-history-title">Últimas conversaciones</h2>
      {chats.length === 0 ? (
        <p className="muted">Aún no hay conversaciones en este navegador.</p>
      ) : (
        <ul className="coach-history">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link href={chatHref(chat.id)} className="coach-history-item">
                <span>{chat.title}</span>
                <span className="muted">{chat.updatedAt.slice(0, 10)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
