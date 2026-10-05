-- =============================================================================
-- Etapa 1 · Funções, triggers e RPCs do fluxo do chamado
-- Toda regra de SLA vive aqui, para valer igual em qualquer canal de entrada.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();
create trigger destinos_atualizado_em before update on public.destinos_notificacao
  for each row execute function public.tocar_atualizado_em();
create trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function public.tocar_atualizado_em();

create or replace function public.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.ativo
  );
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = (select auth.uid()) and p.ativo and p.papel = 'admin'
  );
$$;

create or replace function public.rotulo_status(p_status public.status_chamado)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'aberto' then 'aberto'
    when 'em_andamento' then 'em andamento'
    when 'finalizado' then 'finalizado'
    when 'cancelado' then 'cancelado'
  end;
$$;

-- Turno pela hora local (America/Sao_Paulo) do momento informado.
create or replace function public.turno_para(p_momento timestamptz)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with h as (select (p_momento at time zone 'America/Sao_Paulo')::time as hora)
  select coalesce((
    select t.nome
    from public.turnos t, h
    where (t.inicio < t.fim and h.hora >= t.inicio and h.hora < t.fim)
       or (t.inicio > t.fim and (h.hora >= t.inicio or h.hora < t.fim))
    order by t.ordem, t.id
    limit 1
  ), 'Sem turno');
$$;

-- CH-000123 (cresce para 7+ dígitos sem truncar).
create or replace function public.gerar_numero_chamado()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'CH-' || lpad(s.n::text, greatest(6, length(s.n::text)), '0')
  from (select nextval('public.chamados_numero_seq') as n) s;
$$;

-- -----------------------------------------------------------------------------
-- Perfis: nunca deixar o sistema sem um admin ativo
-- -----------------------------------------------------------------------------
create or replace function public.perfis_proteger_ultimo_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.papel = 'admin' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'admin' or not new.ativo)
     and not exists (
       select 1 from public.perfis p
       where p.id <> old.id and p.papel = 'admin' and p.ativo
     )
  then
    raise exception 'Não é possível remover ou desativar o último administrador ativo.'
      using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger perfis_proteger_ultimo_admin
  before update or delete on public.perfis
  for each row execute function public.perfis_proteger_ultimo_admin();

-- -----------------------------------------------------------------------------
-- Chamados: inserção (snapshot de SLA, prazo e turno)
-- -----------------------------------------------------------------------------
create or replace function public.chamados_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sla integer;
begin
  select c.sla_minutos into v_sla from public.configuracoes c where c.id;

  new.numero        := public.gerar_numero_chamado();
  new.status        := 'aberto';
  new.aberto_em     := now();
  new.sla_minutos   := coalesce(v_sla, 120);
  new.prazo_limite  := new.aberto_em + make_interval(mins => new.sla_minutos);
  new.turno         := public.turno_para(new.aberto_em);
  new.atualizado_em := now();

  -- Campos de fluxo nunca vêm preenchidos na abertura.
  new.recebido_por := null;  new.recebido_em := null;
  new.finalizado_por := null;  new.finalizado_em := null;  new.observacao_finalizacao := null;
  new.situacao_prazo := null;  new.tempo_total_minutos := null;  new.tempo_ate_assumir_minutos := null;
  new.cancelado_por := null;  new.cancelado_em := null;  new.motivo_cancelamento := null;
  new.notificado_novo_em := null;  new.alerta_prazo_enviado_em := null;

  return new;
end;
$$;

create trigger chamados_antes_inserir
  before insert on public.chamados
  for each row execute function public.chamados_antes_inserir();

-- -----------------------------------------------------------------------------
-- Chamados: atualização (máquina de estados + cálculo do SLA)
-- -----------------------------------------------------------------------------
create or replace function public.chamados_antes_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Dados da abertura são imutáveis.
  if (new.id, new.numero, new.origem, new.aberto_em, new.sla_minutos, new.prazo_limite, new.turno,
      new.solicitante_nome, new.solicitante_setor, new.solicitante_contato, new.local,
      new.categoria_id, new.descricao, new.foto_path)
     is distinct from
     (old.id, old.numero, old.origem, old.aberto_em, old.sla_minutos, old.prazo_limite, old.turno,
      old.solicitante_nome, old.solicitante_setor, old.solicitante_contato, old.local,
      old.categoria_id, old.descricao, old.foto_path)
  then
    raise exception 'Os dados de abertura do chamado % não podem ser alterados.', old.numero
      using errcode = 'P0001';
  end if;

  -- Finalizado e cancelado são estados terminais: só colunas de notificação mudam.
  if old.status in ('finalizado', 'cancelado') then
    if (new.status, new.recebido_por, new.recebido_em, new.finalizado_por, new.finalizado_em,
        new.observacao_finalizacao, new.situacao_prazo, new.tempo_total_minutos,
        new.tempo_ate_assumir_minutos, new.cancelado_por, new.cancelado_em, new.motivo_cancelamento)
       is distinct from
       (old.status, old.recebido_por, old.recebido_em, old.finalizado_por, old.finalizado_em,
        old.observacao_finalizacao, old.situacao_prazo, old.tempo_total_minutos,
        old.tempo_ate_assumir_minutos, old.cancelado_por, old.cancelado_em, old.motivo_cancelamento)
    then
      raise exception 'O chamado % já está %, não pode ser alterado.',
        old.numero, public.rotulo_status(old.status) using errcode = 'P0001';
    end if;
    new.atualizado_em := now();
    return new;
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'aberto'       and new.status in ('em_andamento', 'finalizado', 'cancelado'))
    or (old.status = 'em_andamento' and new.status in ('finalizado', 'cancelado'))
  ) then
    raise exception 'Transição inválida: % → %.',
      public.rotulo_status(old.status), public.rotulo_status(new.status) using errcode = 'P0001';
  end if;

  if new.status = 'aberto' then
    new.recebido_por := null;
    new.recebido_em := null;
  end if;

  -- Primeira vez que alguém assume: registra o tempo até assumir.
  if new.recebido_por is not null and old.recebido_em is null then
    new.recebido_em := coalesce(new.recebido_em, now());
    new.tempo_ate_assumir_minutos :=
      round(extract(epoch from (new.recebido_em - new.aberto_em)) / 60)::integer;
  elsif old.recebido_em is not null then
    new.recebido_em := old.recebido_em;  -- reatribuição mantém o primeiro atendimento
    new.tempo_ate_assumir_minutos := old.tempo_ate_assumir_minutos;
  end if;

  if new.status = 'finalizado' then
    new.finalizado_em := now();
    new.situacao_prazo := case
      when new.finalizado_em <= new.prazo_limite then 'dentro_do_prazo'::public.situacao_prazo
      else 'fora_do_prazo'::public.situacao_prazo
    end;
    new.tempo_total_minutos :=
      round(extract(epoch from (new.finalizado_em - new.aberto_em)) / 60)::integer;
  else
    new.finalizado_por := null;
    new.finalizado_em := null;
    new.observacao_finalizacao := null;
    new.situacao_prazo := null;
    new.tempo_total_minutos := null;
  end if;

  if new.status = 'cancelado' then
    new.cancelado_em := now();
  else
    new.cancelado_por := null;
    new.cancelado_em := null;
    new.motivo_cancelamento := null;
  end if;

  new.atualizado_em := now();
  return new;
end;
$$;

create trigger chamados_antes_atualizar
  before update on public.chamados
  for each row execute function public.chamados_antes_atualizar();

-- -----------------------------------------------------------------------------
-- Chamados: histórico (auditoria)
-- As RPCs informam a ação e o comentário via set_config local à transação.
-- -----------------------------------------------------------------------------
create or replace function public.chamados_registrar_historico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acao       text := nullif(current_setting('app.acao', true), '');
  v_comentario text := nullif(trim(current_setting('app.comentario', true)), '');
begin
  if tg_op = 'INSERT' then
    insert into public.chamado_historico (chamado_id, acao, status_de, status_para, usuario_id, comentario)
    values (new.id, 'aberto', null, new.status, (select auth.uid()),
            'Chamado aberto via ' || new.origem::text);
    return null;
  end if;

  if new.status is not distinct from old.status
     and new.recebido_por is not distinct from old.recebido_por then
    return null;  -- só colunas de notificação mudaram
  end if;

  v_acao := coalesce(v_acao, case
    when new.status is distinct from old.status and new.status = 'em_andamento' then 'assumido'
    when new.status is distinct from old.status then new.status::text
    else 'reatribuido'
  end);

  insert into public.chamado_historico
    (chamado_id, acao, status_de, status_para, usuario_id, responsavel_id, comentario)
  values (
    new.id, v_acao, old.status, new.status, (select auth.uid()), new.recebido_por,
    coalesce(v_comentario, case new.status
      when 'finalizado' then new.observacao_finalizacao
      when 'cancelado' then new.motivo_cancelamento
    end)
  );
  return null;
end;
$$;

create trigger chamados_registrar_historico
  after insert or update on public.chamados
  for each row execute function public.chamados_registrar_historico();

-- -----------------------------------------------------------------------------
-- RPC: abrir chamado (somente service_role — chamada pelo servidor do
-- formulário público e do webhook, que definem a origem)
-- -----------------------------------------------------------------------------
create or replace function public.abrir_chamado(
  p_solicitante_nome    text,
  p_solicitante_setor   text,
  p_solicitante_contato text,
  p_local               text,
  p_categoria_id        smallint,
  p_descricao           text,
  p_origem              public.origem_chamado,
  p_foto_path           text default null
)
returns public.chamados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chamados;
begin
  if not exists (select 1 from public.categorias c where c.id = p_categoria_id and c.ativo) then
    raise exception 'Categoria inválida ou inativa.' using errcode = 'P0001';
  end if;

  insert into public.chamados (
    solicitante_nome, solicitante_setor, solicitante_contato, local,
    categoria_id, descricao, origem, foto_path
  ) values (
    trim(p_solicitante_nome), trim(p_solicitante_setor), trim(p_solicitante_contato), trim(p_local),
    p_categoria_id, trim(p_descricao), p_origem, nullif(trim(p_foto_path), '')
  )
  returning * into v;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: validar token do webhook (somente service_role). Retorna a origem
-- do canal ou null se o token for inválido/revogado.
-- -----------------------------------------------------------------------------
create or replace function public.validar_token_integracao(p_token text)
returns public.origem_chamado
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_origem public.origem_chamado;
begin
  update public.tokens_integracao t
     set ultimo_uso_em = now()
   where t.token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
     and t.ativo
  returning t.origem into v_origem;
  return v_origem;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs do fluxo da equipe
-- -----------------------------------------------------------------------------
create or replace function public.assumir_chamado(p_chamado_id uuid)
returns public.chamados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chamados;
begin
  if not public.eh_equipe() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select * into v from public.chamados c where c.id = p_chamado_id for update;
  if not found then
    raise exception 'Chamado não encontrado.' using errcode = 'P0002';
  end if;
  if v.status <> 'aberto' then
    raise exception 'O chamado % já está %.', v.numero, public.rotulo_status(v.status)
      using errcode = 'P0001';
  end if;

  perform set_config('app.acao', 'assumido', true);
  update public.chamados c
     set status = 'em_andamento', recebido_por = (select auth.uid()), recebido_em = now()
   where c.id = p_chamado_id
  returning * into v;
  return v;
end;
$$;

-- Finalizar direto de "aberto" também assume o chamado (recebido_por = quem finalizou).
create or replace function public.finalizar_chamado(p_chamado_id uuid, p_observacao text)
returns public.chamados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chamados;
begin
  if not public.eh_equipe() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_observacao, ''))) < 3 then
    raise exception 'Informe a observação de finalização.' using errcode = 'P0001';
  end if;

  select * into v from public.chamados c where c.id = p_chamado_id for update;
  if not found then
    raise exception 'Chamado não encontrado.' using errcode = 'P0002';
  end if;
  if v.status not in ('aberto', 'em_andamento') then
    raise exception 'O chamado % já está %.', v.numero, public.rotulo_status(v.status)
      using errcode = 'P0001';
  end if;

  perform set_config('app.acao', 'finalizado', true);
  update public.chamados c
     set status = 'finalizado',
         recebido_por = coalesce(c.recebido_por, (select auth.uid())),
         recebido_em = coalesce(c.recebido_em, now()),
         finalizado_por = (select auth.uid()),
         finalizado_em = now(),
         observacao_finalizacao = trim(p_observacao)
   where c.id = p_chamado_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.reatribuir_chamado(
  p_chamado_id uuid,
  p_tecnico_id uuid,
  p_comentario text default null
)
returns public.chamados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chamados;
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores podem reatribuir chamados.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfis p where p.id = p_tecnico_id and p.ativo) then
    raise exception 'Técnico inválido ou inativo.' using errcode = 'P0001';
  end if;

  select * into v from public.chamados c where c.id = p_chamado_id for update;
  if not found then
    raise exception 'Chamado não encontrado.' using errcode = 'P0002';
  end if;
  if v.status not in ('aberto', 'em_andamento') then
    raise exception 'O chamado % já está %.', v.numero, public.rotulo_status(v.status)
      using errcode = 'P0001';
  end if;
  if v.recebido_por = p_tecnico_id then
    raise exception 'O chamado já está com esse técnico.' using errcode = 'P0001';
  end if;

  perform set_config('app.acao', 'reatribuido', true);
  perform set_config('app.comentario', coalesce(p_comentario, ''), true);
  update public.chamados c
     set status = 'em_andamento', recebido_por = p_tecnico_id
   where c.id = p_chamado_id
  returning * into v;
  return v;
end;
$$;

create or replace function public.cancelar_chamado(p_chamado_id uuid, p_motivo text)
returns public.chamados
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chamados;
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores podem cancelar chamados.' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Informe o motivo do cancelamento (mínimo 5 caracteres).' using errcode = 'P0001';
  end if;

  select * into v from public.chamados c where c.id = p_chamado_id for update;
  if not found then
    raise exception 'Chamado não encontrado.' using errcode = 'P0002';
  end if;
  if v.status not in ('aberto', 'em_andamento') then
    raise exception 'O chamado % já está %.', v.numero, public.rotulo_status(v.status)
      using errcode = 'P0001';
  end if;

  perform set_config('app.acao', 'cancelado', true);
  update public.chamados c
     set status = 'cancelado', cancelado_por = (select auth.uid()),
         cancelado_em = now(), motivo_cancelamento = trim(p_motivo)
   where c.id = p_chamado_id
  returning * into v;
  return v;
end;
$$;
