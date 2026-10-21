# Sistema de Chamados de Manutenção (SLA de 2h, operação 24/7)

> **© 2026 Diogo Alves de Jesus. Todos os direitos reservados.** Software proprietário: o acesso a este
> repositório é só para leitura e avaliação. Copiar, modificar, usar ou hospedar depende de autorização
> por escrito do autor. Veja [LICENSE](LICENSE).

**Link único:** https://chamados-manutencao.netlify.app — colaboradores abrem e acompanham chamados;
a equipe logada vê o atalho para o painel. É o mesmo endereço do QR Code, do app instalado e do app do Feishu.

Sistema web para a equipe de manutenção receber, atender e acompanhar chamados.
Todo chamado deve ser finalizado em até **2 horas** após a abertura, contadas em relógio
corrido (24/7, sem pausa em fins de semana ou feriados).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth,
Realtime, Storage, pg_cron) · Zod · SheetJS. Roda inteiramente em planos gratuitos.

| Etapa | Conteúdo |
|---|---|
| 1 | Banco (migrations + RLS), autenticação da equipe sem e-mail, gestão de usuários, backup semanal |
| 2 | Formulário público `/abrir-chamado` (com foto e QR Code) + webhook `POST /api/chamados/webhook` |
| 3 | Painel da equipe em tempo real (`/painel`): contador de prazo, assumir, finalizar, detalhe com histórico, alertas |
| 4 | Dashboard (`/dashboard`) + exportação Excel (abas "Chamados" e "Resumo") |
| 5 | Notificações Feishu/Lark (novo chamado e alerta de prazo), pg_cron 24/7 |

## Sumário

1. [Setup local](#1-setup-local)
2. [Variáveis de ambiente](#2-variáveis-de-ambiente)
3. [Banco de dados](#3-banco-de-dados-supabase)
4. [Autenticação da equipe](#4-autenticação-da-equipe-sem-e-mail)
5. [Abertura de chamados: formulário e QR Code](#5-abertura-de-chamados-formulário-e-qr-code)
6. [Webhook de entrada (Feishu, Lark, API)](#6-webhook-de-entrada-feishu-lark-api)
7. [Painel da equipe](#7-painel-da-equipe)
8. [Dashboard e Excel](#8-dashboard-e-excel)
9. [Notificações no Feishu e no Lark](#9-notificações-no-feishu-e-no-lark)
10. [Alerta de prazo 24/7 (pg_cron)](#10-alerta-de-prazo-247-pg_cron)
11. [Dados de exemplo](#11-dados-de-exemplo)
12. [Testes](#12-testes)
13. [Backup e limites do plano gratuito](#13-backup-e-limites-do-plano-gratuito)
14. [Deploy (Vercel e Netlify)](#14-deploy-vercel-e-netlify)
15. [Login com Feishu/Lark para quem abre chamado](#15-login-com-feishulark-para-quem-abre-chamado)
16. [Admin → Chamados e mensagens ao solicitante](#16-admin--chamados-e-mensagens-ao-solicitante)
17. [Reprovar chamado e avisos automáticos](#17-reprovar-chamado-e-avisos-automáticos)
18. [Continuar em outro computador](#18-continuar-em-outro-computador)

---

## 1. Setup local

Pré-requisitos: Node.js 20+ (testado com 24) e Git.

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (seção 2)
npm run dev                  # http://localhost:3000
```

Outros comandos: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

## 2. Variáveis de ambiente

| Variável | Onde obter | Visibilidade |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key | pública |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | domínio fictício do login (padrão `chamados.local`) | pública |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **Secret key** (`sb_secret_...`) | **somente servidor** |
| `APP_URL` | URL pública do app, ex.: `https://chamados.suaempresa.com` (links nas mensagens e no QR Code) | somente servidor |
| `CRON_SECRET` | gerado no Vault do Supabase (seção 10), mínimo 32 caracteres | **somente servidor** |

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
| `..._etapa2_limite_taxa.sql` | limite de requisições (anti-spam) do formulário e do webhook |
| `..._etapa4_indicadores.sql` | função `indicadores()` do dashboard e do Excel |
| `..._etapa5_notificacoes.sql` | pg_cron + pg_net, reivindicação de notificações sem duplicar |
| `..._admin_salvar_turnos.sql`, `..._salvar_turnos_valida_nome.sql` | grava a grade de turnos com validação de 24h |

### Regras que vivem no banco (valem para qualquer canal de entrada)

- **Número** `CH-000123` gerado por sequência.
- **Abertura**: `aberto_em = now()`, `prazo_limite = aberto_em + sla_minutos` (padrão 120),
  `turno` calculado pela hora de São Paulo. SLA e turno são *snapshots*: mudar a
  configuração depois só afeta chamados novos.
- **Turnos** (`turnos`): intervalo `[início, fim)`, aceita virar a meia-noite.
  Padrão: Manhã 06–14, Tarde 14–22, Noite 22–06. Editáveis em `/admin/configuracoes`.
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
| Reatribuir / reprovar (motivo obrigatório) | ✗ | ✗ | ✓ (RPC) |
| Telas: Painel | ✗ | ✓ | ✓ |
| Telas: Indicadores e exportação Excel | ✗ | ✗ (volta para o Painel) | ✓ |
| Telas: Admin | ✗ | ✗ (volta para o Painel) | ✓ |
| SLA, categorias, turnos, tokens, destinos, usuários | ✗ | leitura parcial | ✓ |

O público não acessa as tabelas diretamente. O formulário e o webhook chamam a RPC
`abrir_chamado` pelo servidor, que define a `origem`. A tabela `chamados` não aceita
`UPDATE` direto de ninguém além das RPCs.

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

## 5. Abertura de chamados: formulário e QR Code

- **`/abrir-chamado`** é público e pensado para celular. Campos: nome, setor,
  contato, local, categoria, descrição e foto opcional. **Obrigatório: entrar com o Feishu
  ou informar telefone com DDD / e-mail válido** (texto livre como "ramal 20" é recusado).
  Quem entra com o Feishu tem o nome preenchido pela conta e o contato vira opcional. Ao enviar, mostra o **número** e
  o **prazo limite**.
- **Foto**: o próprio celular reduz a imagem (lado maior de 1600px, JPEG) antes do envio,
  então uma foto de 4–8 MB vira cerca de 0,3 MB. Ela fica num bucket **privado** (só a
  equipe vê, por link temporário).
- **Anti-spam**: campo invisível para robôs (honeypot) e limite de 6 chamados a cada
  10 minutos por IP.
- Nome, setor e contato ficam lembrados no aparelho para o próximo chamado.
- **Acompanhar** (`/acompanhar`): não precisa do número do chamado. A pessoa pode **entrar com o Feishu**
  (lista "Seus chamados") ou informar o **telefone ou e-mail** usado na abertura (lista todos os chamados
  com aquele contato). O telefone é comparado pelos dígitos, com ou sem +55, DDD, espaços ou traços. Há
  limite de 10 consultas a cada 10 minutos por aparelho. Cada chamado abre ao tocar e mostra o problema
  informado, a foto, quem atendeu (só o primeiro nome), a linha do tempo e **o que foi feito** ou **o
  motivo da reprovação**. O contato de ninguém aparece.
- **QR Code**: `/admin/qrcode` gera um cartaz pronto para imprimir e o link para divulgar
  nos grupos do Feishu e do Lark. Defina `APP_URL` para o QR apontar para o endereço
  definitivo.

## 6. Webhook de entrada (Feishu, Lark, API)

```
POST {APP_URL}/api/chamados/webhook
Authorization: Bearer <token do canal>        (ou header X-Api-Token)
Content-Type: application/json

{
  "solicitante_nome": "Maria Souza",
  "solicitante_setor": "RH",
  "solicitante_contato": "11 99999-0000",
  "local": "Bloco B, sala 204",
  "categoria": "Elétrica",
  "descricao": "Tomada soltando faísca",
  "foto_url": "https://..."            (opcional; vira link na descrição)
}
```

- **Tokens por canal**: crie em `/admin/integracoes`, um para cada canal (`feishu`, `lark`,
  `api`). O token é mostrado **uma única vez** e fica guardado só como hash SHA-256.
  A **origem** gravada no chamado vem do token, nunca do corpo. Para trocar um token,
  gere outro e revogue o antigo.
- **Nomes curtos aceitos**: `nome`, `setor`, `contato`/`telefone`/`email`, `problema`, `foto`.
  Valores em formato de lista ou objeto `{text}` (comuns no Base) são convertidos em texto.
- **Categoria** pelo nome (sem diferenciar acento ou maiúscula) ou pelo id. Se vier uma
  categoria desconhecida, o chamado entra como "Outros" e a categoria informada é
  anotada na descrição.
- **Respostas**:
  - `201` → `{ ok, numero, aberto_em, prazo_limite, prazo_limite_local, origem }`
  - `401` → token ausente ou inválido
  - `422` → campos inválidos (o corpo traz `campos`)
  - `429` → mais de 60 requisições por minuto no canal

Teste rápido:

```bash
curl -X POST "$APP_URL/api/chamados/webhook" -H "Authorization: Bearer chm_api_..." -H "Content-Type: application/json" -d "{\"nome\":\"Teste\",\"setor\":\"TI\",\"contato\":\"ramal 2000\",\"local\":\"Sala 1\",\"categoria\":\"TI\",\"descricao\":\"Teste de integração\"}"
```

### Passo a passo: formulário do Base no Feishu (open.feishu.cn)

1. No `/admin/integracoes`, gere um token com origem **Feishu** e copie.
2. No Feishu, abra (ou crie) um **Base** com uma tabela "Chamados" e as colunas: Nome,
   Setor, Contato, Local, Categoria (seleção única com as mesmas categorias do sistema)
   e Descrição. Crie a **visualização de formulário** e compartilhe com os colaboradores.
3. Em **Automações** do Base, crie uma regra:
   - **Gatilho:** "Quando um registro for adicionado" (ou "Quando o formulário for enviado").
   - **Ação:** "Enviar requisição HTTP" (*HTTP request* / 发送 HTTP 请求).
     - Método: `POST`.
     - URL: `{APP_URL}/api/chamados/webhook`.
     - Cabeçalhos: `Authorization` = `Bearer <token>` e `Content-Type` = `application/json`.
     - Corpo (JSON), inserindo os campos do registro como variáveis:
       `{"nome": <Nome>, "setor": <Setor>, "contato": <Contato>, "local": <Local>, "categoria": <Categoria>, "descricao": <Descrição>}`.
4. Envie um registro de teste e confira o chamado no `/painel` (origem "Feishu").
5. (Opcional) Na mesma automação, grave a resposta (`numero`, `prazo_limite_local`) de
   volta no registro, para o solicitante ver o número.

> Os nomes dos menus variam conforme a versão e o idioma do Feishu. Se o seu plano não
> tiver a ação "Enviar requisição HTTP", use uma ferramenta intermediária (por exemplo
> n8n) com o mesmo POST, ou divulgue o link do `/abrir-chamado` no Feishu.

### Passo a passo: formulário do Base no Lark (open.larksuite.com)

O processo é o mesmo, no ambiente do Lark:

1. Gere um token com origem **Lark** no `/admin/integracoes`. Use um token diferente do
   Feishu, para separar a origem nos indicadores.
2. Crie o Base, a tabela e o formulário (*Form view*) no Lark.
3. Em **Automations**: gatilho *When a record is added* → ação *Send HTTP request*, com
   o mesmo método, URL, cabeçalhos e corpo do passo a passo do Feishu.
4. Teste e confira o chamado com origem "Lark".

## 7. Painel da equipe

- **`/painel`**: fila em **tempo real** (Supabase Realtime, respeitando a RLS), ordenada
  pelo prazo mais próximo. Recarrega também quando o celular volta da tela de espera e a
  cada 60 s, para o caso de a conexão cair.
- **Cartão**: número, local, categoria, solicitante, responsável, tempo decorrido e
  **contador regressivo**:
  - 🟩 verde: mais de 1h para o prazo;
  - 🟨 amarelo: menos de 1h;
  - 🟥 vermelho: prazo estourado e ainda não finalizado.
- **Ações**: *Assumir* e *Finalizar* (exige observação) direto no cartão. Na tela de
  detalhe, o admin também pode *Reatribuir* e *Cancelar* (com motivo).
- **Detalhe** (`/painel/CH-000123`): todos os dados, a foto e o **histórico completo**
  (quem fez o quê e quando).
- **Filtros**: status, situação do prazo, categoria, técnico e período.
- **Alertas de novo chamado**: o navegador só libera som depois de um toque do usuário,
  por isso cada pessoa toca uma vez em **"Ativar alertas sonoros"**. A partir daí: bipe,
  aviso no topo, título da aba piscando e notificação do sistema (se permitida).
- O relógio do contador é alinhado ao do servidor, porque o relógio do celular pode
  estar errado.

### Instalar no celular (app)

O sistema tem manifest e ícone próprios: no Android (Chrome) use **⋮ → Instalar app**; no iPhone
(Safari) use **Compartilhar → Adicionar à Tela de Início**. Abre direto no painel, em tela cheia.

### Identidade visual

A cor da marca (vermelho) fica em `src/app/globals.css` (escala `--color-marca-*`). Para trocar a
cor do sistema inteiro, altere só essa escala. Chamado **atrasado** usa vermelho também, mas sempre
com fundo, ícone de alerta e a palavra "Atrasado", para não depender só da cor. Os gráficos usam
azul e laranja (validados para daltonismo) de propósito.

## 8. Dashboard e Excel

**`/dashboard`** tem filtros por período (hoje, últimos 7 dias, este mês, personalizado),
categoria, técnico e turno. O período considera a **data de abertura**, no horário de
Brasília.

| Indicador | Cálculo |
|---|---|
| **% dentro do prazo** (destaque) | finalizados no prazo ÷ finalizados |
| % fora do prazo | finalizados fora ÷ finalizados |
| SLA projetado | no prazo ÷ (finalizados + atrasados ainda em aberto) |
| Atrasados agora | fila atual com prazo estourado (independe do período) |
| Abertos / em andamento / finalizados | quantidade e % sobre o total do período |
| Tempo médio de atendimento | abertura → finalização (finalizados) |
| Tempo médio até assumir | abertura → alguém assumir |

Cancelados aparecem no total, mas **não entram no SLA**.

Gráficos: evolução diária (no prazo × fora × ainda em aberto, com tooltip e versão em
tabela) e rankings por categoria, técnico e turno. As cores azul e laranja foram
validadas para daltonismo, e nenhuma informação depende só da cor (há legenda, rótulos
e tabela).

**Exportar Excel** baixa um `.xlsx` gerado com SheetJS, com o filtro aplicado:

- **Chamados**: todos os campos, datas como `dd/mm/aaaa hh:mm` no horário de Brasília
  (são datas de verdade, que dá para filtrar e ordenar), com autofiltro.
- **Resumo**: totais e percentuais (abertos, em andamento, finalizados, dentro e fora do
  prazo, SLA projetado, tempos médios), mais tabelas por dia, categoria, técnico e turno.

> O SheetJS é instalado a partir do CDN oficial (`cdn.sheetjs.com`), como o projeto
> recomenda. O pacote `xlsx` do npm está desatualizado e tem vulnerabilidades conhecidas.

## 9. Notificações no Feishu e no Lark

As mensagens vão para **todos os destinos ativos**, cadastrados em
`/admin/notificacoes`. É possível ter vários grupos, misturando Feishu e Lark:

- **Novo chamado**: cartão azul com local, solicitante, contato, origem, abertura e prazo.
- **Alerta de prazo**: cartão laranja, enviado quando faltam 30 min (configurável).
  Se o prazo já tiver estourado, o cartão é vermelho.
- Com `APP_URL` definida, cada cartão leva um botão "Abrir no painel".

### Criar o bot no grupo (vale para Feishu e Lark)

1. No grupo da equipe: **Configurações → Bots → Adicionar bot → Bot customizado**
   (*Custom Bot*).
2. Copie o **Webhook**:
   - Feishu: `https://open.feishu.cn/open-apis/bot/v2/hook/...`
   - Lark: `https://open.larksuite.com/open-apis/bot/v2/hook/...`
3. Em **Configurações de segurança**, marque **"Verificação por assinatura"** (*Signature
   verification*) e copie o **secret**. Recomendado: sem isso, qualquer pessoa que tenha
   a URL consegue postar no grupo.
4. No `/admin/notificacoes`, cadastre o destino (plataforma, webhook e secret) e clique
   em **Enviar teste**.

A assinatura é a mesma nas duas plataformas: `sign = base64(HMAC-SHA256(chave =
"<timestamp>\n<secret>", mensagem vazia))`, com o timestamp em segundos. O sistema só
aceita webhooks dos domínios oficiais.

Erros comuns no teste:

| Código | Significado |
|---|---|
| `19021` | assinatura inválida: confira o secret e se o relógio do servidor está certo |
| `19024` | o bot está configurado com palavra-chave. Troque para assinatura ou use a palavra-chave `chamado` (todo cartão tem "chamado" no título e o rodapé "Sistema de chamados de manutenção") |

Depois de mudar a segurança do bot no Feishu, clique em **Salvar** na janela "Detalhes do bot".
Para conferir que a assinatura está valendo, um POST **sem** assinatura no webhook precisa ser
recusado (`19021`); se ele for aceito, a verificação não está ativa no Feishu.

## 10. Alerta de prazo 24/7 (pg_cron)

O alerta não usa o cron da Vercel nem o do Netlify. No plano gratuito eles não rodam a
cada minuto, e cada plataforma tem um formato diferente. Quem dispara é o **pg_cron do
Supabase**, então trocar de hospedagem é só mudar `APP_URL`.

```
pg_cron (a cada minuto) → disparar_cron_alertas()
  └ só se houver pendência: POST {app_url}/api/cron/alertas  (Authorization: Bearer cron_secret)
      └ o app reivindica os chamados (UPDATE … RETURNING) e envia aos destinos
```

- Em minutos sem pendência, o app **não é chamado**. Isso economiza as invocações de
  função do plano gratuito.
- **Sem duplicar**: cada chamado recebe um único "novo chamado" e um único alerta.
- **Reenvio**: se todos os destinos falharem, o "novo chamado" volta para a fila e é
  reenviado no minuto seguinte, durante até 15 minutos.
- A mensagem de novo chamado também sai **na hora**, logo após a abertura (via
  `after()`). O cron cobre as falhas.

### Configurar (uma vez, depois do deploy)

No **SQL Editor** do Supabase:

```sql
-- 1) URL pública do app (troque pelo seu domínio)
select vault.create_secret('https://chamados.suaempresa.com', 'app_url');

-- 2) Segredo aleatório gerado dentro do banco
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_secret');

-- 3) Copie o valor e cadastre como CRON_SECRET na Vercel/Netlify
select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret';
```

Para trocar a URL depois (por exemplo, da Vercel para o Netlify):

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'app_url'),
  'https://novo-endereco.netlify.app'
);
```

Para conferir se está rodando:

```sql
select * from cron.job_run_details order by start_time desc limit 10;   -- execuções do cron
select * from net._http_response order by created desc limit 10;        -- respostas do app
```

## 11. Dados de exemplo

`supabase/seed/exemplo.sql` gera cerca de 45 dias de chamados (umas 480 linhas), com 5
técnicos fictícios sem senha (não conseguem entrar) e alguns chamados na fila "agora",
um deles atrasado. As descrições começam com `[EXEMPLO]` e os registros já vêm marcados
como notificados (não disparam mensagens). Rode no SQL Editor.

**Antes de entrar em produção**, remova com `supabase/seed/remover_exemplo.sql`. O
script também reposiciona a numeração `CH-` depois do maior chamado real.

## 12. Testes

| Comando | O que cobre |
|---|---|
| `npm test` | fuso de São Paulo e períodos, cores e contador do prazo, assinatura do bot, geração e leitura do `.xlsx`, renderização dos gráficos |
| `supabase/tests/etapa1_fluxo.sql` | 16 cenários do fluxo, SLA, histórico, RLS e privilégios |
| `supabase/tests/etapas2a5_funcoes.sql` | limite de taxa, reivindicação de notificações, alerta único, indicadores e acesso do público |

Os testes SQL rodam numa transação desfeita no final (`ROLLBACK`) e não deixam dados.
Rode no SQL Editor.

## 13. Backup e limites do plano gratuito

Limites do Supabase Free: 500 MB de banco, 1 GB de storage, **sem backup automático**,
pausa após 7 dias sem atividade. Cada chamado ocupa poucos KB, e as fotos são reduzidas
no celular, então mesmo dezenas de milhares de chamados cabem no plano gratuito.

### Backup semanal (`.github/workflows/backup-banco.yml`)

Todo domingo às 03:00 (São Paulo), e também manualmente em *Actions → Run workflow*:

1. `supabase db dump` (pg_dump por baixo) gera `roles.sql`, `schema.sql` e `data.sql`;
2. os arquivos são compactados e **criptografados com AES-256** (GPG);
3. o resultado é guardado como *artifact* por 90 dias.

O dump contém dados pessoais (contatos dos solicitantes, hashes de senha). Por isso ele
é criptografado: artifacts de repositório público podem ser baixados por qualquer pessoa.
Mesmo assim, recomenda-se manter o repositório **privado**. As fotos do Storage não
entram no dump.

**Secrets do repositório** (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `SUPABASE_DB_URL` | Supabase → **Connect** → *Session pooler* (porta 5432). Ex.: `postgresql://postgres.<ref>:<SENHA>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`. Se não souber a senha do banco, redefina em Project Settings → Database. |
| `BACKUP_PASSPHRASE` | Senha longa e aleatória. **Guarde fora do GitHub**: sem ela o backup não abre. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Usados pelo workflow que evita a pausa (valores públicos do app). |

Use o *Session pooler* e não a conexão direta: a conexão direta do plano Free é só
IPv6, e os runners do GitHub usam IPv4.

**Restaurar um backup:**

```bash
gpg --decrypt chamados-AAAA-MM-DD.tar.gz.gpg > backup.tar.gz
tar -xzf backup.tar.gz
psql "$NOVO_DB_URL" --single-transaction -v ON_ERROR_STOP=1 \
  -f roles.sql -f schema.sql -c "SET session_replication_role = replica" -f data.sql
```

Faça um restore de teste num projeto vazio logo após o primeiro backup, para validar o
procedimento.

### Evitar a pausa (`.github/workflows/manter-ativo.yml`)

A cada 3 dias faz uma leitura pública leve (categorias) na API. Com a operação 24/7 a
pausa é improvável, mas isso cobre períodos parados, como a fase de implantação.

> O GitHub desativa workflows agendados em repositórios **públicos** sem commits por 60
> dias. Se isso acontecer, reative em *Actions*.

## 14. Deploy (Vercel e Netlify)

O código não usa nada específico de plataforma, então funciona na Vercel e no Netlify.

- **Desenvolvimento/homologação: Vercel Hobby.** Importe o repositório e cadastre as
  variáveis da seção 2. (O plano Hobby não permite uso comercial.)
- **Produção: Netlify (gratuito).** O `netlify.toml` já está pronto e o Netlify detecta o
  Next.js sozinho. Cadastre as mesmas variáveis em *Site configuration → Environment
  variables*.
- Depois do deploy, atualize `app_url` no Vault (seção 10) e `APP_URL` na hospedagem.
- Limite de envio das Server Actions: 4 MB, abaixo dos limites de corpo da Vercel
  (4,5 MB) e do Netlify (6 MB). A foto chega com cerca de 0,3 MB.

### Checklist de produção

- [ ] `SUPABASE_SECRET_KEY`, `APP_URL` e `CRON_SECRET` configurados na hospedagem
- [ ] Cadastro público desativado no Supabase Auth (seção 4)
- [ ] Primeiro admin criado e senha trocada
- [ ] `app_url` e `cron_secret` no Vault (seção 10)
- [ ] Destinos do Feishu/Lark cadastrados, com assinatura, e teste enviado
- [ ] Tokens de integração gerados para o Feishu e para o Lark (seção 6)
- [ ] Dados de exemplo removidos (seção 11)
- [ ] Secrets do GitHub para backup configurados e um backup manual executado
- [ ] QR Code impresso com o endereço definitivo

## 15. Login com Feishu/Lark para quem abre chamado

Com o app do Feishu configurado, o formulário `/abrir-chamado` passa a exigir login com a conta da
empresa. O chamado grava o **nome real** e o **ID do Feishu** de quem abriu, e a pessoa não consegue
alterar esses dados. Telefone e setor continuam editáveis. Em `/acompanhar`, quem está identificado
vê a lista "Seus chamados". No painel, aparece o selo "Verificado pelo Feishu"; no Excel, a coluna
"Identificado via".

- A sessão do solicitante é um cookie `httpOnly` assinado (HMAC-SHA256, `SESSAO_SECRET`), válido por
  30 dias, separado do login da equipe.
- Sem `FEISHU_APP_ID`/`FEISHU_APP_SECRET`, o formulário funciona como antes, sem login.
- O webhook (Base do Feishu/Lark, API) continua aceitando chamados sem login, autenticado pelo token do canal.

### Criar o app no Feishu (administrador da empresa, cerca de 10 min)

1. Acesse **https://open.feishu.cn/app** → **Create Custom App** (企业自建应用).
   Nome: "Chamados de Manutenção"; ícone: o do sistema (`/icon/512`).
2. **Credentials & Basic Info** (凭证与基础信息): copie o **App ID** (`cli_...`) e o **App Secret**.
3. **Add features → Web App** (网页应用). Em *Desktop/Mobile homepage*, coloque
   `https://chamados-manutencao.netlify.app` (o link único). Assim o sistema também aparece na área
   de aplicativos (*Workplace*) do Feishu.
4. **Security Settings** (安全设置) → **Redirect URLs**: adicione
   `https://chamados-manutencao.netlify.app/auth/feishu/retorno`.
5. (Opcional) **Permissions & Scopes** (权限管理): para trazer e-mail e celular, habilite
   `contact:user.email:readonly` e `contact:user.phone:readonly` e defina
   `FEISHU_SCOPES=contact:user.email:readonly contact:user.phone:readonly`.
6. **Version Management & Release** (版本管理与发布): crie uma versão, escolha a disponibilidade
   **"Todos os membros"** e publique. O administrador aprova no Admin Console.
7. No Netlify (*Project configuration → Environment variables*), cadastre `FEISHU_APP_ID` e
   `FEISHU_APP_SECRET` (marque como *secret*) e faça um novo deploy (*Deploys → Trigger deploy*).

Como o app é "próprio" da empresa, só pessoas da empresa conseguem autorizar. Para travar ainda
mais, defina `FEISHU_TENANT_KEY` com o `tenant_key` da empresa.

**Lark (open.larksuite.com):** o processo é o mesmo, em https://open.larksuite.com/app, com a URL de
retorno `https://chamados-manutencao.netlify.app/auth/lark/retorno` e as variáveis `LARK_APP_ID` e
`LARK_APP_SECRET`. Com os dois configurados, a tela de login mostra os dois botões.

## 16. Admin → Chamados e mensagens ao solicitante

- **Admin → Chamados**: histórico completo, com busca (número, nome, setor, telefone, local, descrição),
  filtros (status, período, identificação) e exportação Excel. Cada linha mostra o solicitante, o
  contato e, quando ele entrou com o Feishu/Lark, o selo de verificado e o **ID do Feishu** (open_id).
- **Enviar mensagem ao solicitante** (tela do chamado, para toda a equipe): modelos prontos
  ("Recebemos", "Técnico a caminho", "Preciso de informações", "Concluído", "Reprovado") ou texto livre.
  - **Feishu/Lark:** enviada direto pelo bot do app da empresa, só para quem abriu o chamado
    identificado. Grátis.
  - **WhatsApp:** abre a conversa (wa.me) com o texto pronto, e quem atende toca em enviar. A API
    oficial que envia automaticamente é paga, por isso não é usada.
  - Tudo fica registrado no chamado ("Mensagens enviadas"), com status e quem enviou.

### Ativar o envio pelo Feishu (no app `cli_aa4e4e50f2b89d05`)

1. **Add features → Bot** (机器人): adicione o recurso Bot.
2. **Permissions & Scopes** (权限管理): habilite `im:message:send_as_bot`.
3. **Version Management & Release** (版本管理与发布): crie uma versão disponível para todos os membros
   e envie para aprovação. O administrador do Feishu aprova no Admin Console.

Até isso ser feito, o botão "Enviar pelo Feishu" mostra o motivo do erro, por exemplo "o app ainda
não tem o recurso Bot ativado", e a mensagem fica registrada como "Falhou".

## 17. Reprovar chamado e avisos automáticos

- **Reprovar** (só administradores): botão no cartão do painel e na tela do chamado, com motivo
  obrigatório. No banco o status continua `cancelado`; na tela, no Excel e para o solicitante ele
  aparece como **Reprovado**. Reprovados não entram no cálculo de SLA e aparecem em Indicadores
  (cartão "Reprovados" e lista "Chamados reprovados no período", com o motivo).
- **Aviso ao solicitante** (pelo bot do app do Feishu, registrado em "Mensagens enviadas"):
  - ao **reprovar**: "foi reprovado… Motivo: …". Se a pessoa não entrou com o Feishu (ou o envio
    falhar), a tela do chamado abre com a mensagem pronta para o WhatsApp;
  - ao **finalizar**: "foi concluído. O que foi feito: …", enviado em segundo plano.
- Enquanto o app do Feishu não estiver liberado para todos os funcionários, o aviso só chega para
  quem está no "Available range" do app; para os demais, o registro fica como "Falhou" com o motivo.

## 18. Continuar em outro computador

Nada depende de um PC específico: o código está no GitHub (repositório privado), o banco, os usuários
e as fotos no Supabase, o site no Netlify (publica sozinho a cada `git push` na `main`) e os alertas
de prazo rodam no próprio banco (pg_cron).

1. Instale as ferramentas: `winget install Git.Git OpenJS.NodeJS.LTS GitHub.cli`.
2. `gh auth login` e `gh repo clone diogoalves39602-cpu/chamados-manutencao`.
3. Na pasta do projeto: `npm install`.
4. Copie o **`.env.local`** do PC antigo por meio seguro (pendrive, gerenciador de senhas). Ele
   não vai para o Git e tem a chave mestra do banco. Sem ele, monte de novo a partir do
   `.env.example` (seção 2).
5. `npm run dev` para rodar local, ou só edite e faça `git push` para publicar.

Antes de mexer em um PC, rode `git pull` para trazer o que foi feito no outro.
