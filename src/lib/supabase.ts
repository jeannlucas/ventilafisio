import { createClient } from "@supabase/supabase-js";

/**
 * Configuração só vale com url e chave de fato preenchidas. String vazia era
 * o que derrubava o app: `createClient("")` lança "supabaseUrl is required"
 * durante o import, antes de qualquer componente renderizar, e o resultado
 * na tela era branco.
 */
export function isSupabaseConfigured(
  url?: string | null,
  anonKey?: string | null
): boolean {
  return Boolean(url?.trim() && anonKey?.trim());
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = isSupabaseConfigured(url, anonKey);

// Valores de reserva apenas para o cliente poder ser construído. Sem
// configuração o App troca toda a árvore pela tela de instruções, então
// nenhuma requisição chega a sair daqui.
const URL_DE_RESERVA = "http://localhost";
const CHAVE_DE_RESERVA = "sem-configuracao";

export const supabase = createClient(
  supabaseConfigured ? url! : URL_DE_RESERVA,
  supabaseConfigured ? anonKey! : CHAVE_DE_RESERVA
);
