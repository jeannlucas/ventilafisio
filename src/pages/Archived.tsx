import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useHospital } from "../lib/hospital";
import { T } from "../lib/theme";
import { Panel } from "../components/ui";
import { Patient } from "../types";

type Filter = "all" | "death" | "extubation";

const REASON_LABEL: Record<string, string> = { death: "Óbito", extubation: "Extubação" };

export default function Archived() {
  const { activeHospitalId, activeHospital, loading: hLoading } = useHospital();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    if (!activeHospitalId) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("patients")
      .select("*")
      .eq("status", "archived")
      .eq("hospital_id", activeHospitalId)
      .order("discharge_date", { ascending: false });
    setPatients((data as Patient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeHospitalId]);

  if (!hLoading && !activeHospitalId) {
    return (
      <Panel title="Selecione um hospital">
        <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
          Crie ou selecione um hospital na barra acima para ver os arquivados.
        </p>
      </Panel>
    );
  }

  const counts = {
    death: patients.filter((p) => p.discharge_reason === "death").length,
    extubation: patients.filter((p) => p.discharge_reason === "extubation").length,
  };
  const shown = filter === "all" ? patients : patients.filter((p) => p.discharge_reason === filter);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: `Todos (${patients.length})` },
    { key: "death", label: `Óbito (${counts.death})` },
    { key: "extubation", label: `Extubação (${counts.extubation})` },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Arquivados</h1>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim }}>
          Pacientes com alta{activeHospital ? ` · ${activeHospital.name}` : ""} · histórico preservado
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              background: filter === t.key ? T.accent : "transparent",
              color: filter === t.key ? "#06121C" : T.dim,
              border: `1px solid ${filter === t.key ? T.accent : T.line}`,
              borderRadius: 999,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: T.dim }}>Carregando…</p>
      ) : shown.length === 0 ? (
        <Panel title="Nenhum paciente arquivado">
          <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
            Pacientes que receberem alta (óbito ou extubação) aparecem aqui.
          </p>
        </Panel>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
          {shown.map((p) => (
            <Link key={p.id} to={`/paciente/${p.id}`} style={{ textDecoration: "none" }}>
              <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, color: T.txt, height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.warn, background: `${T.warn}1A`, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {REASON_LABEL[p.discharge_reason ?? ""] ?? "Arquivado"}
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: T.dim, lineHeight: 1.6 }}>
                  {p.diagnosis ?? "Sem diagnóstico"}
                  <br />
                  Alta em {p.discharge_date ? new Date(p.discharge_date).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
