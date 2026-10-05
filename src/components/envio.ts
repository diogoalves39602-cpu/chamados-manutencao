"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Envia o formulário para a action SEM o reset automático do React 19
 * (que, em formulários de edição, voltaria os campos aos valores antigos).
 */
export function enviarSemReset(acao: (dados: FormData) => void) {
  return (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acao(dados));
  };
}
