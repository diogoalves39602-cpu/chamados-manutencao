import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { trocarCodigoPorUsuario } from "@/lib/solicitante/oauth";
import { configPlataforma, ehPlataforma } from "@/lib/solicitante/plataformas";
import { COOKIE_OAUTH, COOKIE_SESSAO, criarSessao, DURACAO_SESSAO_S, verificar } from "@/lib/solicitante/sessao";

// GET /auth/feishu/retorno?code=...&state=...  (URL cadastrada no app do Feishu/Lark)
const estadoSchema = z.object({ state: z.string(), voltar: z.string(), plataforma: z.string(), exp: z.number() });

export async function GET(request: NextRequest, ctx: RouteContext<"/auth/[plataforma]/retorno">) {
  const { plataforma } = await ctx.params;
  const base = appUrl() ?? request.nextUrl.origin;
  const falhar = (motivo: string, voltar = "/abrir-chamado") => {
    const url = new URL(voltar, base);
    url.searchParams.set("login", motivo);
    const r = NextResponse.redirect(url);
    r.cookies.delete({ name: COOKIE_OAUTH, path: "/auth" });
    return r;
  };

  const cfg = ehPlataforma(plataforma) ? configPlataforma(plataforma) : null;
  if (!cfg) return falhar("indisponivel");

  const estado = estadoSchema.safeParse(verificar(request.cookies.get(COOKIE_OAUTH)?.value));
  const params = request.nextUrl.searchParams;
  if (!estado.success || estado.data.exp < Date.now() || estado.data.plataforma !== cfg.plataforma) {
    return falhar("expirado");
  }
  if (params.get("state") !== estado.data.state) return falhar("expirado", estado.data.voltar);
  if (params.get("error")) return falhar("negado", estado.data.voltar);
  const code = params.get("code");
  if (!code) return falhar("erro", estado.data.voltar);

  try {
    const usuario = await trocarCodigoPorUsuario(cfg, code, `${base}/auth/${cfg.plataforma}/retorno`);
    const { valor } = criarSessao({
      plataforma: cfg.plataforma,
      id: usuario.openId,
      nome: usuario.nome,
      email: usuario.email,
      celular: usuario.celular,
    });
    const resposta = NextResponse.redirect(new URL(estado.data.voltar, base));
    resposta.cookies.delete({ name: COOKIE_OAUTH, path: "/auth" });
    resposta.cookies.set(COOKIE_SESSAO, valor, {
      httpOnly: true,
      secure: base.startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: DURACAO_SESSAO_S,
    });
    return resposta;
  } catch (e) {
    console.error(`login ${cfg.plataforma}:`, e);
    return falhar("erro", estado.data.voltar);
  }
}
