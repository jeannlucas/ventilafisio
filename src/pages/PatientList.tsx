import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useHospital } from "../lib/hospital";
import { T } from "../lib/theme";
import { Panel } from "../components/ui";
import { Patient, Ventilator } from "../types";
import { pbw, bmi } from "../lib/clinical";

export default function PatientList() {
  const { session } = useAuth();
  const { activeHospitalId, activeHospital, loading: hLoading } = useHospital();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [shared, setShared] = useState<Patient[]>([]);
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    // Pacientes do hospital ativo (se houver).
    const hospitalQ = activeHospitalId
      ? supabase.from("patients").select("*").eq("status", "active").eq("hospital_id", activeHospitalId).order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] as Patient[] });

    const [{ data: pts }, { data: vents }, { data: acc }] = await Promise.all([
      hospitalQ,
      supabase.from("ventilators").select("*").order("brand"),
      // Pacientes compartilhados comigo (acesso direto), independente do hospital.
      supabase.from("patient_access").select("patient_id").eq("user_id", session!.user.id),
    ]);

    const hospitalPatients = (pts as Patient[]) ?? [];
    setPatients(hospitalPatients);
    setVentilators((vents as Ventilator[]) ?? []);

    const ids = ((acc as { patient_id: string }[]) ?? []).map((a) => a.patient_id);
    if (ids.length) {
      const { data: sp } = await supabase.from("patients").select("*").in("id", ids).eq("status", "active");
      const hospitalIds = new Set(hospitalPatients.map((p) => p.id));
      setShared(((sp as Patient[]) ?? []).filter((p) => !hospitalIds.has(p.id)));
    } else {
      setShared([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [activeHospitalId, session]);

  if (!hLoading && !activeHospitalId && shared.length === 0 && !loading) {
    return (
      <Panel title="Selecione um hospital">
        <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
          Crie ou selecione um hospital na barra acima para ver os pacientes, ou aceite um paciente compartilhado por link.
        </p>
      </Panel>
    );
  }

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Pacientes</h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim }}>
              {patients.length} ativo(s){activeHospital ? ` · ${activeHospital.name}` : ""}
            </p>
          </div>
          <Link to="/admitir" style={{ textDecoration: "none" }}>
            <span style={{ background: T.accent, color: "#06121C", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700 }}>
              + Admitir paciente
            </span>
          </Link>
        </div>

        {loading ? (
          <p style={{ color: T.dim }}>Carregando…</p>
        ) : patients.length === 0 ? (
          <Panel title="Nenhum paciente">
            <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
              {activeHospitalId
                ? "Cadastre o primeiro paciente para começar a registrar a evolução ventilatória."
                : "Selecione um hospital para ver e admitir pacientes."}
            </p>
          </Panel>
        ) : (
          <PatientGrid patients={patients} ventilators={ventilators} />
        )}
      </div>

      {shared.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Compartilhados comigo</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim }}>
              Pacientes que aceitei por link (passagem de plantão)
            </p>
          </div>
          <PatientGrid patients={shared} ventilators={ventilators} />
        </div>
      )}
    </div>
  );
}

function PatientGrid({ patients, ventilators }: { patients: Patient[]; ventilators: Ventilator[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
      {patients.map((p) => {
        const vent = ventilators.find((v) => v.id === p.ventilator_id);
        const pbwVal = pbw((p.sex ?? "M") as "M" | "F", p.height_cm);
        const bmiVal = bmi(p.weight_kg, p.height_cm);
        return (
          <Link key={p.id} to={`/paciente/${p.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, padding: 16, color: T.txt, height: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: T.dim }}>
                    {p.age ? `${p.age}a · ` : ""}
                    {p.sex === "M" ? "Masc" : p.sex === "F" ? "Fem" : "—"}
                  </div>
                </div>
                {p.current_mode && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, background: `${T.accent}1A`, padding: "3px 9px", borderRadius: 999 }}>
                    {p.current_mode}
                  </span>
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: T.dim, lineHeight: 1.6 }}>
                {p.diagnosis ?? "Sem diagnóstico"}
                <br />
                PBW {pbwVal ? pbwVal.toFixed(0) : "—"} kg · IMC {bmiVal ? bmiVal.toFixed(0) : "—"}
                <br />
                {vent ? `${vent.brand} ${vent.model}` : "Ventilador não definido"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
