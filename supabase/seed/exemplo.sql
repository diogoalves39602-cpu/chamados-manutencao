-- =============================================================================
-- DADOS DE EXEMPLO para testar painel e dashboard (~45 dias de chamados).
--
-- • 5 técnicos fictícios (login exemplo.*), SEM senha: não conseguem entrar.
-- • Chamados com descrição iniciada por "[EXEMPLO]".
-- • Já marcados como notificados (não disparam mensagens no Feishu/Lark).
-- • Inclui alguns chamados na fila agora (um atrasado, um perto do prazo).
--
-- Remover tudo: supabase/seed/remover_exemplo.sql
-- Determinístico (setseed): rodar duas vezes gera os mesmos dados — mas
-- rode o remover antes de rodar de novo.
-- =============================================================================
do $$
declare
  tecnicos uuid[] := array[
    '00000000-0000-4000-8000-00000000e001'::uuid, '00000000-0000-4000-8000-00000000e002'::uuid,
    '00000000-0000-4000-8000-00000000e003'::uuid, '00000000-0000-4000-8000-00000000e004'::uuid,
    '00000000-0000-4000-8000-00000000e005'::uuid];
  nomes_tec text[] := array['Carlos Mendes', 'Patrícia Lima', 'Rafael Souza', 'Juliana Rocha', 'Eduardo Alves'];
  -- Chance de finalizar no prazo por técnico (para o ranking ter diferença).
  taxa_tec numeric[] := array[0.93, 0.86, 0.80, 0.90, 0.72];
  solicitantes text[] := array['Ana Paula', 'Bruno Costa', 'Camila Reis', 'Diego Martins', 'Elaine Prado',
    'Fábio Nunes', 'Gabriela Teixeira', 'Henrique Dias', 'Isabela Moura', 'João Pedro', 'Karina Lopes', 'Lucas Araújo'];
  setores text[] := array['Produção', 'RH', 'Financeiro', 'Logística', 'Qualidade', 'TI', 'Comercial', 'Expedição'];
  locais text[] := array['Bloco A – térreo', 'Bloco A – 1º andar', 'Bloco B – sala 204', 'Galpão 1', 'Galpão 2',
    'Refeitório', 'Portaria principal', 'Estacionamento', 'Vestiário masculino', 'Vestiário feminino',
    'Sala de reuniões 3', 'Almoxarifado'];
  descricoes text[] := array[
    'Tomada sem energia', 'Disjuntor desarmando', 'Lâmpada queimada no corredor',          -- Elétrica
    'Vazamento na pia', 'Descarga não funciona', 'Torneira pingando',                     -- Hidráulica
    'Ar-condicionado não gela', 'Ar-condicionado pingando água', 'Controle do ar com defeito', -- Ar
    'Câmera sem imagem', 'Gravador do CFTV desligado', 'Câmera desalinhada',              -- CFTV
    'Computador não liga', 'Sem acesso à rede', 'Impressora travando',                    -- TI
    'Porta emperrada', 'Infiltração no teto', 'Piso solto',                               -- Predial
    'Cadeira quebrada', 'Bebedouro sem água gelada', 'Persiana caída'];                   -- Outros
  cats text[] := array['Elétrica', 'Hidráulica', 'Ar-condicionado', 'CFTV', 'TI', 'Predial', 'Outros'];
  peso_cat int[] := array[25, 15, 20, 8, 17, 10, 5];
  horas int[] := array[0,1,2,3,4,5,6,7,7,8,8,8,9,9,9,10,10,10,11,11,12,13,13,14,14,14,15,15,15,16,16,17,17,18,19,20,21,22,23];
  v_dia date;
  v_qtd int;
  i int;
  r numeric;
  v_cat_idx int;
  v_cat_id smallint;
  v_tec int;
  v_aberto timestamptz;
  v_recebido timestamptz;
  v_fim timestamptz;
  v_status public.status_chamado;
  v_id uuid;
  v_base bigint;
  v_n bigint := 0;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if exists (select 1 from public.perfis where login like 'exemplo.%') then
    raise exception 'Dados de exemplo já existem. Rode supabase/seed/remover_exemplo.sql antes.';
  end if;

  perform setseed(0.42);
  set local session_replication_role = replica; -- desliga triggers: datas históricas e fluxo já resolvido

  for i in 1..5 loop
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, banned_until)
    values (tecnicos[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'exemplo.tec' || i || '@chamados.local', now(), 'infinity');
    insert into public.perfis (id, login, nome, papel, ativo, deve_trocar_senha)
    values (tecnicos[i], 'exemplo.tec' || i, nomes_tec[i] || ' (exemplo)', 'tecnico', true, false);
  end loop;

  select coalesce(max(substr(numero, 4)::bigint), 0) into v_base from public.chamados;

  create temporary table tmp_seed (
    aberto_em timestamptz, categoria_id smallint, cat_idx int, tec int,
    status public.status_chamado, recebido_em timestamptz, fim timestamptz
  ) on commit drop;

  -- Histórico: 45 dias, 6 a 15 chamados por dia.
  for d in 1..45 loop
    v_dia := v_hoje - d;
    v_qtd := 6 + floor(random() * 10)::int;
    for i in 1..v_qtd loop
      -- categoria ponderada
      r := random() * 100;
      v_cat_idx := 1;
      while r > peso_cat[v_cat_idx] and v_cat_idx < 7 loop
        r := r - peso_cat[v_cat_idx];
        v_cat_idx := v_cat_idx + 1;
      end loop;
      select id into v_cat_id from public.categorias where nome = cats[v_cat_idx];

      v_aberto := (v_dia + make_time(horas[1 + floor(random() * array_length(horas, 1))::int], floor(random() * 60)::int, 0))
                  at time zone 'America/Sao_Paulo';
      continue when v_aberto > now() - interval '6 hours'; -- histórico precisa terminar no passado
      v_tec := 1 + floor(random() * 5)::int;
      v_recebido := v_aberto + make_interval(mins => 2 + floor(random() * 35)::int);

      if random() < 0.04 then
        v_status := 'cancelado';
        v_fim := v_aberto + make_interval(mins => 10 + floor(random() * 50)::int);
      else
        v_status := 'finalizado';
        if random() < taxa_tec[v_tec] then
          v_fim := v_recebido + make_interval(mins => 10 + floor(random() * greatest(1, 110 - extract(epoch from v_recebido - v_aberto) / 60))::int);
        else
          v_fim := v_aberto + make_interval(mins => 125 + floor(random() * 180)::int);
        end if;
      end if;
      insert into tmp_seed values (v_aberto, v_cat_id, v_cat_idx, v_tec, v_status, v_recebido, v_fim);
    end loop;
  end loop;

  -- Fila de agora: atrasado, perto do prazo, em andamento e recém-aberto.
  insert into tmp_seed
  select now() - x.idade, (select id from public.categorias where nome = cats[x.cat]), x.cat, x.tec, x.st,
         case when x.st = 'em_andamento' then now() - x.idade + interval '12 minutes' end, null
  from (values
    (interval '2 hours 35 minutes', 1, 2, 'em_andamento'::public.status_chamado),
    (interval '2 hours 10 minutes', 3, null, 'aberto'::public.status_chamado),
    (interval '1 hour 40 minutes', 5, 4, 'em_andamento'::public.status_chamado),
    (interval '1 hour 5 minutes', 2, null, 'aberto'::public.status_chamado),
    (interval '25 minutes', 6, 1, 'em_andamento'::public.status_chamado),
    (interval '6 minutes', 3, null, 'aberto'::public.status_chamado)
  ) as x(idade, cat, tec, st);

  for v_aberto, v_cat_id, v_cat_idx, v_tec, v_status, v_recebido, v_fim in
    select * from tmp_seed order by 1
  loop
    v_n := v_n + 1;
    v_id := gen_random_uuid();
    insert into public.chamados (
      id, numero, solicitante_nome, solicitante_setor, solicitante_contato, local, categoria_id, descricao,
      origem, status, turno, aberto_em, sla_minutos, prazo_limite,
      recebido_por, recebido_em, finalizado_por, finalizado_em, observacao_finalizacao,
      situacao_prazo, tempo_total_minutos, tempo_ate_assumir_minutos,
      cancelado_por, cancelado_em, motivo_cancelamento,
      notificado_novo_em, alerta_prazo_enviado_em, atualizado_em
    ) values (
      v_id,
      'CH-' || lpad((v_base + v_n)::text, 6, '0'),
      solicitantes[1 + floor(random() * 12)::int],
      setores[1 + floor(random() * 8)::int],
      '11 9' || lpad(floor(random() * 99999999)::text, 8, '0'),
      locais[1 + floor(random() * 12)::int],
      v_cat_id,
      '[EXEMPLO] ' || descricoes[(v_cat_idx - 1) * 3 + 1 + floor(random() * 3)::int],
      (array['formulario', 'formulario', 'formulario', 'feishu', 'lark', 'api'])[1 + floor(random() * 6)::int]::public.origem_chamado,
      v_status,
      public.turno_para(v_aberto),
      v_aberto, 120, v_aberto + interval '120 minutes',
      case when v_status <> 'aberto' and v_recebido is not null and v_status <> 'cancelado' then tecnicos[v_tec] end,
      case when v_status <> 'aberto' and v_status <> 'cancelado' then v_recebido end,
      case when v_status = 'finalizado' then tecnicos[v_tec] end,
      case when v_status = 'finalizado' then v_fim end,
      case when v_status = 'finalizado' then 'Serviço executado e testado com o solicitante.' end,
      case when v_status = 'finalizado' then
        (case when v_fim <= v_aberto + interval '120 minutes' then 'dentro_do_prazo' else 'fora_do_prazo' end)::public.situacao_prazo end,
      case when v_status = 'finalizado' then round(extract(epoch from v_fim - v_aberto) / 60)::int end,
      case when v_status in ('finalizado', 'em_andamento') then round(extract(epoch from v_recebido - v_aberto) / 60)::int end,
      null,
      case when v_status = 'cancelado' then v_fim end,
      case when v_status = 'cancelado' then 'Chamado duplicado (exemplo)' end,
      v_aberto, v_aberto, coalesce(v_fim, v_aberto)
    );

    insert into public.chamado_historico (chamado_id, acao, status_de, status_para, usuario_id, comentario, criado_em)
    values (v_id, 'aberto', null, 'aberto', null, 'Chamado aberto (exemplo)', v_aberto);
    if v_status in ('em_andamento', 'finalizado') then
      insert into public.chamado_historico (chamado_id, acao, status_de, status_para, usuario_id, responsavel_id, criado_em)
      values (v_id, 'assumido', 'aberto', 'em_andamento', tecnicos[v_tec], tecnicos[v_tec], v_recebido);
    end if;
    if v_status = 'finalizado' then
      insert into public.chamado_historico (chamado_id, acao, status_de, status_para, usuario_id, responsavel_id, comentario, criado_em)
      values (v_id, 'finalizado', 'em_andamento', 'finalizado', tecnicos[v_tec], tecnicos[v_tec],
              'Serviço executado e testado com o solicitante.', v_fim);
    elsif v_status = 'cancelado' then
      insert into public.chamado_historico (chamado_id, acao, status_de, status_para, comentario, criado_em)
      values (v_id, 'cancelado', 'aberto', 'cancelado', 'Chamado duplicado (exemplo)', v_fim);
    end if;
  end loop;

  perform setval('public.chamados_numero_seq', v_base + v_n + 1, false);
  raise notice 'Exemplo criado: % chamados.', v_n;
end;
$$;
