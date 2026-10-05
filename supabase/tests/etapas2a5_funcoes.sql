-- =============================================================================
-- Teste das funções das etapas 2, 4 e 5. Termina em RAISE EXCEPTION → rollback.
-- Depois de rodar (sem chamados reais no banco):
--   select setval('public.chamados_numero_seq', coalesce((select max(substr(numero, 4)::bigint) from public.chamados), 0) + 1, false);
-- =============================================================================
do $$
declare
  v_tec uuid := gen_random_uuid();
  v_cat smallint;
  c1 public.chamados;
  c2 public.chamados;
  v jsonb;
  v_int int;
  v_bool boolean;
  v_log text := '';
begin
  select id into v_cat from public.categorias where nome = 'TI';
  insert into auth.users (id, instance_id, aud, role, email)
  values (v_tec, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste.t@chamados.local');
  insert into public.perfis (id, login, nome, papel) values (v_tec, 'teste.t', 'Técnico Teste', 'admin');

  -- Limite de taxa: 3 por janela
  assert public.consumir_limite('teste:ip', 3, 600), 'limite 1';
  assert public.consumir_limite('teste:ip', 3, 600), 'limite 2';
  assert public.consumir_limite('teste:ip', 3, 600), 'limite 3';
  assert not public.consumir_limite('teste:ip', 3, 600), 'limite 4 deve bloquear';
  update public.limites_taxa set janela_inicio = now() - interval '11 minutes' where chave = 'teste:ip';
  assert public.consumir_limite('teste:ip', 3, 600), 'janela nova libera';
  v_log := v_log || E'\n2.1 ok  limite de taxa bloqueia na 4ª e libera na janela seguinte';

  -- Notificação de novo chamado: reivindica uma vez só
  c1 := public.abrir_chamado('Ana', 'TI', 'ramal 2000', 'Sala 1', v_cat, 'Impressora travada', 'formulario');
  assert public.existem_notificacoes_pendentes(), 'pendente após abrir';
  select count(*) into v_int from public.reivindicar_novos_chamados(c1.id);
  assert v_int = 1, 'reivindica 1';
  select count(*) into v_int from public.reivindicar_novos_chamados(c1.id);
  assert v_int = 0, 'não reivindica 2x';
  perform public.liberar_notificacao_novo(c1.id);
  select count(*) into v_int from public.reivindicar_novos_chamados();
  assert v_int = 1, 'liberado volta para a fila';
  v_log := v_log || E'\n5.1 ok  novo chamado reivindicado uma única vez; liberar devolve à fila';

  -- Alerta de prazo: chamado a 20 min do prazo (alerta = 30 min antes)
  c2 := public.abrir_chamado('Bia', 'RH', 'ramal 2001', 'Sala 2', v_cat, 'Sem rede', 'lark');
  perform public.reivindicar_novos_chamados(c2.id);
  select count(*) into v_int from public.reivindicar_alertas_prazo();
  assert v_int = 0, 'ainda longe do prazo';
  alter table public.chamados disable trigger chamados_antes_atualizar;
  update public.chamados set prazo_limite = now() + interval '20 minutes' where id = c2.id;
  alter table public.chamados enable trigger chamados_antes_atualizar;
  assert public.existem_notificacoes_pendentes(), 'alerta pendente';
  select count(*) into v_int from public.reivindicar_alertas_prazo();
  assert v_int = 1, 'alerta reivindicado';
  select count(*) into v_int from public.reivindicar_alertas_prazo();
  assert v_int = 0, 'alerta não repete';
  assert not public.existem_notificacoes_pendentes(), 'nada pendente';
  v_log := v_log || E'\n5.2 ok  alerta de 30 min disparado uma única vez';

  -- Sem app_url no Vault, o disparo não quebra
  perform public.disparar_cron_alertas();
  select count(*) into v_int from cron.job where jobname in ('alertas-chamados', 'limpar-limites-taxa');
  assert v_int = 2, 'jobs do pg_cron';
  v_log := v_log || E'\n5.3 ok  jobs do pg_cron agendados; disparo sem Vault é seguro';

  -- Indicadores (como membro da equipe; RLS aplicada)
  perform set_config('request.jwt.claims', json_build_object('sub', v_tec, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  c1 := public.finalizar_chamado(c1.id, 'Papel removido');
  v := public.indicadores(now() - interval '1 day', now() + interval '1 day');
  select (g->>'total')::int into v_int from jsonb_array_elements(v->'grupos') g where g->>'dimensao' = 'total';
  assert v_int = 2, 'total 2: ' || v::text;
  select (g->>'dentro')::int into v_int from jsonb_array_elements(v->'grupos') g where g->>'dimensao' = 'total';
  assert v_int = 1, 'dentro 1';
  select count(*) into v_int from jsonb_array_elements(v->'grupos') g where g->>'dimensao' = 'turno';
  assert v_int >= 1, 'quebra por turno';
  select count(*) into v_int from jsonb_array_elements(v->'grupos') g
   where g->>'dimensao' = 'tecnico' and g->>'chave' = 'Sem responsável';
  assert v_int = 1, 'grupo sem responsável';
  v_log := v_log || E'\n4.1 ok  indicadores: totais, dentro do prazo, quebras por dia/categoria/técnico/turno';

  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform public.indicadores(now() - interval '1 day', now());
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA: anon executou indicadores'; end if;
  end;
  begin
    perform public.consumir_limite('x', 1, 1);
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA: anon executou consumir_limite'; end if;
  end;
  execute 'reset role';
  v_log := v_log || E'\n4.2 ok  público não executa indicadores nem funções internas';

  raise exception 'TESTES OK (rollback):%', v_log;
end;
$$;
