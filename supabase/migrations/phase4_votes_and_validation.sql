CREATE TABLE IF NOT EXISTS public.votes (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid references public.answers(id) on delete cascade,
  voter_id uuid references public.room_players(id) on delete cascade,
  vote text not null check (vote in ('valid', 'invalid')),
  created_at timestamptz default now(),
  unique(answer_id, voter_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on votes" ON public.votes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on votes" ON public.votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on votes" ON public.votes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on votes" ON public.votes FOR DELETE USING (true);

ALTER TABLE public.votes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END
$$;
