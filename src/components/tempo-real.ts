"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Evento = RealtimePostgresChangesPayload<Tables<"chamados">>;

/**
 * Relógio que avança a cada segundo, alinhado ao horário do servidor
 * (o relógio do celular pode estar adiantado ou atrasado).
 * Começa no instante do servidor para o HTML do SSR bater com o do cliente.
 */
export function useAgora(agoraServidorMs: number) {
  const [agora, setAgora] = useState(agoraServidorMs);
  useEffect(() => {
    const diferenca = agoraServidorMs - Date.now();
    const tique = () => setAgora(Date.now() + diferenca);
    const intervalo = setInterval(tique, 1000);
    return () => clearInterval(intervalo);
  }, [agoraServidorMs]);
  return agora;
}

/**
 * Assina mudanças na tabela chamados (Supabase Realtime, respeitando a RLS) e
 * recarrega os dados do servidor. Também recarrega quando o celular volta do
 * modo de espera e a cada 60 s, caso a conexão em tempo real tenha caído.
 */
export function useChamadosTempoReal(aoReceber?: (evento: Evento) => void) {
  const router = useRouter();
  const callback = useRef(aoReceber);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    callback.current = aoReceber;
  });

  useEffect(() => {
    const supabase = criarClienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const recarregar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 300);
    };

    let ativo = true;
    const canal = supabase.channel("chamados-equipe");
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (!ativo) return;
      canal
        .on("postgres_changes", { event: "*", schema: "public", table: "chamados" }, (evento: Evento) => {
          callback.current?.(evento);
          recarregar();
        })
        .subscribe((status) => setConectado(status === "SUBSCRIBED"));
    })();

    const aoVoltar = () => {
      if (document.visibilityState === "visible") recarregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    const periodico = setInterval(recarregar, 60_000);

    return () => {
      ativo = false;
      clearTimeout(espera);
      clearInterval(periodico);
      document.removeEventListener("visibilitychange", aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return conectado;
}
