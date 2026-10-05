-- salvar_turnos: valida o tamanho do nome (2–40) com mensagem clara,
-- em vez de estourar o check constraint da tabela.
create or replace function public.salvar_turnos(p_turnos jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_minuto int;
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores podem alterar turnos.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_turnos) <> 'array' or jsonb_array_length(p_turnos) = 0 then
    raise exception 'Informe ao menos um turno.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_turnos) t(nome text, inicio time, fim time)
    where char_length(trim(coalesce(t.nome, ''))) not between 2 and 40
       or t.inicio is null or t.fim is null or t.inicio = t.fim
  ) then
    raise exception 'Cada turno precisa de nome (2 a 40 caracteres) e de horários de início e fim diferentes.'
      using errcode = 'P0001';
  end if;

  if (select count(distinct lower(trim(t.nome))) from jsonb_to_recordset(p_turnos) t(nome text))
     <> jsonb_array_length(p_turnos) then
    raise exception 'Há turnos com o mesmo nome.' using errcode = 'P0001';
  end if;

  -- Cada minuto do dia deve pertencer a exatamente um turno.
  select m into v_minuto
  from generate_series(0, 1439) m
  where (
    select count(*)
    from jsonb_to_recordset(p_turnos) t(nome text, inicio time, fim time)
    where (t.inicio < t.fim and make_time(m / 60, m % 60, 0) >= t.inicio and make_time(m / 60, m % 60, 0) < t.fim)
       or (t.inicio > t.fim and (make_time(m / 60, m % 60, 0) >= t.inicio or make_time(m / 60, m % 60, 0) < t.fim))
  ) <> 1
  order by m
  limit 1;
  if found then
    raise exception 'Os turnos precisam cobrir as 24 horas sem sobreposição (problema às %).',
      to_char(make_time(v_minuto / 60, v_minuto % 60, 0), 'HH24:MI') using errcode = 'P0001';
  end if;

  delete from public.turnos where true;
  insert into public.turnos (nome, inicio, fim, ordem)
  select trim(t.nome), t.inicio, t.fim, t.ordem::smallint
  from rows from (jsonb_to_recordset(p_turnos) as (nome text, inicio time, fim time))
       with ordinality as t(nome, inicio, fim, ordem);
end;
$$;
