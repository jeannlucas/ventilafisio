import { T, fmt } from "../../lib/theme";
import { Panel, HeroCard, SugBox } from "../ui";
import { Patient, DailyEvolution } from "../../types";
import * as C from "../../lib/clinical";
import { SourceFooter } from "../SourceFooter";

// ---------- Dashboard 4 indicadores + sugestão ----------
export function Dashboard({ patient, ev }: { patient: Patient; ev: DailyEvolution }) {
  const pbwEst = C.pbwOrEstimate((patient.sex ?? "M") as "M" | "F", patient.height_cm);
  const pbwVal = pbwEst.value;
  const bmiVal = C.bmi(patient.weight_kg, patient.height_cm);
  const obese = !!bmiVal && bmiVal >= 30;

  const dp = C.drivingPressure(ev.pplat, ev.peep);
  const pf = C.pfRatio(ev.pao2, ev.fio2);
  const vcKg = C.vcPerKg(ev.vc, pbwVal);
  const mp = C.mechanicalPower(ev.fr, ev.vc, ev.ppico, dp);

  const sVc = C.suggestVc(pbwVal, obese);
  const sPeep = C.suggestPeepFio2(pf, ev.spo2);
  const sVent = sVc ? C.suggestVentilation(pbwVal, sVc.target) : null;

  // Conteúdo de apoio à decisão exibido quando o indicador sai da faixa (item 2).
  // A validar pela equipe; não altera nenhuma fórmula nem os limites de classify.
  const vcLow = obese ? 6 : 4;
  const vcHigh = obese ? 8 : 6;
  const vcTooLow = vcKg != null && vcKg < vcLow;
  const sug = {
    dp: {
      ideal: "< 13 cmH₂O",
      actions: [
        "Reduzir o VC rumo a 6 ml/kg de peso predito (PBW)",
        "Otimizar a PEEP (se a complacência melhora, a Driving Pressure cai)",
        "Reavaliar a Pressão de Platô",
      ],
    },
    pplat: {
      ideal: "< 30 cmH₂O",
      actions: [
        "Reduzir o VC em passos de 1 ml/kg",
        "Reavaliar a PEEP",
        "Tratar fatores que reduzem a complacência",
      ],
    },
    vc: {
      ideal: `faixa ${vcLow}–${vcHigh} ml/kg sobre o peso predito`,
      actions: vcTooLow
        ? ["Avaliar aumento do VC rumo à faixa", "Checar hipoventilação"]
        : [
            "Reduzir o VC rumo à faixa",
            "Confirmar o cálculo sobre o peso predito (PBW)",
            "Vigiar a Pressão de Platô",
          ],
    },
    pf: {
      ideal: "≥ 300",
      actions: [
        "Aumentar a PEEP para recrutar (reavaliando o platô)",
        "Titular a FiO₂ pela SpO₂/PaO₂",
        "Considerar recrutamento e prona se P/F < 150",
        "Tratar a causa de base",
      ],
    },
  };

  const alerts: { s: "ok" | "warn" | "danger"; t: string }[] = [];
  if (vcKg != null && vcKg > 8) alerts.push({ s: "danger", t: `VC ${fmt(vcKg)} ml/kg acima de 8 — reduzir volume` });
  if (ev.pplat != null && ev.pplat >= 30) alerts.push({ s: "danger", t: `Pressão de platô ${fmt(ev.pplat, 0)} ≥ 30` });
  if (dp != null && dp > 15) alerts.push({ s: "danger", t: `Driving Pressure ${fmt(dp, 0)} > 15` });
  if (mp != null && mp >= 17) alerts.push({ s: "warn", t: `Mechanical Power ${fmt(mp)} J/min elevada` });

  // Painel único "Leitura do caso": alertas numéricos + correlações de
  // drogas/imagem, ordenados por severidade (danger > warn > info).
  const correlations = C.ventilationCorrelations(ev);
  const sevRank = { danger: 0, warn: 1, info: 2 } as const;
  const reading: { s: "danger" | "warn" | "info"; t: string }[] = [
    ...alerts.map((a) => ({ s: a.s as "danger" | "warn" | "info", t: a.t })),
    ...correlations.map((c) => ({ s: c.level as "warn" | "info", t: c.text })),
  ].sort((a, b) => sevRank[a.s] - sevRank[b.s]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
        <HeroCard label="DRIVING PRESSURE" value={fmt(dp, 0)} unit="cmH₂O" st={C.classify.dp(dp)} formula="Pplat − PEEP" suggestion={sug.dp} />
        <HeroCard label="PRESSÃO DE PLATÔ" value={fmt(ev.pplat, 0)} unit="cmH₂O" st={C.classify.pplat(ev.pplat)} formula="meta < 30" suggestion={sug.pplat} />
        <HeroCard label="VC / PESO PREDITO" value={fmt(vcKg)} unit="ml/kg" st={C.classify.vcKg(vcKg, obese)} formula={obese ? "meta 6–8" : "meta 4–6"} suggestion={sug.vc} />
        <HeroCard label="RELAÇÃO P/F" value={fmt(pf, 0)} unit="" st={C.classify.pf(pf)} formula="PaO₂ / FiO₂" suggestion={sug.pf} />
      </div>

      <SourceFooter sourceKeys={["dp", "pplat", "vcKg", "pf"]} />

      {reading.length > 0 && (
        <Panel title="Leitura do caso" sub="Alertas dos indicadores e correlações do quadro clínico com a ventilação">
          <div style={{ display: "grid", gap: 8 }}>
            {reading.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: `${color(a.s === "info" ? "ok" : a.s)}14`, border: `1px solid ${color(a.s === "info" ? "ok" : a.s)}40`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: color(a.s === "info" ? "ok" : a.s), fontWeight: 600 }}>
                <span>{a.s === "danger" ? "⚠" : a.s === "warn" ? "⚠" : "ℹ"}</span>
                <span style={{ color: T.txt, fontWeight: 500 }}>{a.t}</span>
              </div>
            ))}
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: T.dim, fontStyle: "italic" }}>
              Apoio à decisão, não conduta automática.
            </p>
            <SourceFooter sourceKeys={["vcKg", "pplat", "dp", "mp"]} />
          </div>
        </Panel>
      )}

      {sVc && (
        <Panel title={`Sugestão inicial · ${patient.current_mode ?? ""}`} accent={T.accent}
          sub={`${obese ? "obeso (IMC ≥30): alvo 6–8 ml/kg sobre peso predito" : "alvo protetor 4–6 ml/kg"} · ponto de partida, ajuste pela resposta`}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <SugBox label="VOLUME CORRENTE" big={`${sVc.target} mL`} sub={`faixa ${sVc.low}–${sVc.high} mL · 6kg=${sVc.ml6} 8kg=${sVc.ml8}`} />
            <SugBox label="PEEP / FiO₂" big={`${sPeep.peep} cmH₂O`} sub={`FiO₂ ${sPeep.fio2}% · tabela ARDSnet`} />
            {sVent && <SugBox label="FREQUÊNCIA" big={`${sVent.fr} /min`} sub="derivada do VC alvo" />}
            {sVent && <SugBox label="VOLUME-MINUTO" big={`${fmt(sVent.veL)} L/min`} sub="~100 ml/kg PBW/min" />}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: 11, color: T.dim }}>
            A Pressão de Platô é o limite de segurança: se passar de 30 cmH₂O, reduza o VC mesmo dentro da faixa.
          </p>
          <SourceFooter sourceKeys={["vcTarget", "peepFio2"]} />
        </Panel>
      )}
    </div>
  );
}

const color = (s: "ok" | "warn" | "danger") => (s === "ok" ? T.ok : s === "warn" ? T.warn : T.danger);
