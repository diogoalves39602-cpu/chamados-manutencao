-- =============================================================================
-- Indicadores completos: além de dia/categoria/técnico/turno, agrupa por
-- origem (formulário, Feishu, Lark, API), hora do dia de abertura (Brasília) e
-- setor do solicitante (texto livre, sem diferenciar maiúsculas; "rotulo" traz a
-- grafia mais usada). Acrescenta a mediana dos
-- tempos, mais justa que a média quando um chamado demora muito.
-- Mesma assinatura e mesmas regras: SECURITY INVOKER (RLS), período pela abertura.
-- =============================================================================

create or replace function public.indicadores(
  p_inicio       timestamptz,
  p_fim          timestamptz,
  p_categoria_id smallint default null,
  p_tecnico_id   uuid default null,
  p_turno        text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select
      c.status, c.situacao_prazo, c.prazo_limite, c.turno,
      c.tempo_total_minutos, c.tempo_ate_assumir_minutos,
      (c.aberto_em at time zone 'America/Sao_Paulo')::date as dia,
      lpad(extract(hour from c.aberto_em at time zone 'America/Sao_Paulo')::int::text, 2, '0') as hora,
      c.origem::text as origem,
      regexp_replace(trim(c.solicitante_setor), '\s+', ' ', 'g') as setor_original,
      lower(regexp_replace(trim(c.solicitante_setor), '\s+', ' ', 'g')) as setor,
      cat.nome as categoria,
      coalesce(p.nome, 'Sem responsável') as tecnico
    from public.chamados c
    join public.categorias cat on cat.id = c.categoria_id
    left join public.perfis p on p.id = c.recebido_por
    where c.aberto_em >= p_inicio and c.aberto_em < p_fim
      and (p_categoria_id is null or c.categoria_id = p_categoria_id)
      and (p_tecnico_id is null or c.recebido_por = p_tecnico_id)
      and (p_turno is null or c.turno = p_turno)
  ),
  grupos as (
    select
      case
        when grouping(dia) = 0 then 'dia'
        when grouping(categoria) = 0 then 'categoria'
        when grouping(tecnico) = 0 then 'tecnico'
        when grouping(turno) = 0 then 'turno'
        when grouping(origem) = 0 then 'origem'
        when grouping(hora) = 0 then 'hora'
        when grouping(setor) = 0 then 'setor'
        else 'total'
      end as dimensao,
      coalesce(dia::text, categoria, tecnico, turno, origem, hora, setor, 'total') as chave,
      count(*)                                                        as total,
      count(*) filter (where status = 'aberto')                       as abertos,
      count(*) filter (where status = 'em_andamento')                 as em_andamento,
      count(*) filter (where status = 'finalizado')                   as finalizados,
      count(*) filter (where status = 'cancelado')                    as cancelados,
      count(*) filter (where situacao_prazo = 'dentro_do_prazo')      as dentro,
      count(*) filter (where situacao_prazo = 'fora_do_prazo')        as fora,
      count(*) filter (where status in ('aberto', 'em_andamento')
                         and prazo_limite < now())                    as atrasados,
      round(avg(tempo_total_minutos) filter (where status = 'finalizado'), 1)          as tempo_medio_total,
      round(avg(tempo_ate_assumir_minutos) filter (where status <> 'cancelado'), 1)    as tempo_medio_assumir,
      round((percentile_cont(0.5) within group (order by tempo_total_minutos)
             filter (where status = 'finalizado'))::numeric, 1)                         as tempo_mediano_total,
      round((percentile_cont(0.5) within group (order by tempo_ate_assumir_minutos)
             filter (where status <> 'cancelado'))::numeric, 1)                         as tempo_mediano_assumir,
      -- Setor é texto livre: agrupa sem diferenciar maiúsculas e mostra a grafia mais usada.
      mode() within group (order by setor_original)                                    as rotulo
    from base
    group by grouping sets ((), (dia), (categoria), (tecnico), (turno), (origem), (hora), (setor))
  )
  select jsonb_build_object(
    'grupos', coalesce((select jsonb_agg(to_jsonb(g) order by g.dimensao, g.chave) from grupos g), '[]'::jsonb),
    -- "Atrasados agora" independe do período: é a fila atual.
    'atrasados_agora', (
      select count(*)
      from public.chamados c
      where c.status in ('aberto', 'em_andamento') and c.prazo_limite < now()
        and (p_categoria_id is null or c.categoria_id = p_categoria_id)
        and (p_tecnico_id is null or c.recebido_por = p_tecnico_id)
        and (p_turno is null or c.turno = p_turno)
    ),
    'gerado_em', now()
  );
$$;

revoke execute on function public.indicadores(timestamptz, timestamptz, smallint, uuid, text) from public, anon;
grant execute on function public.indicadores(timestamptz, timestamptz, smallint, uuid, text) to authenticated;
