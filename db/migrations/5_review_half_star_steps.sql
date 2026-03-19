BEGIN;

SET search_path TO bookapp;

ALTER TABLE bookapp.reviews
DROP CONSTRAINT IF EXISTS reviews_rating_chk;

UPDATE bookapp.reviews
SET rating = rating * 2
WHERE rating IS NOT NULL;

ALTER TABLE bookapp.reviews
ADD CONSTRAINT reviews_rating_chk
CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));

COMMIT;
