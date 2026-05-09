ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rounds;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE answers;
  END IF;
END
$$;
