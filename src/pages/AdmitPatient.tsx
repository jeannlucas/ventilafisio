import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useHospital } from "../lib/hospital";
import { T } from "../lib/theme";
import { Panel, Field, Btn, Row } from "../components/ui";
import { Ventilator } from "../types";

export default function AdmitPatient() {
  const { session } = useAuth();
  const { activeHospitalId, activeHospital, loading: hLoading } = useHospital();
  const navigate = useNavigate();
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [f, setF] = useState({
    name: "",
    age: "",
    sex: "M",
    diagnosis: "",
    height_cm: "",
    weight_kg: "",
    ventilator_id: "",
    current_mode: "VCV",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    supabase
      .from("ventilators")
      .select("*")
      .order("brand")
      .then(({ data }) => {
        const list = (data as Ventilator[]) ?? [];
        setVentilators(list);
        setF((s) => (s.ventilator_id ? s : { ...s, ventilator_id: list[0]?.id ?? "" }));
      });
  }, []);

  const vent = ventilators.find((v) => v.id === f.ventilator_id);
  const modes = vent?.modes ?? ["VCV", "PCV", "PSV", "SIMV", "CPAP"];

  const save = async () => {
    if (!f.name.trim() || !activeHospitalId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("patients")
      .insert({
        owner_id: session!.user.id,
        hospital_id: activeHospitalId,
        name: f.name.trim(),
        age: f.age ? Number(f.age) : null,
        sex: f.sex,
        diagnosis: f.diagnosis || null,
        height_cm: f.height_cm ? Number(f.height_cm) : null,
        weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
        ventilator_id: f.ventilator_id || null,
        current_mode: f.current_mode,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      alert("Erro ao salvar: " + (error?.message ?? "desconhecido"));
      return;
    }
    navigate(`/paciente/${(data as { id: string }).id}`);
  };

  if (!hLoading && !activeHospitalId) {
    return (
      <Panel title="Selecione um hospital">
        <p style={{ color: T.dim, fontSize: 14, margin: 0 }}>
          Crie ou selecione um hospital na barra acima para admitir um paciente.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Admitir paciente"
      accent={T.accent}
      sub={activeHospital ? `Será vinculado a ${activeHospital.name}` : undefined}
    >
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
            {saving ? "Salvando…" : "Admitir paciente"}
          </Btn>
        </div>
      </div>
    </Panel>
  );
}
