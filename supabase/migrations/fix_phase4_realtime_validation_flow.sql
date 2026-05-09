-- Adicionar session_id em room_players
ALTER TABLE public.room_players
ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_room_players_session_id
ON public.room_players(session_id);

-- Criar tabela de confirmações (se não existir)
CREATE TABLE IF NOT EXISTS public.validation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.room_players(id) ON DELETE CASCADE,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(round_id, category_id, player_id)
);

ALTER TABLE public.validation_confirmations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='validation_confirmations' AND policyname='sel_vc') THEN
    CREATE POLICY sel_vc ON public.validation_confirmations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='validation_confirmations' AND policyname='ins_vc') THEN
    CREATE POLICY ins_vc ON public.validation_confirmations FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='validation_confirmations' AND policyname='upd_vc') THEN
    CREATE POLICY upd_vc ON public.validation_confirmations FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='validation_confirmations' AND policyname='del_vc') THEN
    CREATE POLICY del_vc ON public.validation_confirmations FOR DELETE USING (true);
  END IF;
END $$;

-- Replica identity full em todas as tabelas relevantes
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
ALTER TABLE public.answers REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.validation_votes REPLICA IDENTITY FULL;
ALTER TABLE public.validation_confirmations REPLICA IDENTITY FULL;

-- Adicionar ao Realtime
DO $$
DECLARE
  tbls text[] := ARRAY['rooms','rounds','answers','room_players','validation_votes','validation_confirmations'];
  t text;
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname='supabase_realtime' AND tablename=t
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE ' || t;
    END IF;
  END LOOP;
END $$;
