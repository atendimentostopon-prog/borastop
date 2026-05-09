-- Supabase schema for Bora Stop (Fase 2)
-- Create tables

-- 1. rooms
CREATE TABLE rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_private boolean default false,
  password text,
  status text default 'lobby', -- lobby, playing, voting, finished
  host_nickname text not null,
  max_players integer default 8,
  round_time integer default 90,
  total_rounds integer default 8,
  current_round integer default 0,
  allowed_letters text[] default array['A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','R','S','T','U','V'],
  created_at timestamp with time zone default now()
);

-- 2. room_players
CREATE TABLE room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  nickname text not null,
  avatar text,
  score integer default 0,
  is_host boolean default false,
  is_ready boolean default false,
  joined_at timestamp with time zone default now(),
  UNIQUE(room_id, nickname)
);

-- 3. categories
CREATE TABLE categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamp with time zone default now()
);

-- Inserir categorias iniciais
INSERT INTO categories (name) VALUES 
('Nome'), ('Cidade'), ('Animal'), ('Objeto'), ('Comida'), 
('Marca'), ('Filme'), ('Profissão'), ('Cor'), ('País')
ON CONFLICT (name) DO NOTHING;

-- 4. room_categories
CREATE TABLE room_categories (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  UNIQUE(room_id, category_id)
);

-- 5. messages
CREATE TABLE messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  player_id uuid references room_players(id) on delete set null,
  nickname text not null,
  message text not null,
  is_system boolean default false,
  created_at timestamp with time zone default now()
);

-- 6. rounds
CREATE TABLE rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  round_number integer not null,
  letter text not null,
  status text default 'waiting', -- waiting, playing, stopped, voting, finished
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  stopped_by uuid references room_players(id) on delete set null
);

-- 7. answers
CREATE TABLE answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  round_id uuid references rounds(id) on delete cascade not null,
  player_id uuid references room_players(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  answer text default '',
  points integer default 0,
  is_valid boolean,
  created_at timestamp with time zone default now()
);

-- Ativar RLS em todas as tabelas
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Políticas para desenvolvimento (abertas). 
-- AVISO: Estas policies permitem acesso anônimo total temporariamente para desenvolvimento da Fase 2.
-- Devem ser endurecidas antes de enviar para produção (usando autenticação ou JWT customizado).

CREATE POLICY "Allow public read on rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on rooms" ON rooms FOR DELETE USING (true);

CREATE POLICY "Allow public read on room_players" ON room_players FOR SELECT USING (true);
CREATE POLICY "Allow public insert on room_players" ON room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on room_players" ON room_players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on room_players" ON room_players FOR DELETE USING (true);

CREATE POLICY "Public categories are viewable by everyone." ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert categories." ON categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Public room_categories are viewable by everyone." ON room_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert room_categories." ON room_categories FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on messages" ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on rounds" ON rounds FOR SELECT USING (true);
CREATE POLICY "Allow public insert on rounds" ON rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on rounds" ON rounds FOR UPDATE USING (true);

CREATE POLICY "Allow public read on answers" ON answers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on answers" ON answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on answers" ON answers FOR UPDATE USING (true);

-- VOTES
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

DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE votes;
  END IF;
END
\$\$;


-- PHASE 4 GROUPED VALIDATION
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

DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'validation_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE validation_votes;
  END IF;
END
\$\$;


-- FIX VALIDATION VOTES UNIQUE
DO \$\$
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
END \$\$;

