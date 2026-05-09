ALTER TABLE public.rounds
ADD COLUMN IF NOT EXISTS validation_category_index integer default 0,
ADD COLUMN IF NOT EXISTS validation_started_at timestamptz;

CREATE TABLE IF NOT EXISTS public.validation_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.rounds(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  normalized_answer text not null,
  voter_id uuid references public.room_players(id) on delete cascade,
  vote text not null check (vote in ('valid', 'invalid')),
  created_at timestamptz default now(),
  unique(round_id, category_id, normalized_answer, voter_id)
);

ALTER TABLE public.validation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on validation_votes" ON public.validation_votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on validation_votes" ON public.validation_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on validation_votes" ON public.validation_votes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on validation_votes" ON public.validation_votes FOR DELETE USING (true);

ALTER TABLE public.validation_votes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'validation_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE validation_votes;
  END IF;
END
$$;
