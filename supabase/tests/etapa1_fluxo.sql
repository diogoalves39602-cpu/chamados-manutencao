-- =============================================================================
-- Teste da etapa 1: fluxo do chamado, SLA, histórico, RLS e privilégios.
-- Tudo roda num único bloco que termina com RAISE EXCEPTION, então NADA fica
-- gravado (rollback). A mensagem final mostra "TESTES OK" ou a falha.
-- Depois de rodar, reinicie a sequência:
--   select setval('public.chamados_numero_seq', 1, false);
-- (só se ainda não houver chamados reais)
-- =============================================================================
do $$
declare
  v_admin uuid := gen_random_uuid();
  v_tec1  uuid := gen_random_uuid();
  v_tec2  uuid := gen_random_uuid();
  v_cat   smallint;
  c1 public.chamados;
  c2 public.chamados;
  c3 public.chamados;
  v_int int;
  v_txt text;
  v_log text := '';
begin
  select id into v_cat from public.categorias where nome = 'Elétrica';

  insert into auth.users (id, instance_id, aud, role, email) values
    (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste.admin@chamados.local'),
    (v_tec1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste.tec1@chamados.local'),
    (v_tec2,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste.tec2@chamados.local');
  insert into public.perfis (id, login, nome, papel) values
    (v_admin, 'teste.admin', 'Admin Teste', 'admin'),
    (v_tec1,  'teste.tec1',  'Técnico Um',  'tecnico'),
    (v_tec2,  'teste.tec2',  'Técnico Dois','tecnico');

  -- 1. Turnos (hora de São Paulo, intervalo [início, fim))
  assert public.turno_para('2026-10-05 05:59:59-03') = 'Noite', 'turno 05:59';
  assert public.turno_para('2026-10-05 06:00:00-03') = 'Manhã', 'turno 06:00';
  assert public.turno_para('2026-10-05 13:59:59-03') = 'Manhã', 'turno 13:59';
  assert public.turno_para('2026-10-05 14:00:00-03') = 'Tarde', 'turno 14:00';
  assert public.turno_para('2026-10-05 22:00:00-03') = 'Noite', 'turno 22:00';
  assert public.turno_para('2026-10-06 00:30:00-03') = 'Noite', 'turno 00:30';
  assert public.turno_para('2026-10-05 12:00:00+00') = 'Manhã', 'turno 12:00 UTC = 09:00 SP';
  v_log := v_log || E'\n 1 ok  turnos calculados no fuso de São Paulo';

  -- 2. Abertura: número, prazo de 120 min, turno, status, histórico
  c1 := public.abrir_chamado('  Maria Souza ', 'RH', '11 99999-0000', 'Sala 3', v_cat,
                             'Tomada soltando faísca', 'formulario');
  assert c1.numero ~ '^CH-[0-9]{6}$', 'formato do número: ' || c1.numero;
  assert c1.solicitante_nome = 'Maria Souza', 'trim do nome';
  assert c1.status = 'aberto', 'status inicial';
  assert c1.prazo_limite - c1.aberto_em = interval '120 minutes', 'prazo = abertura + 120 min';
  assert c1.sla_minutos = 120, 'snapshot do SLA';
  assert c1.turno = public.turno_para(c1.aberto_em), 'turno gravado';
  v_log := v_log || format(E'\n 2 ok  abertura %s, prazo +120 min, turno %s', c1.numero, c1.turno);

  -- 3. Técnico 1 vê o chamado (RLS) e assume
  perform set_config('request.jwt.claims', json_build_object('sub', v_tec1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_int from public.chamados where id = c1.id;
  assert v_int = 1, 'equipe deve ver o chamado';
  c1 := public.assumir_chamado(c1.id);
  assert c1.status = 'em_andamento' and c1.recebido_por = v_tec1 and c1.recebido_em is not null, 'assumir';
  assert c1.tempo_ate_assumir_minutos = 0, 'tempo até assumir';
  v_log := v_log || E'\n 3 ok  técnico vê e assume';

  -- 4. Técnico 2 tenta assumir o mesmo chamado → erro
  perform set_config('request.jwt.claims', json_build_object('sub', v_tec2, 'role', 'authenticated')::text, true);
  begin
    perform public.assumir_chamado(c1.id);
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 4: assumir 2x deveria falhar'; end if;
    v_log := v_log || E'\n 4 ok  assumir de novo bloqueado: ' || sqlerrm;
  end;

  -- 5. Técnico não pode cancelar
  begin
    perform public.cancelar_chamado(c1.id, 'Teste de cancelamento');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 5: técnico cancelou'; end if;
    v_log := v_log || E'\n 5 ok  técnico não cancela: ' || sqlerrm;
  end;

  -- 6. UPDATE direto na tabela é negado (só via RPC)
  begin
    update public.chamados set descricao = 'hack' where id = c1.id;
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 6: update direto permitido'; end if;
    v_log := v_log || E'\n 6 ok  update direto negado: ' || sqlerrm;
  end;

  -- 7. Finalizar exige observação; dentro do prazo
  perform set_config('request.jwt.claims', json_build_object('sub', v_tec1, 'role', 'authenticated')::text, true);
  begin
    perform public.finalizar_chamado(c1.id, '  ');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 7a: finalizou sem observação'; end if;
  end;
  c1 := public.finalizar_chamado(c1.id, 'Tomada substituída');
  assert c1.status = 'finalizado' and c1.finalizado_por = v_tec1, 'finalizar';
  assert c1.situacao_prazo = 'dentro_do_prazo', 'situação dentro do prazo';
  assert c1.tempo_total_minutos = 0, 'tempo total';
  v_log := v_log || E'\n 7 ok  finalizado dentro do prazo, observação obrigatória';

  -- 8. Histórico do chamado 1: aberto → assumido → finalizado
  select string_agg(acao, ' > ' order by id) into v_txt from public.chamado_historico where chamado_id = c1.id;
  assert v_txt = 'aberto > assumido > finalizado', 'histórico: ' || coalesce(v_txt, 'vazio');
  v_log := v_log || E'\n 8 ok  histórico: ' || v_txt;

  -- 9. Estado terminal: nem o dono do banco reabre
  execute 'reset role';
  begin
    update public.chamados set status = 'aberto' where id = c1.id;
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 9: reabriu chamado finalizado'; end if;
    v_log := v_log || E'\n 9 ok  finalizado é terminal: ' || sqlerrm;
  end;

  -- 10. Admin reatribui um chamado aberto e depois cancela com motivo
  c2 := public.abrir_chamado('João', 'Produção', 'joao@empresa.com', 'Linha 2', v_cat, 'Lâmpada queimada', 'feishu');
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  c2 := public.reatribuir_chamado(c2.id, v_tec2, 'Técnico 2 está no prédio');
  assert c2.status = 'em_andamento' and c2.recebido_por = v_tec2, 'reatribuir';
  select acao || '|' || usuario_id::text || '|' || responsavel_id::text into v_txt
    from public.chamado_historico where chamado_id = c2.id order by id desc limit 1;
  assert v_txt = 'reatribuido|' || v_admin || '|' || v_tec2, 'histórico da reatribuição';
  begin
    perform public.cancelar_chamado(c2.id, 'abc');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 10a: cancelou sem motivo'; end if;
  end;
  c2 := public.cancelar_chamado(c2.id, 'Chamado duplicado');
  assert c2.status = 'cancelado' and c2.situacao_prazo is null, 'cancelar';
  v_log := v_log || E'\n10 ok  admin reatribui e cancela (motivo obrigatório)';

  -- 11. Fora do prazo (simula abertura há 3h desligando o trigger só neste teste)
  execute 'reset role';
  c3 := public.abrir_chamado('Ana', 'TI', 'ramal 2045', 'Servidor', v_cat, 'Nobreak apitando', 'api');
  alter table public.chamados disable trigger chamados_antes_atualizar;
  update public.chamados
     set aberto_em = now() - interval '3 hours', prazo_limite = now() - interval '1 hour'
   where id = c3.id;
  alter table public.chamados enable trigger chamados_antes_atualizar;
  perform set_config('request.jwt.claims', json_build_object('sub', v_tec2, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  c3 := public.finalizar_chamado(c3.id, 'Bateria trocada');
  assert c3.situacao_prazo = 'fora_do_prazo', 'situação fora do prazo';
  assert c3.tempo_total_minutos = 180, 'tempo total 180: ' || c3.tempo_total_minutos;
  assert c3.recebido_por = v_tec2 and c3.tempo_ate_assumir_minutos = 180, 'finalizar direto também assume';
  v_log := v_log || E'\n11 ok  fora do prazo (180 min); finalizar direto do aberto assume';

  -- 12. Público (anon): sem acesso a chamados, sem RPC; vê categorias ativas
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform count(*) from public.chamados;
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 12a: anon leu chamados'; end if;
  end;
  begin
    perform public.abrir_chamado('X', 'Y', '12345', 'Z', v_cat, 'teste anon', 'formulario');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 12b: anon chamou abrir_chamado'; end if;
  end;
  select count(*) into v_int from public.categorias;
  assert v_int = 7, 'anon vê 7 categorias ativas';
  v_log := v_log || E'\n12 ok  anon: sem acesso a chamados nem à RPC; vê categorias';

  -- 13. Usuário autenticado sem perfil (ex.: cadastro indevido) não vê nada
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_int from public.chamados;
  assert v_int = 0, 'sem perfil não vê chamados';
  begin
    perform public.abrir_chamado('X', 'Y', '12345', 'Z', v_cat, 'teste auth', 'api');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 13: authenticated chamou abrir_chamado'; end if;
  end;
  v_log := v_log || E'\n13 ok  autenticado sem perfil não vê chamados nem abre direto';

  -- 14. Último admin não pode ser desativado
  execute 'reset role';
  begin
    update public.perfis set ativo = false where id = v_admin;
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 14: desativou o último admin'; end if;
    v_log := v_log || E'\n14 ok  ' || sqlerrm;
  end;

  -- 15. Token de integração (hash SHA-256)
  insert into public.tokens_integracao (nome, origem, token_hash, prefixo)
  values ('Base Feishu', 'feishu', encode(sha256(convert_to('tok_teste_123', 'UTF8')), 'hex'), 'tok_test');
  assert public.validar_token_integracao('tok_teste_123') = 'feishu', 'token válido';
  assert public.validar_token_integracao('errado') is null, 'token inválido';
  v_log := v_log || E'\n15 ok  token por canal validado por hash';

  -- 16. Destino de notificação só aceita domínios oficiais
  begin
    insert into public.destinos_notificacao (nome, plataforma, webhook_url)
    values ('Malicioso', 'feishu', 'https://exemplo.com/open-apis/bot/v2/hook/abc');
    raise exception 'ESPERAVA_ERRO';
  exception when others then
    if sqlerrm = 'ESPERAVA_ERRO' then raise exception 'FALHA 16: aceitou URL não oficial'; end if;
  end;
  insert into public.destinos_notificacao (nome, plataforma, webhook_url) values
    ('Grupo Feishu', 'feishu', 'https://open.feishu.cn/open-apis/bot/v2/hook/abc-123'),
    ('Grupo Lark',   'lark',   'https://open.larksuite.com/open-apis/bot/v2/hook/def-456');
  v_log := v_log || E'\n16 ok  destinos restritos a open.feishu.cn / open.larksuite.com';

  raise exception 'TESTES OK (rollback):%', v_log;
end;
$$;
