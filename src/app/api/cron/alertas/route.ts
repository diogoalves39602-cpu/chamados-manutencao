import { NextResponse, type NextRequest } from "next/server";
import { cronSecret } from "@/lib/env";
import { enviarAlertasPrazo, notificarNovos } from "@/lib/notificacoes/enviar";
import { segredoConfere } from "@/lib/seguranca";

// Chamado pelo pg_cron do Supabase (via pg_net) a cada minuto, somente quando
// há notificação pendente. Funciona igual na Vercel e no Netlify: a URL vem do
// Vault do Supabase (app_url), não de um cron da hospedagem.
//   POST /api/cron/alertas   Authorization: Bearer <CRON_SECRET>
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const esperado = cronSecret();
  if (!esperado) {
    return NextResponse.json({ ok: false, erro: "CRON_SECRET não configurado (mínimo 32 caracteres)." }, { status: 503 });
  }
  const recebido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!segredoConfere(recebido, esperado)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const [novos, alertas] = await Promise.all([notificarNovos(), enviarAlertasPrazo()]);
    const falhas = [...novos.falhas, ...alertas.falhas];
    if (falhas.length) console.error("Falhas de envio:", falhas);
    return NextResponse.json({
      ok: true,
      novos_notificados: novos.novos,
      alertas_enviados: alertas.alertas,
      falhas,
    });
  } catch (e) {
    console.error("cron/alertas:", e);
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
