-- Ensure tables are in the realtime publication and have replica identity full
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'room_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
  END IF;
END $$;

ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
