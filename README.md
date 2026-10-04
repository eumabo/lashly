# Lashly — Midnight Gold

Sistema mobile-first para agenda, clientes, financeiro, materiais, serviços e lembretes push.
Visual próprio em preto/grafite/dourado, com verde e vermelho apenas para estados funcionais.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem `.env`, o app abre em modo demonstração. Para dados reais, copie `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

## Banco

### Projeto novo

Execute no SQL Editor:

`supabase/schema.sql`

### Projeto que já estava funcionando

Execute, se ainda não executou:

`supabase/migration_lashly_profile.sql`

Depois execute uma vez:

`supabase/migration_lashly_media.sql`

A migration de mídia adiciona foto do perfil, ícone personalizado do app e o bucket `lashly-media`.

## Logo padrão do Lashly

A interface já procura estes arquivos:

- `public/lashly-default-logo.png` — foto/logo padrão usada no perfil
- `public/lashly-default-icon.png` — ícone padrão do navegador/iPhone

Foram incluídos placeholders temporários. Quando a logo oficial estiver pronta, substitua esses arquivos mantendo os mesmos nomes.

Dentro de **Configurações**, a pessoa também pode trocar a foto de perfil e o ícone do aplicativo sem editar código.

### Ícone personalizado no iPhone

O ícone escolhido em Configurações passa a ser usado pelo `apple-touch-icon` da sessão atual. No iPhone, após mudar o ícone:

1. Remova o atalho antigo da Tela de Início.
2. Abra o Lashly novamente no Safari.
3. Use **Compartilhar → Adicionar à Tela de Início**.

O iOS não atualiza automaticamente o ícone de um atalho que já foi instalado.

## Notificações push / iPhone

### 1. VAPID

```bash
npx web-push generate-vapid-keys
```

Public Key no frontend:

```env
VITE_VAPID_PUBLIC_KEY=SUA_PUBLIC_KEY
```

A Private Key nunca vai para o frontend.

### 2. Supabase Edge Function

Função pronta:

`supabase/functions/send-reminders/index.ts`

Secrets necessários:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

Depois faça deploy da função `send-reminders` e agende pelo Supabase Cron.

### 3. iPhone

1. Publique o site em HTTPS.
2. Abra no Safari.
3. **Compartilhar → Adicionar à Tela de Início**.
4. Abra pelo ícone instalado.
5. **Configurações → Notificações → Ativar notificações**.

## Vercel

Configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`

Faça novo deploy após alterar as variáveis.
