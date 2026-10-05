-- =============================================================================
-- Etapa 2 · Limite de taxa (anti-spam) para o formulário público e o webhook.
-- Janela fixa por chave (ex.: "form:<hash do IP>", "webhook:<origem>").
-- =============================================================================

create table public.limites_taxa (
  chave         text primary key,
  janela_inicio timestamptz not null default now(),
  contagem      integer not null default 0
);

alter table public.limites_taxa enable row level security;
revoke all on public.limites_taxa from anon, authenticated;

-- Retorna true se a requisição está dentro do limite (e já a contabiliza).
create or replace function public.consumir_limite(p_chave text, p_max integer, p_janela_segundos integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contagem integer;
begin
  insert into public.limites_taxa as l (chave, janela_inicio, contagem)
  values (p_chave, now(), 1)
  on conflict (chave) do update set
    janela_inicio = case
      when l.janela_inicio < now() - make_interval(secs => p_janela_segundos) then now()
      else l.janela_inicio end,
    contagem = case
      when l.janela_inicio < now() - make_interval(secs => p_janela_segundos) then 1
      else l.contagem + 1 end
  returning contagem into v_contagem;

  return v_contagem <= p_max;
end;
$$;

revoke execute on function public.consumir_limite(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consumir_limite(text, integer, integer) to service_role;
