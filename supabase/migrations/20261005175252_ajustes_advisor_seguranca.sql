-- =============================================================================
-- Etapa 1 · Ajuste apontado pelo Security Advisor:
-- o público (anon) não precisa executar eh_equipe/eh_admin. Separa a política
-- de categorias por papel e revoga o EXECUTE do anon.
--
-- Os avisos restantes ("authenticated pode executar SECURITY DEFINER") nas RPCs
-- assumir/finalizar/reatribuir/cancelar e em eh_equipe/eh_admin são
-- intencionais: as RPCs validam o papel internamente e as duas funções só
-- revelam o papel do próprio usuário.
-- =============================================================================

drop policy categorias_select on public.categorias;

create policy categorias_select_publico on public.categorias
  for select to anon
  using (ativo);

create policy categorias_select_equipe on public.categorias
  for select to authenticated
  using (ativo or (select public.eh_equipe()));

revoke execute on function public.eh_equipe(), public.eh_admin() from public, anon;
grant execute on function public.eh_equipe(), public.eh_admin() to authenticated;
