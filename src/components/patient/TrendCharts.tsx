import { T } from "../../lib/theme";
import { Panel } from "../ui";
import { Patient, DailyEvolution } from "../../types";
import * as C from "../../lib/clinical";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

// ---------- Gráficos de tendência ----------
export function TrendCharts({ patient, evolutions }: { patient: Patient; evolutions: DailyEvolution[] }) {
  const pbwVal = C.pbw((patient.sex ?? "M") as "M" | "F", patient.height_cm);
  const data = evolutions.map((e) => {
    const dp = C.drivingPressure(e.pplat, e.peep);
    return {
      date: new Date(e.recorded_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      dp,
      pplat: e.pplat,
      pf: C.pfRatio(e.pao2, e.fio2),
      cst: C.cStat(e.vc, e.pplat, e.peep),
      tobin: C.tobin(e.fr, e.vc),
      vcKg: C.vcPerKg(e.vc, pbwVal),
    };
  });

  const charts = [
    { title: "Driving Pressure & Platô", keys: [{ k: "dp", c: T.accent, n: "DP" }, { k: "pplat", c: T.warn, n: "Platô" }] },
    { title: "Oxigenação (P/F)", keys: [{ k: "pf", c: T.ok, n: "P/F" }] },
    { title: "Complacência estática", keys: [{ k: "cst", c: T.accent, n: "Cst" }] },
    { title: "Tobin (desmame)", keys: [{ k: "tobin", c: T.warn, n: "Tobin" }] },
  ];

  return (
    <Panel title="Evolução gráfica" sub="Tendência ao longo dos registros — recrutamento, rigidez e prontidão de desmame">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 16 }}>
        {charts.map((ch) => (
          <div key={ch.title}>
            <div style={{ fontSize: 12, color: T.dim, marginBottom: 8 }}>{ch.title}</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid stroke={T.line} strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke={T.dim} fontSize={11} />
                <YAxis stroke={T.dim} fontSize={11} />
                <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.txt }} />
                {ch.keys.map((kk) => (
                  <Line key={kk.k} type="monotone" dataKey={kk.k} name={kk.n} stroke={kk.c} strokeWidth={2} dot={{ r: 2 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </Panel>
  );
}
