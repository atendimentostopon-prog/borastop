-- Fix unique constraint for validation_votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'validation_votes_unique_vote'
  ) THEN
    ALTER TABLE public.validation_votes
    ADD CONSTRAINT validation_votes_unique_vote
    UNIQUE (round_id, category_id, normalized_answer, voter_id);
  END IF;
END $$;

-- Cleanup duplicate votes keeping the most recent
WITH ranked_votes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY round_id, category_id, normalized_answer, voter_id
      ORDER BY created_at DESC
    ) AS rn
  FROM public.validation_votes
)
DELETE FROM public.validation_votes
WHERE id IN (
  SELECT id FROM ranked_votes WHERE rn > 1
);
