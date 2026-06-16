import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { T } from "../lib/theme";
import { Panel, Field, Btn, Row } from "../components/ui";
import { Patient, Ventilator } from "../types";
import { pbw, bmi } from "../lib/clinical";

export default function PatientList() {
  const { session } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pts }, { data: vents }] = await Promise.all([
      supabase.from("patients").select("*").eq("active", true).order("updated_at", { ascending: false }),
      supabase.from("ventilators").select("*").order("brand"),
    ]);
    setPatients((pts as Patient[]) ?? []);
    setVentilators((vents as Ventilator[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Pacientes</h1>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: T.dim }}>
            {patients.length} ativo(s) · isolados por usuário
          </p>
        </div>
        <Btn onClick={() => setCreating((v) => !v)}>{creating ? "Cancelar" : "+ Novo paciente"}</Btn>
      </div>

      {creating && (
        <NewPatientForm
          ventilators={ventilators}
          ownerId={session!.user.id}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p style={{ color: T.dim }}>Carregando…</p>
      ) : patients.length === 0 ? (
        <Panel title="Nenhum paciente">
          <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
            Cadastre o primeiro paciente para começar a registrar a evolução ventilatória.
          </p>
        </Panel>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 14 }}>
          {patients.map((p) => {
            const vent = ventilators.find((v) => v.id === p.ventilator_id);
            const pbwVal = pbw((p.sex ?? "M") as "M" | "F", p.height_cm);
            const bmiVal = bmi(p.weight_kg, p.height_cm);
            return (
              <Link key={p.id} to={`/paciente/${p.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.line}`,
                    borderRadius: 14,
                    padding: 16,
                    color: T.txt,
                    height: "100%",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: T.dim }}>
                        {p.age ? `${p.age}a · ` : ""}
                        {p.sex === "M" ? "Masc" : p.sex === "F" ? "Fem" : "—"}
                      </div>
                    </div>
                    {p.current_mode && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.accent,
                          background: `${T.accent}1A`,
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
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
      )}
    </div>
  );
}

function NewPatientForm({
  ventilators,
  ownerId,
  onCreated,
}: {
  ventilators: Ventilator[];
  ownerId: string;
  onCreated: () => void;
}) {
  const [f, setF] = useState({
    name: "",
    age: "",
    sex: "M",
    diagnosis: "",
    height_cm: "",
    weight_kg: "",
    ventilator_id: ventilators[0]?.id ?? "",
    current_mode: "VCV",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const vent = ventilators.find((v) => v.id === f.ventilator_id);
  const modes = vent?.modes ?? ["VCV", "PCV", "PSV", "SIMV", "CPAP"];

  const save = async () => {
    if (!f.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("patients").insert({
      owner_id: ownerId,
      name: f.name.trim(),
      age: f.age ? Number(f.age) : null,
      sex: f.sex,
      diagnosis: f.diagnosis || null,
      height_cm: f.height_cm ? Number(f.height_cm) : null,
      weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
      ventilator_id: f.ventilator_id || null,
      current_mode: f.current_mode,
    });
    setSaving(false);
    if (!error) onCreated();
    else alert("Erro ao salvar: " + error.message);
  };

  return (
    <Panel title="Novo paciente" accent={T.accent}>
      <div style={{ display: "grid", gap: 12 }}>
        <Row cols={2}>
          <Field label="Nome" value={f.name} onChange={set("name")} type="text" />
          <Field label="Idade" value={f.age} onChange={set("age")} unit="anos" />
        </Row>
        <Row cols={3}>
          <Field
            label="Sexo"
            value={f.sex}
            onChange={set("sex")}
            options={[{ v: "M", t: "Masculino" }, { v: "F", t: "Feminino" }]}
          />
          <Field label="Altura" value={f.height_cm} onChange={set("height_cm")} unit="cm" />
          <Field label="Peso real" value={f.weight_kg} onChange={set("weight_kg")} unit="kg" />
        </Row>
        <Field label="Diagnóstico" value={f.diagnosis} onChange={set("diagnosis")} type="text" />
        <Row cols={2}>
          <Field
            label="Ventilador"
            value={f.ventilator_id}
            onChange={set("ventilator_id")}
            options={ventilators.map((v) => ({ v: v.id, t: `${v.brand} ${v.model}` }))}
          />
          <Field
            label="Modo ventilatório"
            value={f.current_mode}
            onChange={set("current_mode")}
            options={modes.map((m) => ({ v: m, t: m }))}
          />
        </Row>
        <div>
          <Btn onClick={save} disabled={saving || !f.name.trim()}>
            {saving ? "Salvando…" : "Salvar paciente"}
          </Btn>
        </div>
      </div>
    </Panel>
  );
}
