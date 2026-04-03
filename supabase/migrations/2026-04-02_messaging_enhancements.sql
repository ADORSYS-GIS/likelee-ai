-- 2026-04-02_messaging_enhancements.sql
-- Add support for message editing and soft deletion

BEGIN;

-- 1. Add columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- 2. Update RLS: Messages
-- Allow senders to update their own messages (for editing content or setting is_deleted)
DROP POLICY IF EXISTS "Senders can edit or delete their own messages" ON public.messages;
CREATE POLICY "Senders can edit or delete their own messages"
    ON public.messages
    FOR UPDATE
    USING (
        auth.uid() = sender_id
    )
    WITH CHECK (
        auth.uid() = sender_id
    );

COMMIT;
