import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { T, fmt } from "../../lib/theme";
import { Panel, Field, Btn, Alert } from "../ui";
import { invalidMeasurements } from "../../lib/measurement-limits";
import { Patient, Ventilator } from "../../types";
import * as C from "../../lib/clinical";
import { COMORBIDITIES } from "../../data/comorbidities";

// ---------- Header com troca de ventilador/modo ----------
export function PatientHeader({
  patient, vent, ventilators, onUpdate, rassAtual,
}: {
  patient: Patient;
  vent?: Ventilator;
  ventilators: Ventilator[];
  onUpdate: () => void;
  /** RASS da evolução mais recente. null quando não foi registrado. */
  rassAtual: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [ventId, setVentId] = useState(patient.ventilator_id ?? "");
  const [mode, setMode] = useState(patient.current_mode ?? "VCV");
  const [height, setHeight] = useState(patient.height_cm != null ? String(patient.height_cm) : "");
  const [weight, setWeight] = useState(patient.weight_kg != null ? String(patient.weight_kg) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const selVent = ventilators.find((v) => v.id === ventId);
  const modes = selVent?.modes ?? ["VCV", "PCV", "PSV", "SIMV", "CPAP"];

  const pbwVal = C.pbw((patient.sex ?? "M") as "M" | "F", patient.height_cm);
  const bmiVal = C.bmi(patient.weight_kg, patient.height_cm);

  // Rótulo de comorbidade vem do key salvo, nunca do texto: o texto pode
  // ser reescrito depois sem migrar dado nenhum.
  const rotuloComorbidade = new Map(COMORBIDITIES.map((c) => [c.key, c.label]));
  const diasVM = C.diasEmVentilacao(patient.intubation_date);
  const contexto = [
    ...(patient.comorbidities ?? []).map((k) => rotuloComorbidade.get(k) ?? k),
    patient.airway === "tot" ? "TOT" : patient.airway === "tqt" ? "TQT" : null,
    diasVM != null ? `${diasVM}º dia de VM` : null,
    // RASS zero é medida real ("alerta e calmo"), nunca ausência: a
    // comparação é != null, jamais uma checagem falsy.
    rassAtual != null ? `RASS ${rassAtual < 0 ? `−${Math.abs(rassAtual)}` : rassAtual}` : null,
  ].filter((c): c is string => Boolean(c));

  const save = async () => {
    const problemas = invalidMeasurements({ height_cm: height, weight_kg: weight });
    if (problemas.length > 0) {
      setError(problemas.map((p) => p.message).join(" "));
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from("patients").update({
      ventilator_id: ventId || null,
      current_mode: mode,
      height_cm: height.trim() ? Number(height) : null,
      weight_kg: weight.trim() ? Number(weight) : null,
      updated_at: new Date().toISOString(),
    }).eq("id", patient.id);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setError(null);
    setEditing(false);
    onUpdate();
  };

  return (
    <Panel title="Paciente" accent={T.accent}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{patient.name}</div>
          <div style={{ fontSize: 13, color: T.dim, marginTop: 2 }}>
            {patient.age ? `${patient.age}a · ` : ""}
            {patient.sex === "M" ? "Masculino" : patient.sex === "F" ? "Feminino" : "—"} ·{" "}
            {patient.diagnosis ?? "sem diagnóstico"}
          </div>
          {contexto.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {contexto.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: T.panel2,
                    border: `1px solid ${T.line}`,
                    color: T.dim,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>
            PBW <strong style={{ color: T.txt }}>{fmt(pbwVal)}</strong> kg · IMC{" "}
            <strong style={{ color: T.txt }}>{fmt(bmiVal)}</strong>
            {bmiVal && bmiVal >= 30 && (
              <span style={{ color: T.warn, marginLeft: 8 }}>obeso (alvo VC 6–8 ml/kg)</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {!editing ? (
            <>
              <div style={{ fontSize: 13, color: T.dim }}>
                {vent ? `${vent.brand} ${vent.model}` : "Ventilador não definido"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>
                {patient.current_mode ?? "—"}
              </div>
              <button
                onClick={() => setEditing(true)}
                style={{ marginTop: 6, background: "transparent", border: `1px solid ${T.line}`, color: T.dim, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Editar dados, ventilador e modo
              </button>
            </>
          ) : (
            <div style={{ display: "grid", gap: 8, minWidth: 240, textAlign: "left" }}>
              {/* Altura e peso só podiam ser informados na admissão, enquanto a
                  tela pedia para corrigi-los depois para refinar o PBW. */}
              <Field label="Altura" unit="cm" value={height} onChange={setHeight} />
              <Field label="Peso" unit="kg" value={weight} onChange={setWeight} />
              <Field label="Ventilador" value={ventId} onChange={setVentId}
                options={ventilators.map((v) => ({ v: v.id, t: `${v.brand} ${v.model}` }))} />
              <Field label="Modo" value={mode} onChange={setMode}
                options={modes.map((m) => ({ v: m, t: m }))} />
              {error && <Alert>{error}</Alert>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn variant="ghost" onClick={() => setEditing(false)}>Cancelar</Btn>
                <Btn onClick={save} disabled={saving}>Salvar</Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
