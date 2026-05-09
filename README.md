# Bora Stop

Um jogo de Stop/Adedonha multiplayer online para jogar com os amigos.

## Fase 2: Integração com Supabase (Atual)

O projeto entrou na Fase 2, onde substituímos parte dos dados estáticos por dados reais hospedados no Supabase e ativamos comunicação em tempo real (Realtime).

### O que foi implementado na Fase 2:
- Estrutura completa de banco de dados (`schema.sql`) no PostgreSQL.
- Armazenamento do Apelido no `localStorage`.
- Criação real de salas no banco de dados com código único.
- Entrada na sala pelo Lobby usando Realtime (jogadores aparecem ao entrar).
- Chat do Lobby funcional e em tempo real.
- Botão de "Estou Pronto" atualizando estado no banco.
- Botão "Começar Jogo" exclusivo para o host atualizando status da sala.

### O que será feito na Fase 3:
- Implementação da lógica de rodadas reais (sorteio de letra sincronizado).
- Temporizador da partida sincronizado pelo banco.
- Salvamento e validação das respostas (integração real na tela do Jogo).
- Votação e validação social de palavras.
- Sistema de pontuação real e ranking na tela de Resultados.

---

## Como rodar o projeto localmente

### 1. Requisitos
- Node.js (versão 18+ recomendada)
- Conta gratuita no [Supabase](https://supabase.com/)

### 2. Configurar o Supabase
1. Crie um novo projeto no Supabase.
2. Acesse a aba **SQL Editor** no painel do Supabase.
3. Copie o conteúdo do arquivo `supabase/schema.sql` deste projeto.
4. Cole no SQL Editor e execute (Run) para criar todas as tabelas e políticas necessárias.

### 3. Configurar variáveis de ambiente
1. Na raiz do projeto, renomeie ou copie o arquivo `.env.example` para `.env.local`
2. Preencha as variáveis com os dados do seu projeto Supabase (encontrados em Project Settings > API):
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 4. Rodar o servidor de desenvolvimento
Instale as dependências:
```bash
npm install
```

Inicie o projeto:
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.
