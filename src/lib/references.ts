// ============================================================
// Liga cada limiar que o app afirma à fonte que o sustenta.
// O teste em references.test.ts obriga este mapa a cobrir toda chave de
// `classify`. Mexeu no número sem mexer na fonte, a suíte reprova.
// ============================================================
import { REFERENCES, type Reference } from "../data/references";

export type SourceKey =
  // classificações de clinical.ts
  | "pf" | "vcKg" | "pplat" | "dp" | "mp" | "tobin" | "pimax"
  // motores de sugestão
  | "peepFio2" | "vcTarget" | "extubation"
  // escores desta fase
  | "mrc" | "rass" | "ims"
  // teste de respiração espontânea
  | "treFalha";

export const THRESHOLD_SOURCES: Record<SourceKey, string[]> = {
  pf: ["ardsnet_2000", "amib_sbpt_2024"],
  vcKg: ["ardsnet_2000", "amib_sbpt_2024"],
  pplat: ["ardsnet_2000", "amib_sbpt_2024"],
  dp: ["amato_2015", "guerin_2016"],
  mp: ["gattinoni_2016", "serpaneto_2018"],
  tobin: ["yangtobin_1991"],
  pimax: ["boles_2007", "amib_sbpt_2024"],
  peepFio2: ["ardsnet_2000"],
  vcTarget: ["ardsnet_2000"],
  extubation: ["boles_2007", "amib_sbpt_2024", "ferreira_2021", "duan_2021"],
  mrc: ["dejonghe_2002", "parecer_mrc_faixa"],
  rass: ["sessler_2002"],
  ims: ["hodgson_2014"],
  treFalha: ["boles_2007", "amib_sbpt_2024"],
};

const BY_ID = new Map(REFERENCES.map((r) => [r.id, r]));

export function sourcesFor(k: SourceKey): Reference[] {
  const ids = THRESHOLD_SOURCES[k];
  if (!ids) return [];
  return ids.map((id) => BY_ID.get(id)).filter((r): r is Reference => r != null);
}

/** Citação curta de cada fonte, para caber no rodapé do painel. */
export function shortCite(refs: Reference[]): string {
  return refs.map((r) => r.citacaoCurta).join(" · ");
}
