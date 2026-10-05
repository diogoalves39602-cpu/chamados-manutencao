// Tipos do banco, gerados pelo Supabase (generate_typescript_types) e compactados.
// Ao criar nova migration, regenere e atualize este arquivo.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type ChamadoRow = {
  aberto_em: string
  alerta_prazo_enviado_em: string | null
  atualizado_em: string
  cancelado_em: string | null
  cancelado_por: string | null
  categoria_id: number
  descricao: string
  finalizado_em: string | null
  finalizado_por: string | null
  foto_path: string | null
  id: string
  local: string
  motivo_cancelamento: string | null
  notificado_novo_em: string | null
  numero: string
  observacao_finalizacao: string | null
  origem: Database["public"]["Enums"]["origem_chamado"]
  prazo_limite: string
  recebido_em: string | null
  recebido_por: string | null
  situacao_prazo: Database["public"]["Enums"]["situacao_prazo"] | null
  sla_minutos: number
  solicitante_contato: string
  solicitante_nome: string
  solicitante_setor: string
  status: Database["public"]["Enums"]["status_chamado"]
  tempo_ate_assumir_minutos: number | null
  tempo_total_minutos: number | null
  turno: string
}

type RetornoChamado = {
  Returns: ChamadoRow
  SetofOptions: {
    from: "*"
    to: "chamados"
    isOneToOne: true
    isSetofReturn: false
  }
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categorias: {
        Row: { ativo: boolean; id: number; nome: string; ordem: number }
        Insert: { ativo?: boolean; id?: number; nome: string; ordem?: number }
        Update: { ativo?: boolean; id?: number; nome?: string; ordem?: number }
        Relationships: []
      }
      chamado_historico: {
        Row: {
          acao: string
          chamado_id: string
          comentario: string | null
          criado_em: string
          id: number
          responsavel_id: string | null
          status_de: Database["public"]["Enums"]["status_chamado"] | null
          status_para: Database["public"]["Enums"]["status_chamado"]
          usuario_id: string | null
        }
        Insert: {
          acao: string
          chamado_id: string
          comentario?: string | null
          criado_em?: string
          id?: never
          responsavel_id?: string | null
          status_de?: Database["public"]["Enums"]["status_chamado"] | null
          status_para: Database["public"]["Enums"]["status_chamado"]
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          chamado_id?: string
          comentario?: string | null
          criado_em?: string
          id?: never
          responsavel_id?: string | null
          status_de?: Database["public"]["Enums"]["status_chamado"] | null
          status_para?: Database["public"]["Enums"]["status_chamado"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_historico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_historico_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: ChamadoRow
        Insert: Partial<ChamadoRow> & {
          categoria_id: number
          descricao: string
          local: string
          numero: string
          origem: Database["public"]["Enums"]["origem_chamado"]
          prazo_limite: string
          sla_minutos: number
          solicitante_contato: string
          solicitante_nome: string
          solicitante_setor: string
          turno: string
        }
        Update: Partial<ChamadoRow>
        Relationships: [
          {
            foreignKeyName: "chamados_cancelado_por_fkey"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_finalizado_por_fkey"
            columns: ["finalizado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_recebido_por_fkey"
            columns: ["recebido_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          alerta_minutos_antes: number
          atualizado_em: string
          atualizado_por: string | null
          id: boolean
          sla_minutos: number
        }
        Insert: {
          alerta_minutos_antes?: number
          atualizado_em?: string
          atualizado_por?: string | null
          id?: boolean
          sla_minutos?: number
        }
        Update: {
          alerta_minutos_antes?: number
          atualizado_em?: string
          atualizado_por?: string | null
          id?: boolean
          sla_minutos?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      destinos_notificacao: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          nome: string
          plataforma: Database["public"]["Enums"]["plataforma_notificacao"]
          secret_assinatura: string | null
          webhook_url: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome: string
          plataforma: Database["public"]["Enums"]["plataforma_notificacao"]
          secret_assinatura?: string | null
          webhook_url: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          nome?: string
          plataforma?: Database["public"]["Enums"]["plataforma_notificacao"]
          secret_assinatura?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          deve_trocar_senha: boolean
          id: string
          login: string
          nome: string
          papel: Database["public"]["Enums"]["papel_usuario"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          deve_trocar_senha?: boolean
          id: string
          login: string
          nome: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          deve_trocar_senha?: boolean
          id?: string
          login?: string
          nome?: string
          papel?: Database["public"]["Enums"]["papel_usuario"]
        }
        Relationships: []
      }
      tokens_integracao: {
        Row: {
          ativo: boolean
          criado_em: string
          criado_por: string | null
          id: string
          nome: string
          origem: Database["public"]["Enums"]["origem_chamado"]
          prefixo: string
          revogado_em: string | null
          token_hash: string
          ultimo_uso_em: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome: string
          origem: Database["public"]["Enums"]["origem_chamado"]
          prefixo: string
          revogado_em?: string | null
          token_hash: string
          ultimo_uso_em?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          criado_por?: string | null
          id?: string
          nome?: string
          origem?: Database["public"]["Enums"]["origem_chamado"]
          prefixo?: string
          revogado_em?: string | null
          token_hash?: string
          ultimo_uso_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_integracao_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: { fim: string; id: number; inicio: string; nome: string; ordem: number }
        Insert: { fim: string; id?: number; inicio: string; nome: string; ordem?: number }
        Update: { fim?: string; id?: number; inicio?: string; nome?: string; ordem?: number }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_chamado: RetornoChamado & {
        Args: {
          p_categoria_id: number
          p_descricao: string
          p_foto_path?: string
          p_local: string
          p_origem: Database["public"]["Enums"]["origem_chamado"]
          p_solicitante_contato: string
          p_solicitante_nome: string
          p_solicitante_setor: string
        }
      }
      assumir_chamado: RetornoChamado & { Args: { p_chamado_id: string } }
      cancelar_chamado: RetornoChamado & { Args: { p_chamado_id: string; p_motivo: string } }
      eh_admin: { Args: never; Returns: boolean }
      eh_equipe: { Args: never; Returns: boolean }
      finalizar_chamado: RetornoChamado & { Args: { p_chamado_id: string; p_observacao: string } }
      gerar_numero_chamado: { Args: never; Returns: string }
      reatribuir_chamado: RetornoChamado & {
        Args: { p_chamado_id: string; p_comentario?: string; p_tecnico_id: string }
      }
      rotulo_status: {
        Args: { p_status: Database["public"]["Enums"]["status_chamado"] }
        Returns: string
      }
      turno_para: { Args: { p_momento: string }; Returns: string }
      validar_token_integracao: {
        Args: { p_token: string }
        Returns: Database["public"]["Enums"]["origem_chamado"]
      }
    }
    Enums: {
      origem_chamado: "formulario" | "feishu" | "lark" | "api"
      papel_usuario: "tecnico" | "admin"
      plataforma_notificacao: "feishu" | "lark"
      situacao_prazo: "dentro_do_prazo" | "fora_do_prazo"
      status_chamado: "aberto" | "em_andamento" | "finalizado" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

export const Constants = {
  public: {
    Enums: {
      origem_chamado: ["formulario", "feishu", "lark", "api"],
      papel_usuario: ["tecnico", "admin"],
      plataforma_notificacao: ["feishu", "lark"],
      situacao_prazo: ["dentro_do_prazo", "fora_do_prazo"],
      status_chamado: ["aberto", "em_andamento", "finalizado", "cancelado"],
    },
  },
} as const
