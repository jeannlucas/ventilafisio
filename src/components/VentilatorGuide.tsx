import { T } from "../lib/theme";
import { Panel } from "./ui";
import { Ventilator } from "../types";

// Guia de manuseio de um aparelho. Morava em pages/PatientDetail.tsx e era
// importado por pages/VentilatorLibrary.tsx: uma página dependia de outra
// página só para reaproveitar este bloco.
export default function VentilatorGuide({ vent, mode }: { vent: Ventilator; mode: string | null }) {
  const handling = vent.handling as Record<string, unknown>;
  const steps = (handling?.iniciar as string[]) ?? [];
  const tips = Object.entries(handling).filter(([k]) => k !== "iniciar");

  return (
    <Panel title={`${vent.brand} ${vent.model}`} sub={`Manuseio · modo atual: ${mode ?? "—"}`}>
      {!vent.verified && (
        <div style={{ fontSize: 11, color: T.warn, background: `${T.warn}14`, border: `1px solid ${T.warn}40`, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          Conteúdo não validado, confirme a nomenclatura na tela do aparelho antes do uso clínico.
        </div>
      )}
      {vent.param_labels && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 6 }}>Nomenclatura neste aparelho:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(vent.param_labels).map(([k, v]) => (
              <span key={k} style={{ fontSize: 11, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 999, padding: "3px 9px", color: T.txt }}>
                {k} → <strong>{v as string}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
      {steps.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 6 }}>Passo a passo inicial:</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.txt, lineHeight: 1.7 }}>
            {steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      )}
      {tips.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          {tips.map(([k, v]) => (
            <div key={k} style={{ fontSize: 13, color: T.txt }}>
              <span style={{ color: T.accent }}>{k.replace(/_/g, " ")}:</span> {v as string}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
