import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IConversationRepository,
  ClaimOperationResult,
} from "../../chat/application/ports";
import type {
  Conversation,
  Message,
  Operation,
} from "../../chat/domain/types";
import {
  ConcurrencyConflictError,
  NotFoundError,
  OperationLeaseActiveError,
} from "../../chat/domain/errors";
import { computeLeaseUntil, isOperationLeaseActive } from "../../chat/domain/operation";
import { createSupabaseServiceClient, getSupabaseAnon, MVP_USER_ID } from "../supabase";

const mvpFallbackConversations = new Map<string, Conversation>();
const mvpFallbackMessages = new Map<string, Message[]>();
const mvpFallbackOperations = new Map<string, Operation>();

export interface SupabaseConversationRepositoryOptions {
  supabaseClient?: SupabaseClient;
}

export class SupabaseConversationRepository implements IConversationRepository {
  private readonly supabaseClient: SupabaseClient;

  constructor(options: SupabaseConversationRepositoryOptions = {}) {
    this.supabaseClient =
      options.supabaseClient || createSupabaseServiceClient() || getSupabaseAnon();
  }

  async getConversation(ownerId: string, conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from("coach_conversations")
        .select("id, owner_id, title, revision, created_at, updated_at")
        .eq("id", conversationId)
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          ownerId: data.owner_id,
          title: data.title,
          revision: data.revision,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    } catch {
      // Fallback for MVP direct mode below
    }

    if (ownerId === MVP_USER_ID) {
      const fallback = mvpFallbackConversations.get(conversationId);
      if (fallback && fallback.ownerId === ownerId) {
        return { ...fallback };
      }
    }

    return null;
  }

  private async ensureConversationWithId(
    ownerId: string,
    conversationId: string,
    title: string
  ): Promise<Conversation> {
    const nowIso = new Date().toISOString();
    try {
      const { data, error } = await this.supabaseClient
        .from("coach_conversations")
        .insert({
          id: conversationId,
          owner_id: ownerId,
          title,
          revision: 1,
        })
        .select("id, owner_id, title, revision, created_at, updated_at")
        .single();

      if (!error && data) {
        const created: Conversation = {
          id: data.id,
          ownerId: data.owner_id,
          title: data.title,
          revision: data.revision,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        if (ownerId === MVP_USER_ID) {
          mvpFallbackConversations.set(created.id, created);
        }
        return created;
      }
    } catch {
      // Use in-memory fallback for MVP_USER_ID below
    }

    const fallbackConv: Conversation = {
      id: conversationId,
      ownerId,
      title,
      revision: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    mvpFallbackConversations.set(conversationId, fallbackConv);
    if (!mvpFallbackMessages.has(conversationId)) {
      mvpFallbackMessages.set(conversationId, []);
    }
    return { ...fallbackConv };
  }

  async createConversation(ownerId: string, title: string): Promise<Conversation> {
    try {
      const { data, error } = await this.supabaseClient
        .from("coach_conversations")
        .insert({
          owner_id: ownerId,
          title,
          revision: 1,
        })
        .select("id, owner_id, title, revision, created_at, updated_at")
        .single();

      if (!error && data) {
        const created: Conversation = {
          id: data.id,
          ownerId: data.owner_id,
          title: data.title,
          revision: data.revision,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        if (ownerId === MVP_USER_ID) {
          mvpFallbackConversations.set(created.id, created);
        }
        return created;
      }

      if (ownerId !== MVP_USER_ID) {
        throw new Error(`Error al crear la conversación: ${error?.message || "Sin datos"}`);
      }
    } catch (err) {
      if (ownerId !== MVP_USER_ID) {
        throw err;
      }
    }

    return this.ensureConversationWithId(ownerId, crypto.randomUUID(), title);
  }

  async listConversations(
    ownerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ conversations: Conversation[]; total: number }> {
    try {
      const { data, error, count } = await this.supabaseClient
        .from("coach_conversations")
        .select("id, owner_id, title, revision, created_at, updated_at", { count: "exact" })
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        if (ownerId !== MVP_USER_ID) {
          throw new Error(`Error al listar conversaciones: ${error.message}`);
        }
      } else {
        const dbConversations: Conversation[] = (data || []).map((row) => ({
          id: row.id,
          ownerId: row.owner_id,
          title: row.title,
          revision: row.revision,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        if (ownerId !== MVP_USER_ID || mvpFallbackConversations.size === 0) {
          return {
            conversations: dbConversations,
            total: count ?? dbConversations.length,
          };
        }

        const seen = new Set(dbConversations.map((c) => c.id));
        const merged = [...dbConversations];
        for (const fallback of mvpFallbackConversations.values()) {
          if (fallback.ownerId === ownerId && !seen.has(fallback.id)) {
            merged.push({ ...fallback });
          }
        }
        merged.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        return {
          conversations: merged.slice(offset, offset + limit),
          total: Math.max(count ?? 0, merged.length),
        };
      }
    } catch (err) {
      if (ownerId !== MVP_USER_ID) {
        throw err;
      }
    }

    const fallbackList = Array.from(mvpFallbackConversations.values())
      .filter((c) => c.ownerId === ownerId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return {
      conversations: fallbackList.slice(offset, offset + limit),
      total: fallbackList.length,
    };
  }

  async listMessages(ownerId: string, conversationId: string): Promise<Message[] | null> {
    const conv = await this.getConversation(ownerId, conversationId);
    if (!conv) {
      if (ownerId === MVP_USER_ID) {
        return mvpFallbackMessages.get(conversationId) ?? [];
      }
      return null;
    }

    try {
      const { data, error } = await this.supabaseClient
        .from("coach_messages")
        .select("id, conversation_id, owner_id, sequence, role, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("owner_id", ownerId)
        .order("sequence", { ascending: true });

      if (error) {
        if (ownerId !== MVP_USER_ID) {
          throw new Error(`Error al leer mensajes: ${error.message}`);
        }
      } else {
        const dbMessages: Message[] = (data || []).map((row) => ({
          id: row.id,
          conversationId: row.conversation_id,
          ownerId: row.owner_id,
          sequence: row.sequence,
          role: row.role as Message["role"],
          content: row.content,
          createdAt: row.created_at,
        }));

        if (dbMessages.length > 0 || ownerId !== MVP_USER_ID) {
          return dbMessages;
        }
      }
    } catch (err) {
      if (ownerId !== MVP_USER_ID) {
        throw err;
      }
    }

    return [...(mvpFallbackMessages.get(conversationId) || [])];
  }

  async getOperation(ownerId: string, operationId: string): Promise<Operation | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from("coach_operations")
        .select("owner_id, operation_id, conversation_id, status, result_message_id, lease_until, created_at")
        .eq("owner_id", ownerId)
        .eq("operation_id", operationId)
        .maybeSingle();

      if (!error && data) {
        return {
          ownerId: data.owner_id,
          operationId: data.operation_id,
          conversationId: data.conversation_id,
          status: data.status,
          resultMessageId: data.result_message_id,
          leaseUntil: data.lease_until,
          createdAt: data.created_at,
        };
      }
    } catch {
      // Fallback below
    }

    if (ownerId === MVP_USER_ID) {
      return mvpFallbackOperations.get(`${ownerId}:${operationId}`) || null;
    }

    return null;
  }

  async claimOperation(
    ownerId: string,
    operationId: string,
    conversationId: string,
    expectedRevision: number,
    userMessageContent: string
  ): Promise<ClaimOperationResult> {
    let conv = await this.getConversation(ownerId, conversationId);
    if (!conv && ownerId === MVP_USER_ID && expectedRevision === 1) {
      const autoTitle = userMessageContent.trim().slice(0, 80) || "Conversación";
      conv = await this.ensureConversationWithId(ownerId, conversationId, autoTitle);
    }

    if (!conv) {
      throw new NotFoundError("Conversación no encontrada");
    }

    // 1. Verificar si la operación ya existe (idempotencia previa a chequeo de concurrencia)
    const existingOp = await this.getOperation(ownerId, operationId);
    const now = new Date();

    if (existingOp) {
      if (existingOp.status === "completed") {
        if (!existingOp.resultMessageId) {
          throw new Error("Operación marcada como completada pero sin mensaje de resultado");
        }
        let assistantMessage: Message | null = null;
        try {
          const { data: msgData, error: msgError } = await this.supabaseClient
            .from("coach_messages")
            .select("id, conversation_id, owner_id, sequence, role, content, created_at")
            .eq("id", existingOp.resultMessageId)
            .eq("owner_id", ownerId)
            .single();

          if (!msgError && msgData) {
            assistantMessage = {
              id: msgData.id,
              conversationId: msgData.conversation_id,
              ownerId: msgData.owner_id,
              sequence: msgData.sequence,
              role: msgData.role as Message["role"],
              content: msgData.content,
              createdAt: msgData.created_at,
            };
          }
        } catch {
          // Check fallback below
        }

        if (!assistantMessage && ownerId === MVP_USER_ID) {
          const fallbackMsgs = mvpFallbackMessages.get(conversationId) || [];
          assistantMessage =
            fallbackMsgs.find((m) => m.id === existingOp.resultMessageId) || null;
        }

        if (!assistantMessage) {
          throw new Error("No se pudo recuperar el mensaje resultante de la operación completada");
        }

        return {
          status: "ALREADY_COMPLETED",
          operation: existingOp,
          assistantMessage,
          conversation: conv,
        };
      }

      if (isOperationLeaseActive(existingOp, now)) {
        throw new OperationLeaseActiveError(
          "Existe una operación en curso con lease activo para esta solicitud"
        );
      }
    }

    // 2. Si es una operación nueva o rescate, verificar revisión de concurrencia
    if (conv.revision !== expectedRevision) {
      throw new ConcurrencyConflictError(
        `Conflicto de concurrencia: revisión esperada ${expectedRevision}, actual ${conv.revision}`
      );
    }

    const leaseUntil = computeLeaseUntil(now);
    const nowIso = now.toISOString();

    try {
      // Calcular siguiente sequence para el mensaje
      const { count, error: countErr } = await this.supabaseClient
        .from("coach_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("owner_id", ownerId);

      if (countErr) {
        throw new Error(`Error al contar mensajes existentes: ${countErr.message}`);
      }

      const nextSeq = (count ?? 0) + 1;

      // Guardar mensaje de usuario
      const { data: userMsgData, error: userMsgErr } = await this.supabaseClient
        .from("coach_messages")
        .insert({
          conversation_id: conversationId,
          owner_id: ownerId,
          sequence: nextSeq,
          role: "user",
          content: userMessageContent,
        })
        .select("id, conversation_id, owner_id, sequence, role, content, created_at")
        .single();

      if (userMsgErr || !userMsgData) {
        throw new Error(`Error al persistir mensaje de usuario: ${userMsgErr?.message || "Sin datos"}`);
      }

      const userMessage: Message = {
        id: userMsgData.id,
        conversationId: userMsgData.conversation_id,
        ownerId: userMsgData.owner_id,
        sequence: userMsgData.sequence,
        role: userMsgData.role as Message["role"],
        content: userMsgData.content,
        createdAt: userMsgData.created_at,
      };

      const { data: opData, error: opErr } = await this.supabaseClient
        .from("coach_operations")
        .upsert({
          owner_id: ownerId,
          operation_id: operationId,
          conversation_id: conversationId,
          status: "in_progress",
          result_message_id: null,
          lease_until: leaseUntil,
        })
        .select("owner_id, operation_id, conversation_id, status, result_message_id, lease_until, created_at")
        .single();

      if (opErr || !opData) {
        throw new Error(`Error al registrar operación: ${opErr?.message || "Sin datos"}`);
      }

      const operation: Operation = {
        ownerId: opData.owner_id,
        operationId: opData.operation_id,
        conversationId: opData.conversation_id,
        status: opData.status,
        resultMessageId: opData.result_message_id,
        leaseUntil: opData.lease_until,
        createdAt: opData.created_at,
      };

      return {
        status: "CLAIMED",
        operation,
        userMessage,
        conversation: conv,
      };
    } catch (err) {
      if (ownerId !== MVP_USER_ID) {
        throw err;
      }

      const msgs = mvpFallbackMessages.get(conversationId) || [];
      const nextSeq = msgs.length + 1;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        ownerId,
        sequence: nextSeq,
        role: "user",
        content: userMessageContent,
        createdAt: nowIso,
      };
      msgs.push(userMessage);
      mvpFallbackMessages.set(conversationId, msgs);

      const operation: Operation = {
        ownerId,
        operationId,
        conversationId,
        status: "in_progress",
        resultMessageId: null,
        leaseUntil,
        createdAt: nowIso,
      };
      mvpFallbackOperations.set(`${ownerId}:${operationId}`, operation);
      mvpFallbackConversations.set(conversationId, conv);

      return {
        status: "CLAIMED",
        operation,
        userMessage,
        conversation: conv,
      };
    }
  }

  async completeOperation(
    ownerId: string,
    operationId: string,
    conversationId: string,
    assistantMessageContent: string
  ): Promise<{ assistantMessage: Message; conversation: Conversation }> {
    const nowIso = new Date().toISOString();

    try {
      // Siguiente secuencia para assistant
      const { count, error: countErr } = await this.supabaseClient
        .from("coach_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conversationId)
        .eq("owner_id", ownerId);

      if (countErr) {
        throw new Error(`Error al contar mensajes para respuesta: ${countErr.message}`);
      }

      const nextSeq = (count ?? 0) + 1;

      // Guardar respuesta del asistente
      const { data: asstData, error: asstErr } = await this.supabaseClient
        .from("coach_messages")
        .insert({
          conversation_id: conversationId,
          owner_id: ownerId,
          sequence: nextSeq,
          role: "assistant",
          content: assistantMessageContent,
        })
        .select("id, conversation_id, owner_id, sequence, role, content, created_at")
        .single();

      if (asstErr || !asstData) {
        throw new Error(`Error al persistir mensaje de asistente: ${asstErr?.message || "Sin datos"}`);
      }

      const assistantMessage: Message = {
        id: asstData.id,
        conversationId: asstData.conversation_id,
        ownerId: asstData.owner_id,
        sequence: asstData.sequence,
        role: asstData.role as Message["role"],
        content: asstData.content,
        createdAt: asstData.created_at,
      };

      // Incrementar revisión en conversación
      const conv = await this.getConversation(ownerId, conversationId);
      const newRevision = (conv?.revision ?? 1) + 1;

      const { data: updatedConvData, error: convErr } = await this.supabaseClient
        .from("coach_conversations")
        .update({
          revision: newRevision,
          updated_at: nowIso,
        })
        .eq("id", conversationId)
        .eq("owner_id", ownerId)
        .select("id, owner_id, title, revision, created_at, updated_at")
        .single();

      if (convErr || !updatedConvData) {
        throw new Error(`Error al actualizar revisión de conversación: ${convErr?.message}`);
      }

      const conversation: Conversation = {
        id: updatedConvData.id,
        ownerId: updatedConvData.owner_id,
        title: updatedConvData.title,
        revision: updatedConvData.revision,
        createdAt: updatedConvData.created_at,
        updatedAt: updatedConvData.updated_at,
      };

      // Marcar operación completada con resultado
      await this.supabaseClient
        .from("coach_operations")
        .update({
          status: "completed",
          result_message_id: assistantMessage.id,
        })
        .eq("owner_id", ownerId)
        .eq("operation_id", operationId);

      return { assistantMessage, conversation };
    } catch (err) {
      if (ownerId !== MVP_USER_ID) {
        throw err;
      }

      const msgs = mvpFallbackMessages.get(conversationId) || [];
      const nextSeq = msgs.length + 1;
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversationId,
        ownerId,
        sequence: nextSeq,
        role: "assistant",
        content: assistantMessageContent,
        createdAt: nowIso,
      };
      msgs.push(assistantMessage);
      mvpFallbackMessages.set(conversationId, msgs);

      const currentConv =
        mvpFallbackConversations.get(conversationId) ||
        (await this.getConversation(ownerId, conversationId)) || {
          id: conversationId,
          ownerId,
          title: "Conversación",
          revision: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

      const updatedConv: Conversation = {
        ...currentConv,
        revision: currentConv.revision + 1,
        updatedAt: nowIso,
      };
      mvpFallbackConversations.set(conversationId, updatedConv);

      const opKey = `${ownerId}:${operationId}`;
      const existingOp = mvpFallbackOperations.get(opKey);
      if (existingOp) {
        mvpFallbackOperations.set(opKey, {
          ...existingOp,
          status: "completed",
          resultMessageId: assistantMessage.id,
        });
      }

      return { assistantMessage, conversation: updatedConv };
    }
  }

  async failOperation(ownerId: string, operationId: string, _errorReason: string): Promise<void> {
    try {
      await this.supabaseClient
        .from("coach_operations")
        .update({
          status: "failed",
        })
        .eq("owner_id", ownerId)
        .eq("operation_id", operationId);
    } catch {
      // Ignore DB failure in fallback mode
    }

    if (ownerId === MVP_USER_ID) {
      const opKey = `${ownerId}:${operationId}`;
      const existingOp = mvpFallbackOperations.get(opKey);
      if (existingOp) {
        mvpFallbackOperations.set(opKey, {
          ...existingOp,
          status: "failed",
        });
      }
    }
  }
}
