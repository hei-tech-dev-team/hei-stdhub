-- Colonne de référence pour les réponses à un message
ALTER TABLE messages
  ADD COLUMN reply_to_id INTEGER NULL
    REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX idx_msg_reply_to ON messages(reply_to_id);

-- Table pour stocker les réactions (emoji) aux messages
CREATE TABLE message_reactions (
  id         SERIAL      PRIMARY KEY,
  message_id INTEGER     NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  emoji      VARCHAR(10) NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user    ON message_reactions(user_id);