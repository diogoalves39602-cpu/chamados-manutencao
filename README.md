# Sistema de Chamados de Manutenção (SLA de 2h, operação 24/7)

Sistema web para a equipe de manutenção receber, atender e acompanhar chamados.
Todo chamado deve ser finalizado em até **2 horas** após a abertura, contadas em relógio
corrido (24/7, sem pausa em fins de semana ou feriados).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth,
Realtime, Storage) · Zod. Roda inteiramente em planos gratuitos.

| Etapa | Conteúdo | Status |
|---|---|---|
| 1 | Banco (migrations + RLS), autenticação da equipe, gestão de usuários, backup | ✅ |
| 2 | Formulário público `/abrir-chamado` + webhook `POST /api/chamados/webhook` | ⏳ |
| 3 | Painel da equipe em tempo real (assumir/finalizar) | ⏳ |
| 4 | Dashboard + exportação Excel | ⏳ |
| 5 | Notificações Feishu/Lark + alerta de prazo (pg_cron) | ⏳ |

---

## 1. Setup local

Pré-requisitos: Node.js 20+ (testado com 24) e Git.

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (ver seção 2)
npm run dev                  # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npm run typecheck`.

## 2. Variáveis de ambiente

| Variável | Onde obter | Visibilidade |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key | pública |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | domínio fictício do login (padrão `chamados.local`) | pública |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **Secret key** (`sb_secret_...`) | **somente servidor** |
| `APP_URL`, `CRON_SECRET` | etapa 5 | somente servidor |

> A secret key ignora a RLS. Nunca use prefixo `NEXT_PUBLIC_` nela e nunca faça commit
> do `.env.local` (já está no `.gitignore`).

## 3. Banco de dados (Supabase)

As migrations ficam em `supabase/migrations/` e são aplicadas no projeto em ordem.
Os nomes dos arquivos correspondem às versões registradas no Supabase.

| Migration | O que faz |
|---|---|
| `..._esquema_base.sql` | tipos, tabelas, índices, categorias, turnos e configuração padrão |
| `..._funcoes_e_fluxo.sql` | triggers de SLA/turno/número, máquina de estados, histórico e RPCs |
| `..._rls_e_permissoes.sql` | RLS, privilégios, Realtime e bucket privado de fotos |
| `..._ajustes_advisor_seguranca.sql` | remove acesso do público às funções de papel |

### Regras que vivem no banco (valem para qualquer canal de entrada)

- **Número** `CH-000123` gerado por sequência.
- **Abertura**: `aberto_em = now()`, `prazo_limite = aberto_em + sla_minutos` (padrão 120),
  `turno` calculado pela hora de São Paulo. SLA e turno são *snapshots*: mudar a
  configuração depois só afeta chamados novos.
- **Turnos** (`turnos`): intervalo `[início, fim)`, aceita virar a meia-noite.
  Padrão: Manhã 06–14, Tarde 14–22, Noite 22–06.
- **Fluxo**: `aberto → em_andamento → finalizado`. Também é possível finalizar direto
  de `aberto` (quem finaliza também assume) e cancelar de `aberto`/`em_andamento`.
  `finalizado` e `cancelado` são terminais: não há reabertura.
- **Ao finalizar**: `situacao_prazo` (`finalizado_em <= prazo_limite`),
  `tempo_total_minutos` e `tempo_ate_assumir_minutos`.
- **Histórico** (`chamado_historico`): toda mudança de status e toda reatribuição,
  com quem, quando, de → para e comentário.
- **Proteção**: o sistema nunca fica sem um admin ativo.

### Quem pode o quê

| Ação | Público | Técnico | Admin |
|---|---|---|---|
| Abrir chamado | via servidor (formulário/webhook) | — | — |
| Ver chamados e histórico | ✗ | ✓ | ✓ |
| Assumir / finalizar | ✗ | ✓ (RPC) | ✓ (RPC) |
| Reatribuir / cancelar (motivo obrigatório) | ✗ | ✗ | ✓ (RPC) |
| Categorias, turnos, SLA, tokens, destinos | ✗ | leitura parcial | ✓ |

O público não acessa as tabelas diretamente. O formulário e o webhook chamam a RPC
`abrir_chamado` pelo servidor, que define a `origem`. A tabela `chamados` não aceita
`UPDATE` direto de ninguém além das RPCs.

### Testes do banco

`supabase/tests/etapa1_fluxo.sql` executa 16 cenários (turnos, abertura, assumir duas
vezes, permissões, finalização dentro e fora do prazo, histórico, estado terminal,
reatribuição, cancelamento, RLS do público, último admin, tokens, destinos). O teste
roda dentro de uma transação e termina em `ROLLBACK`, então não deixa dados.

## 4. Autenticação da equipe (sem e-mail)

- O técnico entra com **usuário ou matrícula** e senha. Internamente o Supabase Auth
  usa `<login>@chamados.local`, criado já confirmado. Nenhum e-mail é enviado.
- O **admin** cria, redefine senha, troca o papel e desativa usuários em `/admin/usuarios`.
  Desativar marca o perfil como inativo e bane o usuário no Auth.
- No **primeiro acesso** (e após redefinição) a troca de senha é obrigatória.

### Configuração obrigatória no painel do Supabase

1. **Authentication → Sign In / Providers → Email**: desative **"Allow new users to sign up"**.
   Mesmo ativo, quem se cadastrasse não teria perfil e não veria nada (testado), mas
   é melhor fechar.
2. Na mesma tela, a confirmação de e-mail pode ficar como está: os usuários são
   criados já confirmados.

### Criar o primeiro administrador

Com `SUPABASE_SECRET_KEY` preenchida no `.env.local`:

```bash
npm run criar-admin -- --login admin --nome "Seu Nome"
```

O comando mostra a senha inicial **uma única vez** no terminal. Entre em `/login`;
o sistema vai pedir a troca da senha. Os demais usuários são criados pelo `/admin`.

## 5. Backup e limites do plano gratuito

Limites do Supabase Free: 500 MB de banco, 1 GB de storage, **sem backup automático**,
pausa após 7 dias sem atividade.

### Backup semanal (`.github/workflows/backup-banco.yml`)

Todo domingo às 03:00 (São Paulo), e também manualmente em *Actions → Run workflow*:

1. `supabase db dump` (pg_dump por baixo) gera `roles.sql`, `schema.sql` e `data.sql`;
2. os arquivos são compactados e **criptografados com AES-256** (GPG);
3. o resultado é guardado como *artifact* por 90 dias.

O dump contém dados pessoais (contatos dos solicitantes, hashes de senha). Por isso
ele é criptografado: artifacts de repositório público podem ser baixados por qualquer
pessoa. Mesmo assim, recomenda-se manter o repositório **privado**.

**Secrets do repositório** (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `SUPABASE_DB_URL` | Supabase → **Connect** → *Session pooler* (porta 5432). Ex.: `postgresql://postgres.<ref>:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`. Se não souber a senha do banco, redefina em Project Settings → Database. |
| `BACKUP_PASSPHRASE` | Senha longa e aleatória. **Guarde fora do GitHub**: sem ela o backup não abre. |

Use o *Session pooler* e não a conexão direta: a conexão direta do plano Free é
só IPv6, e os runners do GitHub usam IPv4.

**Restaurar um backup:**

```bash
gpg --decrypt chamados-AAAA-MM-DD.tar.gz.gpg > backup.tar.gz
tar -xzf backup.tar.gz
psql "$NOVO_DB_URL" --single-transaction -v ON_ERROR_STOP=1 \
  -f roles.sql -f schema.sql -c "SET session_replication_role = replica" -f data.sql
```

Faça um restore de teste num projeto vazio logo após o primeiro backup, para validar
o procedimento.

### Evitar a pausa (`.github/workflows/manter-ativo.yml`)

A cada 3 dias faz uma leitura pública leve (categorias) na API. Secrets:
`SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, com os mesmos valores públicos do app.

> O GitHub desativa workflows agendados em repositórios **públicos** sem commits por 60
> dias. Se isso acontecer, reative em *Actions*.

## 6. Deploy

O código não usa nada específico de plataforma, então funciona na Vercel e no Netlify.

- **Desenvolvimento/homologação: Vercel Hobby.** Importe o repositório e cadastre as
  variáveis da seção 2. (O plano Hobby não permite uso comercial.)
- **Produção: Netlify (gratuito).** O `netlify.toml` já está pronto e o Netlify detecta
  o Next.js sozinho. Cadastre as mesmas variáveis em *Site configuration → Environment
  variables*.
- As tarefas agendadas (alerta de prazo) **não** usam o cron da Vercel nem o do Netlify:
  quem chama `${APP_URL}/api/cron/alertas` é o **pg_cron do Supabase** (etapa 5). Trocar
  de hospedagem é só mudar a variável `APP_URL`.

## 7. Integração Feishu / Lark

*(Documentação completa nas etapas 2 e 5.)*

- **Entrada**: automações do Base (Feishu e Lark) chamam `POST /api/chamados/webhook`
  com `Authorization: Bearer <token>`. Cada canal (`feishu`, `lark`, `api`) tem o seu
  token, gerado em `/admin` e guardado só como hash.
- **Saída**: bots customizados de grupo cadastrados em `destinos_notificacao`
  (`open.feishu.cn` e `open.larksuite.com`), com assinatura opcional.
