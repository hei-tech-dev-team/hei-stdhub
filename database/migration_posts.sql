DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('post', 'announcement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE attachment_kind AS ENUM ('image', 'file');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE reaction_kind AS ENUM ('like', 'haha', 'dislike', 'sad');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type post_type NOT NULL,
    title VARCHAR(150),
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT posts_announcement_requires_title
        CHECK (type = 'post' OR title IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_posts_feed
    ON posts (created_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_pinned
    ON posts (created_at DESC, id DESC)
    WHERE is_pinned AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS post_attachments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    kind        attachment_kind NOT NULL,
    url         TEXT NOT NULL,
    file_name   TEXT,
    mime_type   VARCHAR(150),
    size_bytes  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_post_attachments_post
    ON post_attachments (post_id);

CREATE TABLE IF NOT EXISTS post_reactions (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    kind        reaction_kind NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post_kind
    ON post_reactions (post_id, kind);