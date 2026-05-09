-- Adicionar coluna allowed_letters à tabela rooms
alter table public.rooms
add column if not exists allowed_letters text[] default array['A','B','C','D','E','F','G','H','I','J','L','M','N','O','P','R','S','T','U','V'];
