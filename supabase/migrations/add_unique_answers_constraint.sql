ALTER TABLE public.answers DROP CONSTRAINT IF EXISTS answers_round_player_category_unique;

ALTER TABLE public.answers
ADD CONSTRAINT answers_round_player_category_unique
UNIQUE (round_id, player_id, category_id);
