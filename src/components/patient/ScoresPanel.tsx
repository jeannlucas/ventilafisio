import { Panel, Field } from "../ui";
import { SourceFooter } from "../SourceFooter";
import { MRC_GROUPS, RASS_LEVELS, IMS_LEVELS } from "../../data/scores";
import { mrcTotal, classifyMrc, mrcAsymmetry, type Mrc } from "../../lib/scores";
import { T, statusColor } from "../../lib/theme";

const GRAUS = [
  { v: "", t: "—" },
  { v: "0", t: "0" }, { v: "1", t: "1" }, { v: "2", t: "2" },
  { v: "3", t: "3" }, { v: "4", t: "4" }, { v: "5", t: "5" },
];

/**
 * Painel controlado: não guarda estado próprio. Quem chama (EvolutionForm)
 * é o dono de mrc/rass/ims e passa os setters.
 */
export function ScoresPanel({
  mrc, onMrc, rass, onRass, ims, onIms,
}: {
  mrc: Mrc;
  onMrc: (m: Mrc) => void;
  rass: string;
  onRass: (v: string) => void;
  ims: string;
  onIms: (v: string) => void;
}) {
  const total = mrcTotal(mrc);
  const cls = classifyMrc(total);
  const assim = mrcAsymmetry(mrc);

  const setLado = (key: string, lado: "d" | "e", v: string) => {
    const atual = mrc[key] ?? { d: null, e: null };
    onMrc({ ...mrc, [key]: { ...atual, [lado]: v === "" ? null : Number(v) } });
  };

  const valor = (key: string, lado: "d" | "e") => {
    const v = mrc[key]?.[lado];
    return v == null ? "" : String(v);
  };

  return (
    <Panel title="Escores" sub="Força, sedação e mobilidade" accent={T.purple}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 8, letterSpacing: 0.3 }}>
            MRC · FORÇA MUSCULAR (0–5 POR LADO)
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {MRC_GROUPS.map((g) => (
              <div
                key={g.key}
                style={{ display: "grid", gridTemplateColumns: "1fr 76px 76px", gap: 8, alignItems: "end" }}
              >
                <span style={{ fontSize: 12.5, color: T.txt }}>{g.label}</span>
                <Field
                  label="D"
                  ariaLabel={`${g.label} — direita`}
                  value={valor(g.key, "d")}
                  onChange={(v) => setLado(g.key, "d", v)}
                  options={GRAUS}
                />
                <Field
                  label="E"
                  ariaLabel={`${g.label} — esquerda`}
                  value={valor(g.key, "e")}
                  onChange={(v) => setLado(g.key, "e", v)}
                  options={GRAUS}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.dim }}>TOTAL MRC</span>
            {total == null ? (
              <span style={{ fontSize: 13, color: T.dim, fontStyle: "italic" }}>
                incompleto — preencha os 12 valores
              </span>
            ) : (
              <>
                <strong style={{ fontSize: 22, color: T.txt }}>{total}</strong>
                <span style={{ fontSize: 12, color: T.dim }}>/ 60</span>
                {cls && (
                  <span style={{ fontSize: 12, color: statusColor(cls.s), fontWeight: 700 }}>
                    {cls.t}
                  </span>
                )}
              </>
            )}
            {assim && (
              <span style={{ fontSize: 12, color: T.warn }}>
                ⚠ assimetria à {assim.lado === "d" ? "direita" : "esquerda"} ({assim.delta})
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="RASS" value={rass} onChange={onRass} options={[{ v: "", t: "—" }, ...RASS_LEVELS]} />
          <Field label="IMS" value={ims} onChange={onIms} options={[{ v: "", t: "—" }, ...IMS_LEVELS]} />
        </div>

        <SourceFooter sourceKeys={["mrc", "rass", "ims"]} />
      </div>
    </Panel>
  );
}
