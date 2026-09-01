import { Panel } from "../ui";
import { SourceFooter } from "../SourceFooter";
import { MRC_GROUPS } from "../../data/scores";
import { ultimaAvaliacaoMrc, mrcTotal, classifyMrc, mrcAsymmetry } from "../../lib/scores";
import { T, statusColor } from "../../lib/theme";
import type { DailyEvolution } from "../../types";

/**
 * Leitura da última avaliação motora COMPLETA, que pode ser de dias atrás.
 * Distinto do ScoresPanel do formulário, que captura a de hoje: aqui o
 * terapeuta consulta a referência anterior enquanto preenche a nova.
 */
export function MotorPanel({ evolutions }: { evolutions: DailyEvolution[] }) {
  const ultima = ultimaAvaliacaoMrc(evolutions);
  if (!ultima) return null;

  const total = mrcTotal(ultima.mrc);
  const cls = classifyMrc(total);
  const assim = mrcAsymmetry(ultima.mrc);
  const quando = new Date(ultima.recorded_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Panel
      title="Avaliação motora"
      sub={`Última avaliação completa, em ${quando}`}
      accent={T.purple}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 26, color: T.txt }}>{total}</strong>
          <span style={{ fontSize: 12, color: T.dim }}>/ 60</span>
          {cls && (
            <span style={{ fontSize: 12, color: statusColor(cls.s), fontWeight: 700 }}>
              {cls.t}
            </span>
          )}
          {assim && (
            <span style={{ fontSize: 12, color: T.warn }}>
              ⚠ assimetria à {assim.lado === "d" ? "direita" : "esquerda"} ({assim.delta})
            </span>
          )}
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {MRC_GROUPS.map((g) => {
            const lado = ultima.mrc[g.key];
            return (
              <div
                key={g.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 40px 40px",
                  gap: 8,
                  fontSize: 12.5,
                  color: T.txt,
                  padding: "3px 0",
                  borderBottom: `1px solid ${T.line}`,
                }}
              >
                <span>{g.label}</span>
                <span style={{ textAlign: "center", color: T.dim }}>{lado?.d}</span>
                <span style={{ textAlign: "center", color: T.dim }}>{lado?.e}</span>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 40px", gap: 8, fontSize: 10.5, color: T.dim }}>
            <span />
            <span style={{ textAlign: "center" }}>D</span>
            <span style={{ textAlign: "center" }}>E</span>
          </div>
        </div>

        <SourceFooter sourceKeys={["mrc"]} />
      </div>
    </Panel>
  );
}
