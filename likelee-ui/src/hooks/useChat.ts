import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface Participant {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: "agency" | "creator";
}

export interface Contact {
  id: string;
  display_name: string;
  avatar_url: string | null;
  contact_type: "agency" | "creator";
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_deleted?: boolean;
  edited_at?: string | null;
}

export interface Conversation {
  id: string;
  agency_id: string;
  creator_id: string;
  created_at: string;
  updated_at: string;
  agencies: {
    agency_name: string;
    logo_url: string | null;
    email: string;
  } | null;
  creators: {
    full_name: string;
    profile_photo_url: string | null;
    email: string;
  } | null;
  unread_count?: number;
  last_message_content?: string | null;
}

/**
 * Global hook to get the total unread message count across all conversations.
 * Useful for sidebar badges and notification icons.
 */
export function useUnreadMessages(currentUserId?: string) {
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", currentUserId],
    enabled: !!currentUserId,
    // Note: This relies on useChat having already fetched the data,
    // or it will fetch it itself if no cache exists.
    queryFn: async () => {
      const data = await base44.get<{ conversations: Conversation[] }>("/api/conversations");
      return data?.conversations ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => 
    conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );
}

export function useChat(currentUserId?: string, userRole?: string) {
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // 1. Load all conversation threads using TanStack Query
  const { data: conversations = [], isLoading: loadingConversations, refetch: loadConversations } = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: async () => {
      const data = await base44.get<{ conversations: Conversation[] }>("/api/conversations");
      return data?.conversations ?? [];
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Load all eligible contacts using TanStack Query
  const { data: contacts = [], isLoading: loadingContacts, refetch: loadContacts } = useQuery({
    queryKey: ["contacts", currentUserId],
    queryFn: async () => {
        const data = await base44.get<{ contacts: Contact[] }>("/api/conversations/contacts");
        return data?.contacts ?? [];
    },
    enabled: !!currentUserId,
    staleTime: 10 * 60 * 1000,
  });

  // 3. Load message history for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const data = await base44.get<{ messages: Message[] }>(
        `/api/conversations/${conversationId}/messages`,
      );
      setMessages(data?.messages ?? []);
      
      // Mark as read in local cache
      queryClient.setQueryData<Conversation[]>(["conversations", currentUserId], (prev = []) => {
        return prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c);
      });
    } finally {
      setLoadingMessages(false);
    }
  }, [currentUserId, queryClient]);

  // 4. Global Realtime Subscriptions
  useEffect(() => {
    if (!currentUserId || !supabase) return;

    const channel = supabase
      .channel(`chat-global-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;
          const isFromMe = newMsg.sender_id === currentUserId;
          const isActive = newMsg.conversation_id === activeConversationId;
          
          if (isActive) {
            setMessages((prev) => {
              // Deduplicate: If the message matches an optimistic one from us, replace it
              if (isFromMe) {
                const tempIndex = prev.findIndex(m => 
                  m.id.startsWith("temp_") && 
                  m.content === newMsg.content && 
                  m.conversation_id === newMsg.conversation_id
                );
                if (tempIndex !== -1) {
                  const newList = [...prev];
                  newList[tempIndex] = newMsg;
                  return newList;
                }
              }

              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (!isFromMe) {
                await supabase.from("messages").update({ is_read: true }).eq("id", newMsg.id);
            }
          }

          // Update global query cache
          queryClient.setQueryData<Conversation[]>(["conversations", currentUserId], (prev = []) => {
            const index = prev.findIndex((c) => c.id === newMsg.conversation_id);
            if (index === -1) {
              loadConversations(); // New thread
              return prev;
            }

            const updatedConv = {
              ...prev[index],
              last_message_content: newMsg.content,
              updated_at: newMsg.created_at,
              unread_count: (prev[index].unread_count || 0) + (!isFromMe && !isActive ? 1 : 0),
            };

            const newList = [...prev];
            newList[index] = updatedConv;
            return newList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updatedMsg = payload.new as Message;
          if (updatedMsg.conversation_id === activeConversationId) {
            setMessages((prev) => 
               prev.map(m => m.id === updatedMsg.id ? { 
                 ...m, 
                 is_read: updatedMsg.is_read,
                 content: updatedMsg.content,
                 is_deleted: updatedMsg.is_deleted,
                 edited_at: updatedMsg.edited_at
               } : m)
            );
          }

          // If it's a delete or edit, we might want to update the last message in the thread list
          if (updatedMsg.is_deleted || updatedMsg.edited_at) {
            queryClient.setQueryData<Conversation[]>(["conversations", currentUserId], (prev = []) => {
              const index = prev.findIndex((c) => c.id === updatedMsg.conversation_id);
              if (index === -1) return prev;
              const newList = [...prev];
              newList[index] = { 
                ...prev[index], 
                last_message_content: updatedMsg.is_deleted ? "This message was deleted" : updatedMsg.content 
              };
              return newList;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const updatedConv = payload.new as Conversation;
          queryClient.setQueryData<Conversation[]>(["conversations", currentUserId], (prev = []) => {
            const index = prev.findIndex((c) => c.id === updatedConv.id);
            if (index === -1) return prev;
            const newList = [...prev];
            newList[index] = { ...prev[index], ...updatedConv };
            return newList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activeConversationId, queryClient, loadConversations]);

  const openConversation = useCallback(async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await loadMessages(conversationId);
  }, [loadMessages]);

  const startConversation = useCallback(async (contactId: string, firstMessage?: string): Promise<string | null> => {
      try {
        const isUserCreator = userRole === "creator" || userRole === "talent";
        const agency_id = isUserCreator ? contactId : currentUserId;
        const creator_id = isUserCreator ? currentUserId : contactId;

        const data = await base44.post<{ conversation_id: string }>("/api/conversations/start", {
          agency_id,
          creator_id,
          content: firstMessage ?? undefined,
        });
        const id = data?.conversation_id ?? null;
        if (id) {
          loadConversations();
          openConversation(id);
        }
        return id;
      } catch {
        return null;
      }
    },
    [loadConversations, openConversation, currentUserId, userRole],
  );

  const sendMessage = useCallback(async (content: string) => {
      if (!activeConversationId || !content.trim() || !currentUserId) return;

      const tempId = `temp_${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        conversation_id: activeConversationId,
        sender_id: currentUserId,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMsg]);
      
      // Optimistic cache update
      queryClient.setQueryData<Conversation[]>(["conversations", currentUserId], (prev = []) => {
          const index = prev.findIndex(c => c.id === activeConversationId);
          if (index === -1) return prev;
          const updated = { ...prev[index], last_message_content: content.trim(), updated_at: tempMsg.created_at };
          const newList = [updated, ...prev.filter(c => c.id !== activeConversationId)];
          return newList;
      });

      setSending(true);
      try {
        await base44.post("/api/messages/send", {
          conversation_id: activeConversationId,
          content: content.trim(),
        });
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        loadConversations();
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, currentUserId, queryClient, loadConversations],
  );

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      await base44.put(`/api/messages/${messageId}`, {
        content: newContent.trim(),
      });
      // Realtime will pick up the change
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await base44.delete(`/api/messages/${messageId}`);
      // Realtime will pick up the change
    } catch (e) {
      console.error("Failed to delete message:", e);
    }
  }, []);

  const getParticipant = useCallback((conversation: Conversation, perspectiveUserId: string): Participant => {
      const isAgency = conversation.agency_id === perspectiveUserId;
      if (isAgency) {
        return {
          id: conversation.creator_id,
          name: conversation.creators?.full_name ?? "Creator",
          avatarUrl: conversation.creators?.profile_photo_url ?? null,
          role: "creator",
        };
      }
      return {
        id: conversation.agency_id,
        name: conversation.agencies?.agency_name ?? "Agency",
        avatarUrl: conversation.agencies?.logo_url ?? null,
        role: "agency",
      };
    },
    [],
  );

  return {
    conversations,
    contacts,
    activeConversationId,
    messages,
    loadingConversations,
    loadingContacts,
    loadingMessages,
    sending,
    loadConversations,
    loadContacts,
    openConversation,
    startConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    getParticipant,
  };
}
