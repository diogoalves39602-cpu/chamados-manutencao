-- Remove os dados de exemplo (chamados "[EXEMPLO]" e técnicos exemplo.*)
-- e reposiciona a numeração após o maior chamado real.
do $$
declare
  v_max bigint;
begin
  set local session_replication_role = replica; -- chamados finalizados são imutáveis pelos triggers

  delete from public.chamado_historico h
   using public.chamados c
   where h.chamado_id = c.id and c.descricao like '[EXEMPLO]%';
  delete from public.chamados where descricao like '[EXEMPLO]%';
  delete from public.perfis where login like 'exemplo.%';
  delete from auth.users where email like 'exemplo.%@chamados.local';

  select coalesce(max(substr(numero, 4)::bigint), 0) into v_max from public.chamados;
  perform setval('public.chamados_numero_seq', v_max + 1, false);
  raise notice 'Exemplo removido. Próximo número: CH-%', lpad((v_max + 1)::text, 6, '0');
end;
$$;
