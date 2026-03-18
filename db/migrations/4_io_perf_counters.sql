BEGIN;

SET search_path TO bookapp;

ALTER TABLE bookapp.clubs
ADD COLUMN IF NOT EXISTS member_count integer NOT NULL DEFAULT 0;

ALTER TABLE bookapp.threads
ADD COLUMN IF NOT EXISTS post_count integer NOT NULL DEFAULT 0;

UPDATE bookapp.clubs
SET member_count = counts.member_count
FROM (
  SELECT club_id, count(*)::int AS member_count
  FROM bookapp.club_members
  GROUP BY club_id
) counts
WHERE counts.club_id = bookapp.clubs.id;

UPDATE bookapp.clubs
SET member_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM bookapp.club_members
  WHERE club_members.club_id = bookapp.clubs.id
);

UPDATE bookapp.threads
SET post_count = counts.post_count
FROM (
  SELECT thread_id, count(*)::int AS post_count
  FROM bookapp.thread_posts
  GROUP BY thread_id
) counts
WHERE counts.thread_id = bookapp.threads.id;

UPDATE bookapp.threads
SET post_count = 0
WHERE NOT EXISTS (
  SELECT 1
  FROM bookapp.thread_posts
  WHERE thread_posts.thread_id = bookapp.threads.id
);

CREATE OR REPLACE FUNCTION sync_club_member_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bookapp.clubs
    SET member_count = member_count + 1
    WHERE id = NEW.club_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE bookapp.clubs
    SET member_count = GREATEST(member_count - 1, 0)
    WHERE id = OLD.club_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_club_members_member_count ON bookapp.club_members;
CREATE TRIGGER trg_club_members_member_count
AFTER INSERT OR DELETE ON bookapp.club_members
FOR EACH ROW EXECUTE FUNCTION sync_club_member_count();

CREATE OR REPLACE FUNCTION sync_thread_post_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bookapp.threads
    SET post_count = post_count + 1
    WHERE id = NEW.thread_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE bookapp.threads
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_thread_posts_post_count ON bookapp.thread_posts;
CREATE TRIGGER trg_thread_posts_post_count
AFTER INSERT OR DELETE ON bookapp.thread_posts
FOR EACH ROW EXECUTE FUNCTION sync_thread_post_count();

COMMIT;
