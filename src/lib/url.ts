import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

/** URL pública do app: APP_URL, ou o host da requisição atual. */
export async function urlBase() {
  const configurada = appUrl();
  if (configurada) return configurada;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
