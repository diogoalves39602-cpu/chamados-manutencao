-- =============================================================================
-- Mensagens enviadas pela equipe ao solicitante (Feishu ou WhatsApp).
-- Feishu: enviada pelo bot do app da empresa (status enviada/falhou).
-- WhatsApp: o sistema abre a conversa com o texto pronto (status aberta_no_whatsapp),
-- quem envia de fato é o atendente no WhatsApp dele.
-- =============================================================================

create table public.mensagens_solicitante (
  id           bigint generated always as identity primary key,
  chamado_id   uuid not null references public.chamados (id) on delete cascade,
  canal        text not null check (canal in ('feishu', 'whatsapp')),
  texto        text not null check (char_length(trim(texto)) between 1 and 2000),
  status       text not null check (status in ('enviada', 'aberta_no_whatsapp', 'falhou')),
  erro         text,
  enviado_por  uuid references public.perfis (id) on delete set null,
  enviado_em   timestamptz not null default now()
);

create index mensagens_solicitante_chamado_idx on public.mensagens_solicitante (chamado_id, enviado_em);
create index mensagens_solicitante_enviado_por_idx on public.mensagens_solicitante (enviado_por);

alter table public.mensagens_solicitante enable row level security;
revoke all on public.mensagens_solicitante from anon, authenticated;
grant select, insert on public.mensagens_solicitante to authenticated;

-- Equipe lê; registra só em nome próprio (enviado_por = quem está logado).
create policy mensagens_select on public.mensagens_solicitante
  for select to authenticated using ((select public.eh_equipe()));
create policy mensagens_insert on public.mensagens_solicitante
  for insert to authenticated
  with check ((select public.eh_equipe()) and enviado_por = (select auth.uid()));
