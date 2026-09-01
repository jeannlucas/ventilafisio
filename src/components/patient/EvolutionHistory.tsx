import { useState } from "react";
import { T } from "../../lib/theme";
import { Panel } from "../ui";
import { DailyEvolution } from "../../types";
import { IMAGING_FINDINGS, IV_MED_CATEGORIES, FEEDING_TUBES, DIET_TYPES } from "../../data/clinical-board";
import { mrcTotal } from "../../lib/scores";

// ---------- Histórico de evoluções (autor + data, passagem de plantão) ----------

const IMAGING_LABEL: Record<string, string> = Object.fromEntries(
  IMAGING_FINDINGS.map((f) => [f.key, f.label])
);
const TUBE_LABEL: Record<string, string> = Object.fromEntries(FEEDING_TUBES.map((o) => [o.v, o.t]));
const DIET_LABEL: Record<string, string> = Object.fromEntries(DIET_TYPES.map((o) => [o.v, o.t]));

function boardSummary(e: DailyEvolution) {
  const findings = [
    ...(e.imaging?.xray ?? []),
    ...(e.imaging?.ct ?? []),
    ...(e.imaging?.mri ?? []),
  ].map((k) => IMAGING_LABEL[k] ?? k);
  const medsOn = IV_MED_CATEGORIES.filter(
    (m) => e.iv_meds?.[m.key]?.on
  ).map((m) => m.label);
  const tube = e.feeding?.tube && e.feeding.tube !== "none" ? TUBE_LABEL[e.feeding.tube] : null;
  const diet = e.feeding?.diet ? DIET_LABEL[e.feeding.diet] : null;
  // Escores do dia. `!= null` e nunca falsy: RASS 0 e IMS 0 são medidas.
  const rassLabel = e.rass != null
    ? `RASS ${e.rass < 0 ? `−${Math.abs(e.rass)}` : e.rass}`
    : null;
  const imsLabel = e.ims != null ? `IMS ${e.ims}` : null;
  const mrcVal = mrcTotal(e.mrc);
  const mrcLabel = mrcVal != null ? `MRC ${mrcVal}/60` : null;
  const escores = [mrcLabel, rassLabel, imsLabel].filter((x): x is string => x != null);
  // Escores não entram aqui: eles já aparecem na linha-resumo, sempre visível
  // (abaixo). Contá-los em hasContent abriria a seta de expandir para um dia
  // cujo único conteúdo é escore, revelando um bloco vazio ao expandir.
  const hasContent = !!e.notes || findings.length > 0 || medsOn.length > 0 || !!tube || !!diet;
  return { findings, medsOn, tube, diet, escores, hasContent };
}

export function EvolutionHistory({ evolutions, authors }: { evolutions: DailyEvolution[]; authors: Record<string, string> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (evolutions.length === 0) return null;
  const ordered = [...evolutions].reverse();
  return (
    <Panel title="Histórico de evoluções" sub="Quem registrou e quando (toque para ver o quadro clínico do dia)">
      <div style={{ display: "grid", gap: 8 }}>
        {ordered.map((e) => {
          const b = boardSummary(e);
          const open = openId === e.id;
          return (
            <div key={e.id} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
              <div
                onClick={() => b.hasContent && setOpenId(open ? null : e.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: b.hasContent ? "pointer" : "default" }}
              >
                <div style={{ fontSize: 13, color: T.txt }}>
                  {b.hasContent ? <span style={{ color: T.dim }}>{open ? "▾ " : "▸ "}</span> : null}
                  {new Date(e.recorded_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                  {e.mode ? <span style={{ color: T.dim }}> · {e.mode}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: T.dim }}>{authors[e.owner_id] ?? "Profissional"}</div>
              </div>
              {b.escores.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12, color: T.dim }}>{b.escores.join(" · ")}</div>
              )}
              {open && b.hasContent && (
                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 13, color: T.txt, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12 }}>
                  {e.notes && <div><span style={{ color: T.dim }}>Impressão: </span>{e.notes}</div>}
                  {b.findings.length > 0 && <div><span style={{ color: T.dim }}>Imagem: </span>{b.findings.join(", ")}</div>}
                  {b.medsOn.length > 0 && <div><span style={{ color: T.dim }}>Medicamentos: </span>{b.medsOn.join(", ")}</div>}
                  {(b.tube || b.diet) && <div><span style={{ color: T.dim }}>Sonda/dieta: </span>{[b.tube, b.diet].filter(Boolean).join(" · ")}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
