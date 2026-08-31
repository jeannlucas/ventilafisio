// ============================================================
// Escores de força e mobilidade — Ventila Fisio
// Funções puras: sem React, sem Supabase.
// Fontes: MRC (De Jonghe 2002), RASS (Sessler 2002), IMS (Hodgson 2014).
// ============================================================
import { MRC_GROUPS } from "../data/scores";
import type { Classified } from "./clinical";

export interface MrcSide {
  d: number | null;
  e: number | null;
}

export type Mrc = Record<string, MrcSide>;

const grau = (v: number | null | undefined): v is number =>
  v != null && Number.isFinite(v) && v >= 0 && v <= 5;

/**
 * Soma dos 12 valores (6 grupos × 2 lados), máximo 60.
 * Devolve null se QUALQUER medida faltar: soma parcial exibida como total
 * inventaria uma fraqueza que ninguém mediu (armadilha 5).
 */
export function mrcTotal(m: Mrc | null | undefined): number | null {
  if (!m) return null;
  let soma = 0;
  for (const g of MRC_GROUPS) {
    const lado = m[g.key];
    if (!lado || !grau(lado.d) || !grau(lado.e)) return null;
    soma += lado.d + lado.e;
  }
  return soma;
}

/** Corte < 48 para fraqueza adquirida na UTI (De Jonghe 2002). */
export function classifyMrc(total: number | null): Classified | null {
  if (total == null || !Number.isFinite(total)) return null;
  if (total < 48) return { s: "danger", t: "Fraqueza adquirida na UTI" };
  if (total < 60) return { s: "warn", t: "Força reduzida" };
  return { s: "ok", t: "Força preservada" };
}

/** Lado mais fraco e a diferença total entre os lados. */
export function mrcAsymmetry(
  m: Mrc | null | undefined
): { lado: "d" | "e"; delta: number } | null {
  if (!m) return null;
  let somaD = 0;
  let somaE = 0;
  for (const g of MRC_GROUPS) {
    const lado = m[g.key];
    if (!lado || !grau(lado.d) || !grau(lado.e)) return null;
    somaD += lado.d;
    somaE += lado.e;
  }
  const delta = Math.abs(somaD - somaE);
  if (delta === 0) return null;
  return { lado: somaD < somaE ? "d" : "e", delta };
}
