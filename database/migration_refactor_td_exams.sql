DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;

DROP TYPE IF EXISTS post_type;
DROP TYPE IF EXISTS submit_type;

DROP INDEX IF EXISTS idx_posts_ue;
DROP INDEX IF EXISTS idx_posts_type;
DROP INDEX IF EXISTS idx_posts_author;
DROP INDEX IF EXISTS idx_posts_created;

DROP INDEX IF EXISTS idx_subs_student;
DROP INDEX IF EXISTS idx_subs_ue;
DROP INDEX IF EXISTS idx_subs_type;
DROP INDEX IF EXISTS idx_subs_groupe;
