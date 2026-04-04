-- 2026-04-02_messaging_hub.sql
-- HB-13: Two-Way Real-Time Communication Hub
-- Each (agency, creator) pair has exactly one isolated conversation thread.
-- RLS ensures participants can only access their own conversations.

BEGIN;

-- 1. Conversations table
-- One private thread per (agency, creator) pair (enforced by UNIQUE constraint)
CREATE TABLE IF NOT EXISTS public.conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id     UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    creator_id    UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Ensures data isolation: one thread per pair, no cross-agency leakage
    UNIQUE (agency_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_agency_id  ON public.conversations(agency_id);
CREATE INDEX IF NOT EXISTS idx_conversations_creator_id ON public.conversations(creator_id);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content         TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id       ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at      ON public.messages(created_at DESC);

-- 3. RLS: Conversations
-- Only the agency or creator who are participants can see or insert into their thread.
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
    ON public.conversations
    FOR SELECT
    USING (
        auth.uid() = agency_id
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Agency can create a conversation" ON public.conversations;
CREATE POLICY "Agency can create a conversation"
    ON public.conversations
    FOR INSERT
    WITH CHECK (auth.uid() = agency_id);

-- 4. RLS: Messages
-- Only participants in the parent conversation can read or write messages.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.agency_id = auth.uid() OR c.creator_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.agency_id = auth.uid() OR c.creator_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Recipients can mark messages as read" ON public.messages;
CREATE POLICY "Recipients can mark messages as read"
    ON public.messages
    FOR UPDATE
    USING (
        sender_id <> auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.agency_id = auth.uid() OR c.creator_id = auth.uid())
        )
    )
    WITH CHECK (is_read = TRUE);

DROP POLICY IF EXISTS "Senders can edit or delete their own messages" ON public.messages;
CREATE POLICY "Senders can edit or delete their own messages"
    ON public.messages
    FOR UPDATE
    USING (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = conversation_id
              AND (c.agency_id = auth.uid() OR c.creator_id = auth.uid())
        )
    )
    WITH CHECK (
        auth.uid() = sender_id
    );

 -- 4.1 Tighten UPDATE permissions to prevent client-side message tampering.
 -- RLS policies cannot constrain columns, so we restrict UPDATE privileges to `is_read`, `content`, `is_deleted`, `edited_at`.
 REVOKE UPDATE ON TABLE public.messages FROM anon, authenticated;
 GRANT UPDATE (is_read, content, is_deleted, edited_at) ON TABLE public.messages TO authenticated;

 -- 4.2 Enforce column-level invariants for message updates.
 -- Recipients are allowed to mark messages as read, but must not be able to edit/delete content.
 CREATE OR REPLACE FUNCTION public.enforce_message_update_invariants()
 RETURNS trigger
 LANGUAGE plpgsql
 AS $$
 BEGIN
   IF auth.uid() IS NULL THEN
     RETURN NEW;
   END IF;

   -- Non-senders may only update the read flag.
   IF auth.uid() <> OLD.sender_id THEN
     IF NEW.content IS DISTINCT FROM OLD.content
       OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
       OR NEW.edited_at IS DISTINCT FROM OLD.edited_at
     THEN
       RAISE EXCEPTION 'not_allowed';
     END IF;
   END IF;

   RETURN NEW;
 END;
 $$;

 DROP TRIGGER IF EXISTS trg_enforce_message_update_invariants ON public.messages;
 CREATE TRIGGER trg_enforce_message_update_invariants
 BEFORE UPDATE ON public.messages
 FOR EACH ROW
 EXECUTE FUNCTION public.enforce_message_update_invariants();
 
 -- 5. Enable Supabase Realtime on messages table
 -- NOTE: Also enable via Supabase Dashboard: Database > Replication > supabase_realtime
 ALTER TABLE public.messages REPLICA IDENTITY FULL;

COMMIT;
