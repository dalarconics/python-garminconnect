"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CoachModelSelect } from "@/components/CoachModelSelect";
import {
  chatHref,
  getSurvivingLegacyChats,
  mergeConversations,
  setPendingFirstMessage,
  type StoredChat,
} from "@/lib/coachStorage";
import { formatDateEsCO } from "@/lib/lastUpdated";
import { useCoachConversation } from "@/hooks/useCoachConversation";
import { ClientAuthService } from "@/lib/infra/auth/clientAuthService";

const QUICK_ACTIONS = [
  { label: "🏃 Analizar sesión de hoy", prompt: "Analiza mi sesión de entrenamiento de hoy y dame recomendaciones." },
  { label: "🔋 Revisar mi recuperación", prompt: "¿Cómo está mi estado de recuperación y preparación para entrenar?" },
  { label: "📈 Ajustar carga semanal", prompt: "¿Cómo debería ajustar la carga de entrenamiento para esta semana?" },
  { label: "🎯 Plan 70.3 Cartagena", prompt: "¿Cómo va mi progresión hacia el objetivo de Ironman 70.3 Cartagena?" },
];

export function CoachChat() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [localChats, setLocalChats] = useState<StoredChat[]>([]);

  const authService = new ClientAuthService();

  useEffect(() => {
    setLocalChats(getSurvivingLegacyChats());
    void authService.getSession().then((session) => {
      setAccessToken(session?.access_token ?? null);
    });
  }, []);

  const { conversations, loadConversations, createConversation, isLoading, error } =
    useCoachConversation({
      accessToken,
    });

  useEffect(() => {
    void loadConversations({ limit: 10, offset: 0 });
  }, [loadConversations, accessToken]);

  const displayConversations = mergeConversations(conversations, localChats);

  async function openNewChat(firstMessage?: string) {
    const newId = crypto.randomUUID();
    if (firstMessage) {
      setPendingFirstMessage(newId, firstMessage);
    }
    router.push(chatHref(newId));
  }

  function handleQuickAction(prompt: string) {
    void openNewChat(prompt);
  }

  return (
    <section className="coach-chat" aria-label="Diálogo con el coach">
      <h2 className="coach-hero-title">Hola Diego, ¿cómo te ayudo?</h2>

      <div className="coach-quick-actions" role="toolbar" aria-label="Acciones rápidas con el coach">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className="coach-quick-action-pill"
            onClick={() => handleQuickAction(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>

      <form
        className="coach-composer"
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          void openNewChat(text);
        }}
      >
        <label htmlFor="coach-draft-input" className="sr-only">
          Pregunta para el entrenador
        </label>
        <textarea
          id="coach-draft-input"
          aria-label="Pregunta para el entrenador"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pregunta por tu condición, la sesión o el próximo reto…"
          rows={2}
        />
        <div className="coach-composer-bar">
          <CoachModelSelect />
          <div className="coach-composer-actions">
            <button
              type="button"
              className="coach-new"
              onClick={() => void openNewChat()}
            >
              Nueva conversación
            </button>
            <button type="submit" className="coach-send" disabled={!draft.trim()}>
              Enviar
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="dash-refresh-status error mt-0" role="alert" style={{ marginTop: "0.5rem" }}>
          {error}
        </p>
      ) : null}

      <div className="coach-history-section">
        <h2 className="coach-history-title">Últimas conversaciones</h2>
        {isLoading && displayConversations.length === 0 ? (
          <p className="muted">Cargando historial…</p>
        ) : displayConversations.length === 0 ? (
          <p className="muted">Aún no hay conversaciones registradas. Al enviar, se abre la pantalla de chat.</p>
        ) : (
          <ul className="coach-history">
            {displayConversations.map((chat) => (
              <li key={chat.id}>
                <Link href={chatHref(chat.id)} className="coach-history-item">
                  <span className="coach-history-bubble-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <div className="coach-history-item-content">
                    <span className="coach-history-item-title">{chat.title}</span>
                    <span className="coach-history-item-date muted">
                      {chat.updatedAt ? formatDateEsCO(chat.updatedAt) : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
