-- =============================================================================
-- Etapa 5 · Notificações (Feishu/Lark) e alerta de prazo, 24/7.
--
-- Fluxo:
--   pg_cron (a cada minuto) → disparar_cron_alertas()
--     → só se houver algo pendente, chama POST {app_url}/api/cron/alertas via pg_net
--     → o app "reivindica" os chamados (UPDATE ... RETURNING, sem duplicar)
--       e envia os cartões para todos os destinos ativos.
--
-- app_url e cron_secret ficam no Supabase Vault (ver README).
-- =============================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Chamados recém-abertos ainda não notificados (janela de 15 min para reenvio).
create or replace function public.reivindicar_novos_chamados(p_chamado_id uuid default null, p_limite integer default 20)
returns setof public.chamados
language sql
security definer
set search_path = ''
as $$
  update public.chamados c
     set notificado_novo_em = now()
   where c.id in (
     select x.id from public.chamados x
     where x.notificado_novo_em is null
       and x.aberto_em > now() - interval '15 minutes'
       and (p_chamado_id is null or x.id = p_chamado_id)
     order by x.aberto_em
     limit p_limite
     for update skip locked
   )
  returning c.*;
$$;

-- Devolve o chamado para a fila de envio (falha em todos os destinos).
create or replace function public.liberar_notificacao_novo(p_chamado_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chamados set notificado_novo_em = null where id = p_chamado_id;
$$;

-- Chamados ativos a X minutos (configurável) de estourar o prazo, ou já estourados
-- há pouco, que ainda não receberam alerta. Cada chamado recebe um alerta só.
create or replace function public.reivindicar_alertas_prazo(p_limite integer default 20)
returns setof public.chamados
language sql
security definer
set search_path = ''
as $$
  update public.chamados c
     set alerta_prazo_enviado_em = now()
   where c.id in (
     select x.id
     from public.chamados x
     cross join public.configuracoes cfg
     where x.status in ('aberto', 'em_andamento')
       and x.alerta_prazo_enviado_em is null
       and x.prazo_limite <= now() + make_interval(mins => cfg.alerta_minutos_antes)
       and x.prazo_limite > now() - interval '2 hours'
     order by x.prazo_limite
     limit p_limite
     for update of x skip locked
   )
  returning c.*;
$$;

create or replace function public.existem_notificacoes_pendentes()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chamados x
    where x.notificado_novo_em is null and x.aberto_em > now() - interval '15 minutes'
  ) or exists (
    select 1 from public.chamados x cross join public.configuracoes cfg
    where x.status in ('aberto', 'em_andamento')
      and x.alerta_prazo_enviado_em is null
      and x.prazo_limite <= now() + make_interval(mins => cfg.alerta_minutos_antes)
      and x.prazo_limite > now() - interval '2 hours'
  );
$$;

-- Chamado pelo pg_cron. Só aciona o app quando há trabalho (economiza
-- invocações de função no plano gratuito do Netlify/Vercel).
create or replace function public.disparar_cron_alertas()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url     text;
  v_segredo text;
begin
  if not public.existem_notificacoes_pendentes() then
    return;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'app_url';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'cron_secret';
  if v_url is null or v_segredo is null then
    raise log 'disparar_cron_alertas: defina app_url e cron_secret no Vault';
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/cron/alertas',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_segredo, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$$;

revoke execute on function
  public.reivindicar_novos_chamados(uuid, integer),
  public.liberar_notificacao_novo(uuid),
  public.reivindicar_alertas_prazo(integer),
  public.existem_notificacoes_pendentes(),
  public.disparar_cron_alertas()
from public, anon, authenticated;

grant execute on function
  public.reivindicar_novos_chamados(uuid, integer),
  public.liberar_notificacao_novo(uuid),
  public.reivindicar_alertas_prazo(integer)
to service_role;

-- Agendamentos (cron.schedule com o mesmo nome substitui o anterior).
select cron.schedule('alertas-chamados', '* * * * *', 'select public.disparar_cron_alertas()');
select cron.schedule(
  'limpar-limites-taxa',
  '17 6 * * *',
  $$delete from public.limites_taxa where janela_inicio < now() - interval '1 day'$$
);
