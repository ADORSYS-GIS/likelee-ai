-- 014_messaging.sql
-- Consolidated migration for messaging hub
-- Source files: 2026-04-02_messaging_hub.sql, 2026-04-02_messaging_enhancements.sql

BEGIN;

-- ============================================================================
-- 1. CONVERSATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Conversation Type
    conversation_type text NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group', 'support')),
    
    -- Subject (polymorphic)
    subject_type text, -- 'campaign', 'booking', 'offer', 'licensing_request'
    subject_id uuid,
    
    -- Metadata
    title text,
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Timestamps
    last_message_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_subject ON public.conversations(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.conversations(created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CONVERSATION PARTICIPANTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    
    -- Participant (polymorphic)
    participant_type text NOT NULL CHECK (participant_type IN ('agency', 'brand', 'creator', 'talent')),
    participant_id uuid NOT NULL,
    
    -- Role in conversation
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    
    -- Notification settings
    notifications_enabled boolean DEFAULT true,
    
    -- Read tracking
    last_read_at timestamptz,
    unread_count integer DEFAULT 0,
    
    -- Status
    joined_at timestamptz NOT NULL DEFAULT now(),
    left_at timestamptz,
    is_active boolean DEFAULT true,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (conversation_id, participant_type, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_participant ON public.conversation_participants(participant_type, participant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON public.conversation_participants(conversation_id, is_active);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_unread ON public.conversation_participants(participant_type, participant_id, unread_count) WHERE unread_count > 0;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversation_participants;
CREATE POLICY "Participants can view their conversations" ON public.conversation_participants
    FOR SELECT USING (
        (participant_type = 'agency' AND participant_id = auth.uid()) OR
        (participant_type = 'brand' AND participant_id = auth.uid()) OR
        (participant_type = 'creator' AND participant_id = auth.uid())
    );

-- ============================================================================
-- 3. MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    
    -- Sender (polymorphic)
    sender_type text NOT NULL CHECK (sender_type IN ('agency', 'brand', 'creator', 'talent', 'system')),
    sender_id uuid NOT NULL,
    
    -- Message Content
    message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    content text NOT NULL,
    
    -- For media messages
    media_urls text[],
    file_name text,
    file_size bigint,
    mime_type text,
    
    -- Metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Status
    is_edited boolean DEFAULT false,
    edited_at timestamptz,
    is_deleted boolean DEFAULT false,
    deleted_at timestamptz,
    
    -- Reply to
    reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.messages;
CREATE POLICY "Participants can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
                AND cp.is_active = true
                AND (
                    (cp.participant_type = 'agency' AND cp.participant_id = auth.uid()) OR
                    (cp.participant_type = 'brand' AND cp.participant_id = auth.uid()) OR
                    (cp.participant_type = 'creator' AND cp.participant_id = auth.uid())
                )
        )
    );

DROP POLICY IF EXISTS "Participants can send messages to their conversations" ON public.messages;
CREATE POLICY "Participants can send messages to their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        (sender_type = 'agency' AND sender_id = auth.uid()) OR
        (sender_type = 'brand' AND sender_id = auth.uid()) OR
        (sender_type = 'creator' AND sender_id = auth.uid())
    );

-- ============================================================================
-- 4. MESSAGE REACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- Reactor (polymorphic)
    reactor_type text NOT NULL CHECK (reactor_type IN ('agency', 'brand', 'creator', 'talent')),
    reactor_id uuid NOT NULL,
    
    -- Reaction
    reaction text NOT NULL, -- emoji or reaction name
    
    created_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (message_id, reactor_type, reactor_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_reactor ON public.message_reactions(reactor_type, reactor_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CONVERSATION READ RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_read_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    
    -- Reader (polymorphic)
    reader_type text NOT NULL CHECK (reader_type IN ('agency', 'brand', 'creator', 'talent')),
    reader_id uuid NOT NULL,
    
    read_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (message_id, reader_type, reader_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_read_receipts_message ON public.conversation_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_receipts_conversation ON public.conversation_read_receipts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_read_receipts_reader ON public.conversation_read_receipts(reader_type, reader_id);

ALTER TABLE public.conversation_read_receipts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. MESSAGE ATTACHMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    
    -- File Details
    file_name text NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    public_url text,
    
    -- Metadata
    file_size bigint,
    mime_type text,
    width integer,
    height integer,
    duration_sec integer, -- for video/audio
    
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CONVERSATION BLOCKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    
    -- Blocker (polymorphic)
    blocker_type text NOT NULL CHECK (blocker_type IN ('agency', 'brand', 'creator', 'talent')),
    blocker_id uuid NOT NULL,
    
    -- Blocked user (polymorphic)
    blocked_type text NOT NULL CHECK (blocked_type IN ('agency', 'brand', 'creator', 'talent')),
    blocked_id uuid NOT NULL,
    
    reason text,
    
    created_at timestamptz NOT NULL DEFAULT now(),
    
    UNIQUE (conversation_id, blocker_type, blocker_id, blocked_type, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_blocks_conversation ON public.conversation_blocks(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_blocks_blocker ON public.conversation_blocks(blocker_type, blocker_id);

ALTER TABLE public.conversation_blocks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Update conversation last_message_at
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
    
    -- Increment unread count for other participants
    UPDATE public.conversation_participants
    SET unread_count = unread_count + 1
    WHERE conversation_id = NEW.conversation_id
        AND is_active = true
        AND NOT (
            participant_type = NEW.sender_type AND participant_id = NEW.sender_id
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Mark as read when participant reads
CREATE OR REPLACE FUNCTION public.mark_conversation_read()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversation_participants
    SET last_read_at = now(),
        unread_count = 0
    WHERE conversation_id = NEW.conversation_id
        AND participant_type = NEW.participant_type
        AND participant_id = NEW.participant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enforce message update invariants (prevent editing deleted messages)
CREATE OR REPLACE FUNCTION public.enforce_message_update_invariants()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_deleted = true THEN
        RAISE EXCEPTION 'Cannot modify deleted messages';
    END IF;
    
    -- Track edit
    IF OLD.content != NEW.content THEN
        NEW.is_edited := true;
        NEW.edited_at := now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_message_update_invariants ON public.messages;
CREATE TRIGGER trigger_enforce_message_update_invariants
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_message_update_invariants();

COMMIT;
