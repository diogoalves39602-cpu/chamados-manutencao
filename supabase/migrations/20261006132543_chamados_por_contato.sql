-- =============================================================================
-- Acompanhamento sem número: lista os chamados de um telefone ou e-mail.
-- Telefone: compara só os dígitos, pelo final (aceita com/sem +55, DDD, espaços).
-- E-mail: igual, sem diferenciar maiúsculas. Somente service_role (o servidor
-- aplica limite de consultas por IP). Devolve só dados de andamento, nunca o contato.
-- =============================================================================

create or replace function public.chamados_por_contato(p_contato text, p_limite integer default 20)
returns table (
  numero                 text,
  status                 public.status_chamado,
  local                  text,
  categoria              text,
  aberto_em              timestamptz,
  prazo_limite           timestamptz,
  recebido_em            timestamptz,
  finalizado_em          timestamptz,
  situacao_prazo         public.situacao_prazo,
  observacao_finalizacao text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_texto   text := lower(trim(coalesce(p_contato, '')));
  v_digitos text := regexp_replace(coalesce(p_contato, ''), '\D', '', 'g');
  v_n       integer;
begin
  if position('@' in v_texto) > 1 then
    return query
      select c.numero, c.status, c.local, cat.nome, c.aberto_em, c.prazo_limite, c.recebido_em,
             c.finalizado_em, c.situacao_prazo, c.observacao_finalizacao
      from public.chamados c
      join public.categorias cat on cat.id = c.categoria_id
      where lower(trim(c.solicitante_contato)) = v_texto
      order by c.aberto_em desc
      limit least(p_limite, 50);
    return;
  end if;

  -- Telefone: pelo menos 8 dígitos; compara os últimos N (até 11: DDD + número).
  if length(v_digitos) < 8 then
    return;
  end if;
  v_n := least(length(v_digitos), 11);

  return query
    select c.numero, c.status, c.local, cat.nome, c.aberto_em, c.prazo_limite, c.recebido_em,
           c.finalizado_em, c.situacao_prazo, c.observacao_finalizacao
    from public.chamados c
    join public.categorias cat on cat.id = c.categoria_id
    where length(regexp_replace(c.solicitante_contato, '\D', '', 'g')) >= v_n
      and right(regexp_replace(c.solicitante_contato, '\D', '', 'g'), v_n) = right(v_digitos, v_n)
    order by c.aberto_em desc
    limit least(p_limite, 50);
end;
$$;

revoke execute on function public.chamados_por_contato(text, integer) from public, anon, authenticated;
grant execute on function public.chamados_por_contato(text, integer) to service_role;
