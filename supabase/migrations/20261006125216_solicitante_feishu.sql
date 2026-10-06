-- =============================================================================
-- Identificação do solicitante pelo Feishu/Lark (login OAuth no formulário).
-- O ID vem do Feishu/Lark (open_id do app da empresa) e não pode ser digitado
-- pelo usuário: só o servidor, após o login, preenche estes campos.
-- =============================================================================

alter table public.chamados
  add column solicitante_plataforma text check (solicitante_plataforma in ('feishu', 'lark')),
  add column solicitante_externo_id text check (solicitante_externo_id is null or char_length(solicitante_externo_id) between 3 and 120),
  add constraint chamados_identificacao_completa
    check ((solicitante_plataforma is null) = (solicitante_externo_id is null));

create index chamados_solicitante_externo_idx
  on public.chamados (solicitante_plataforma, solicitante_externo_id, aberto_em desc)
  where solicitante_externo_id is not null;

-- Identidade do solicitante também é imutável depois da abertura.
create or replace function public.chamados_antes_atualizar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.numero, new.origem, new.aberto_em, new.sla_minutos, new.prazo_limite, new.turno,
      new.solicitante_nome, new.solicitante_setor, new.solicitante_contato, new.local,
      new.categoria_id, new.descricao, new.foto_path, new.solicitante_plataforma, new.solicitante_externo_id)
     is distinct from
     (old.id, old.numero, old.origem, old.aberto_em, old.sla_minutos, old.prazo_limite, old.turno,
      old.solicitante_nome, old.solicitante_setor, old.solicitante_contato, old.local,
      old.categoria_id, old.descricao, old.foto_path, old.solicitante_plataforma, old.solicitante_externo_id)
  then
    raise exception 'Os dados de abertura do chamado % não podem ser alterados.', old.numero
      using errcode = 'P0001';
  end if;

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

  if new.recebido_por is not null and old.recebido_em is null then
    new.recebido_em := coalesce(new.recebido_em, now());
    new.tempo_ate_assumir_minutos :=
      round(extract(epoch from (new.recebido_em - new.aberto_em)) / 60)::integer;
  elsif old.recebido_em is not null then
    new.recebido_em := old.recebido_em;
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

-- abrir_chamado ganha a identidade (opcional). Nova assinatura → recria e
-- reaplica os privilégios (somente service_role).
drop function public.abrir_chamado(text, text, text, text, smallint, text, public.origem_chamado, text);

create function public.abrir_chamado(
  p_solicitante_nome       text,
  p_solicitante_setor      text,
  p_solicitante_contato    text,
  p_local                  text,
  p_categoria_id           smallint,
  p_descricao              text,
  p_origem                 public.origem_chamado,
  p_foto_path              text default null,
  p_solicitante_plataforma text default null,
  p_solicitante_externo_id text default null
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
    categoria_id, descricao, origem, foto_path,
    solicitante_plataforma, solicitante_externo_id
  ) values (
    trim(p_solicitante_nome), trim(p_solicitante_setor), trim(p_solicitante_contato), trim(p_local),
    p_categoria_id, trim(p_descricao), p_origem, nullif(trim(p_foto_path), ''),
    p_solicitante_plataforma, nullif(trim(p_solicitante_externo_id), '')
  )
  returning * into v;

  return v;
end;
$$;

revoke execute on function
  public.abrir_chamado(text, text, text, text, smallint, text, public.origem_chamado, text, text, text)
from public, anon, authenticated;
grant execute on function
  public.abrir_chamado(text, text, text, text, smallint, text, public.origem_chamado, text, text, text)
to service_role;
