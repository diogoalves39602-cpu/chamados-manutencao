-- =============================================================================
-- Etapa 1 · RLS, privilégios, Realtime e Storage
--
-- Modelo de acesso:
--   anon (público)  → nenhum acesso direto a chamados. Abertura acontece só no
--                     servidor (formulário/webhook) via RPC abrir_chamado com
--                     service_role. Pode ler apenas categorias ativas.
--   authenticated   → equipe ativa lê; altera somente pelas RPCs do fluxo.
--   admin           → gerencia categorias, turnos, SLA, tokens e destinos.
-- =============================================================================

alter table public.perfis               enable row level security;
alter table public.categorias           enable row level security;
alter table public.turnos               enable row level security;
alter table public.configuracoes        enable row level security;
alter table public.tokens_integracao    enable row level security;
alter table public.destinos_notificacao enable row level security;
alter table public.chamados             enable row level security;
alter table public.chamado_historico    enable row level security;

-- -----------------------------------------------------------------------------
-- Privilégios de tabela (defesa em profundidade além da RLS)
-- -----------------------------------------------------------------------------
revoke all on public.perfis, public.categorias, public.turnos, public.configuracoes,
              public.tokens_integracao, public.destinos_notificacao,
              public.chamados, public.chamado_historico
  from anon, authenticated;

grant select on public.categorias to anon;

grant select on public.perfis, public.chamados, public.chamado_historico to authenticated;
grant select, insert, update on public.categorias to authenticated;
grant select, insert, update, delete on public.turnos to authenticated;
grant select, update on public.configuracoes to authenticated;
grant select, update on public.tokens_integracao to authenticated;
grant select, insert, update, delete on public.destinos_notificacao to authenticated;

revoke all on sequence public.chamados_numero_seq from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Políticas
-- -----------------------------------------------------------------------------
create policy perfis_select on public.perfis
  for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_equipe()));

create policy categorias_select on public.categorias
  for select to anon, authenticated
  using (ativo or (select public.eh_equipe()));
create policy categorias_insert on public.categorias
  for insert to authenticated with check ((select public.eh_admin()));
create policy categorias_update on public.categorias
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy turnos_select on public.turnos
  for select to authenticated using ((select public.eh_equipe()));
create policy turnos_insert on public.turnos
  for insert to authenticated with check ((select public.eh_admin()));
create policy turnos_update on public.turnos
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy turnos_delete on public.turnos
  for delete to authenticated using ((select public.eh_admin()));

create policy configuracoes_select on public.configuracoes
  for select to authenticated using ((select public.eh_equipe()));
create policy configuracoes_update on public.configuracoes
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- Tokens são criados pelo servidor (service_role); o admin lista e revoga.
create policy tokens_select on public.tokens_integracao
  for select to authenticated using ((select public.eh_admin()));
create policy tokens_update on public.tokens_integracao
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy destinos_select on public.destinos_notificacao
  for select to authenticated using ((select public.eh_admin()));
create policy destinos_insert on public.destinos_notificacao
  for insert to authenticated with check ((select public.eh_admin()));
create policy destinos_update on public.destinos_notificacao
  for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy destinos_delete on public.destinos_notificacao
  for delete to authenticated using ((select public.eh_admin()));

create policy chamados_select on public.chamados
  for select to authenticated using ((select public.eh_equipe()));

create policy chamado_historico_select on public.chamado_historico
  for select to authenticated using ((select public.eh_equipe()));

-- -----------------------------------------------------------------------------
-- Privilégios de funções (por padrão o Postgres/Supabase libera EXECUTE)
-- -----------------------------------------------------------------------------
revoke execute on function
  public.tocar_atualizado_em(),
  public.turno_para(timestamptz),
  public.gerar_numero_chamado(),
  public.perfis_proteger_ultimo_admin(),
  public.chamados_antes_inserir(),
  public.chamados_antes_atualizar(),
  public.chamados_registrar_historico(),
  public.abrir_chamado(text, text, text, text, smallint, text, public.origem_chamado, text),
  public.validar_token_integracao(text),
  public.assumir_chamado(uuid),
  public.finalizar_chamado(uuid, text),
  public.reatribuir_chamado(uuid, uuid, text),
  public.cancelar_chamado(uuid, text)
from public, anon, authenticated;

grant execute on function
  public.abrir_chamado(text, text, text, text, smallint, text, public.origem_chamado, text),
  public.validar_token_integracao(text)
to service_role;

grant execute on function
  public.assumir_chamado(uuid),
  public.finalizar_chamado(uuid, text),
  public.reatribuir_chamado(uuid, uuid, text),
  public.cancelar_chamado(uuid, text)
to authenticated;

-- eh_equipe/eh_admin/rotulo_status ficam executáveis: são usadas nas políticas.

-- -----------------------------------------------------------------------------
-- Realtime (fila do painel). Respeita a RLS de chamados.
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.chamados;

-- -----------------------------------------------------------------------------
-- Storage: fotos dos chamados (bucket privado, 5 MB, só imagens).
-- Upload acontece via URL assinada gerada no servidor; a equipe lê.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-chamados', 'fotos-chamados', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy fotos_chamados_select on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-chamados' and (select public.eh_equipe()));
