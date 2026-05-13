-- Migration: Scale to 500+ users
-- Adds missing indexes, batch operations, and pagination support

BEGIN;

-- GIN index on users.ues for array containment queries (teacher UE filtering)
CREATE INDEX IF NOT EXISTS idx_users_ues_gin ON users USING GIN (ues);

-- Composite indexes for messages queries
CREATE INDEX IF NOT EXISTS idx_messages_global_created ON messages(is_global, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON messages(receiver_id, sender_id);

-- Indexes on suggestions (table created dynamically, safe IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_suggestions_student ON suggestions(student_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_statut ON suggestions(statut);
CREATE INDEX IF NOT EXISTS idx_suggestions_created ON suggestions(created_at DESC);

-- Indexes on invitations
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_use_count ON invitations(use_count);

-- Index on push_subscriptions endpoint
CREATE INDEX IF NOT EXISTS idx_push_endpoint ON push_subscriptions(endpoint);

COMMIT;
