-- Tabela para controlar confirmações de avaliação por categoria
CREATE TABLE IF NOT EXISTS public.validation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.rounds(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id uuid REFERENCES public.room_players(id) ON DELETE CASCADE,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(round_id, category_id, player_id)
);

ALTER TABLE public.validation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on validation_confirmations" ON public.validation_confirmations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on validation_confirmations" ON public.validation_confirmations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on validation_confirmations" ON public.validation_confirmations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on validation_confirmations" ON public.validation_confirmations FOR DELETE USING (true);

ALTER TABLE public.validation_confirmations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'validation_confirmations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE validation_confirmations;
  END IF;
END
$$;
