-- Ativação de RLS (Row Level Security) para preparar a Produção
-- Importante: Como o jogo ainda usa jogadores anônimos (localStorage), o RLS será "Soft" (permissivo) por enquanto,
-- mas já bloqueia deleções massivas (Wipe Out) de dados. Quando implementarmos contas Google, o RLS será "Hard".

-- 1. Habilitar RLS em todas as tabelas do jogo
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'rooms' (Salas)
-- Permite visualizar, inserir e atualizar, mas bloqueia DELETE.
CREATE POLICY "Leitura pública de rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Inserção pública de rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Update público de rooms" ON public.rooms FOR UPDATE USING (true);

-- 3. Políticas para 'room_players' (Jogadores na Sala)
CREATE POLICY "Leitura de players" ON public.room_players FOR SELECT USING (true);
CREATE POLICY "Inserção de players" ON public.room_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Update de players" ON public.room_players FOR UPDATE USING (true);
-- Permite delete apenas da própria conta? Sem auth não dá pra validar, então permitimos pra evitar fantasmas
CREATE POLICY "Delete de players" ON public.room_players FOR DELETE USING (true);

-- 4. Políticas para 'room_categories'
CREATE POLICY "Leitura de room_categories" ON public.room_categories FOR SELECT USING (true);
CREATE POLICY "Inserção de room_categories" ON public.room_categories FOR INSERT WITH CHECK (true);

-- 5. Políticas para 'rounds'
CREATE POLICY "Leitura de rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Inserção de rounds" ON public.rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Update de rounds" ON public.rounds FOR UPDATE USING (true);

-- 6. Políticas para 'answers'
CREATE POLICY "Leitura de answers" ON public.answers FOR SELECT USING (true);
CREATE POLICY "Inserção de answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Update de answers" ON public.answers FOR UPDATE USING (true);

-- 7. Políticas para 'validation_votes' e 'validation_confirmations'
CREATE POLICY "Leitura de votes" ON public.validation_votes FOR SELECT USING (true);
CREATE POLICY "Inserção/update de votes" ON public.validation_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Update de votes_2" ON public.validation_votes FOR UPDATE USING (true);

CREATE POLICY "Leitura de confirmations" ON public.validation_confirmations FOR SELECT USING (true);
CREATE POLICY "Inserção de confirmations" ON public.validation_confirmations FOR INSERT WITH CHECK (true);
CREATE POLICY "Update de confirmations" ON public.validation_confirmations FOR UPDATE USING (true);

-- 8. Políticas para 'messages' (Chat Realtime)
CREATE POLICY "Leitura de messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Inserção de messages" ON public.messages FOR INSERT WITH CHECK (true);
-- Update/Delete de messages são bloqueados por padrão (Não geramos policy pra isso)
