import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { T, fmt } from "../lib/theme";
import { Panel, Field, Btn, Grid, Row, FormSection, Tabs, ChipGroup, ChipToggle, Alert, SugBox } from "../components/ui";
import { invalidMeasurements, inconsistentMeasurements } from "../lib/measurement-limits";
import VentilatorGuide from "../components/VentilatorGuide";
import { PatientHeader } from "../components/patient/PatientHeader";
import { Dashboard } from "../components/patient/Dashboard";
import { ScoresPanel } from "../components/patient/ScoresPanel";
import type { Mrc } from "../lib/scores";
import { Patient, Ventilator, DailyEvolution, Asynchrony, ImagingData, IvMeds, IvMedKey, Feeding } from "../types";
import { IMAGING_FINDINGS, IV_MED_CATEGORIES, FEEDING_TUBES, DIET_TYPES } from "../data/clinical-board";
import * as C from "../lib/clinical";
import { ASYNCHRONIES, ASYNC_BY_KEY } from "../data/asynchronies";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [evolutions, setEvolutions] = useState<DailyEvolution[]>([]);
  const [asyncs, setAsyncs] = useState<Asynchrony[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("admissao");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    const [{ data: p, error: patientError }, { data: v }, { data: ev }, { data: asy }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("ventilators").select("*").order("brand"),
      supabase.from("daily_evolutions").select("*").eq("patient_id", id).order("recorded_at", { ascending: true }),
      supabase.from("asynchronies").select("*").eq("patient_id", id).order("recorded_at", { ascending: false }),
    ]);
    // Sem este ramo, paciente inacessível deixava patient em null e a tela
    // ficava em "Carregando…" para sempre.
    if (patientError || !p) {
      setPatient(null);
      setLoadError(
        patientError?.message ??
          "Ele pode ter sido removido, ou você pode não ter acesso a ele."
      );
      setLoading(false);
      return;
    }
    setPatient(p as Patient);
    setVentilators((v as Ventilator[]) ?? []);
    setEvolutions((ev as DailyEvolution[]) ?? []);
    setAsyncs((asy as Asynchrony[]) ?? []);
    // Nomes dos autores das evoluções (RPC escopado por acesso).
    const { data: au } = await supabase.rpc("evolution_authors", { p: id });
    const map: Record<string, string> = {};
    for (const r of (au as { owner_id: string; full_name: string | null }[]) ?? []) {
      if (r.full_name) map[r.owner_id] = r.full_name;
    }
    setAuthors(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <p style={{ color: T.dim }}>Carregando…</p>;
  if (!patient) {
    return (
      <Alert>
        Não foi possível abrir este paciente. {loadError}
      </Alert>
    );
  }

  const vent = ventilators.find((v) => v.id === patient.ventilator_id);
  const last = evolutions[evolutions.length - 1];

  const tabs = [
    { key: "admissao", label: "Admissão" },
    { key: "evolucao", label: "Evolução" },
    { key: "graficos", label: "Gráficos" },
    { key: "desmame", label: "Desmame" },
  ];

  const hint = (msg: string) => <p style={{ color: T.dim, fontSize: 14 }}>{msg}</p>;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PatientHeader patient={patient} vent={vent} ventilators={ventilators} onUpdate={load} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap-reverse", alignItems: "center" }}>
        <ShareControl patient={patient} ownerId={session!.user.id} />
        <ArchiveControl patient={patient} onUpdate={load} />
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "admissao" && (
        <div style={{ display: "grid", gap: 20 }}>
          <AdmissionCard patient={patient} />
          {vent && <VentilatorGuide vent={vent} mode={patient.current_mode} />}
        </div>
      )}

      {tab === "evolucao" && (
        <div style={{ display: "grid", gap: 20 }}>
          {last ? <Dashboard patient={patient} ev={last} /> : hint("Registre a primeira evolução para ver os 4 indicadores.")}
          <Grid min={340}>
            <EvolutionForm patient={patient} ownerId={session!.user.id} previous={last} onSaved={load} />
            <AsynchronyModule patientId={patient.id} ownerId={session!.user.id} asyncs={asyncs} onChange={load} />
          </Grid>
          <EvolutionHistory evolutions={evolutions} authors={authors} />
        </div>
      )}

      {tab === "graficos" && (
        evolutions.length >= 2
          ? <TrendCharts patient={patient} evolutions={evolutions} />
          : hint("São necessárias ao menos 2 evoluções para gerar as tendências.")
      )}

      {tab === "desmame" && (
        last
          ? <ExtubationCard ev={last} />
          : hint("Registre uma evolução para avaliar a prontidão para extubação.")
      )}
    </div>
  );
}

// ---------- Compartilhar paciente por link (passagem de plantão) ----------
function ShareControl({ patient, ownerId }: { patient: Patient; ownerId: string }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = async () => {
    setBusy(true);
    setError(null);
    // Token gerado no cliente: sem .select() no insert (evita esbarrar no SELECT de RLS).
    const token = crypto.randomUUID();
    const { error: shareError } = await supabase.from("patient_shares").insert({
      patient_id: patient.id,
      token,
      created_by: ownerId,
    });
    setBusy(false);
    if (shareError) {
      setError(shareError.message);
      return;
    }
    setMessage(`Link gerado. Ele vale por 7 dias e pode ser revogado a qualquer momento.`);
    const link = `${window.location.origin}/compartilhar/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copie o link de compartilhamento:", link);
    }
  };

  // Antes não havia revogação: nem policy de DELETE, nem botão. Concedido o
  // acesso a um paciente, ele nunca mais saía.
  const revoke = async () => {
    setBusy(true);
    setError(null);
    const { error: sharesError } = await supabase
      .from("patient_shares")
      .delete()
      .eq("patient_id", patient.id);
    const { error: accessError } = await supabase
      .from("patient_access")
      .delete()
      .eq("patient_id", patient.id);
    setBusy(false);
    setConfirmingRevoke(false);
    const falha = sharesError ?? accessError;
    if (falha) {
      setError(falha.message);
      return;
    }
    setMessage("Links pendentes cancelados e acessos compartilhados removidos.");
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Btn variant="ghost" onClick={share} disabled={busy}>
          {copied ? "Link copiado ✓" : busy ? "Gerando…" : "Compartilhar / Passar plantão"}
        </Btn>
        {!confirmingRevoke ? (
          <Btn variant="ghost" onClick={() => setConfirmingRevoke(true)} disabled={busy}>
            Revogar acessos
          </Btn>
        ) : (
          <>
            <Btn variant="danger" onClick={revoke} disabled={busy}>
              Confirmar revogação
            </Btn>
            <Btn variant="ghost" onClick={() => setConfirmingRevoke(false)} disabled={busy}>
              Cancelar
            </Btn>
          </>
        )}
      </div>
      {confirmingRevoke && (
        <span style={{ fontSize: 12, color: T.dim }}>
          Cancela os links pendentes e tira o paciente de quem já aceitou. Membros
          do hospital continuam vendo.
        </span>
      )}
      {error && <Alert>{error}</Alert>}
      {!error && message && <span style={{ fontSize: 12, color: T.ok }}>{message}</span>}
    </div>
  );
}

// ---------- Alta / arquivamento do paciente ----------
function ArchiveControl({ patient, onUpdate }: { patient: Patient; onUpdate: () => void }) {
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archived = patient.status === "archived";

  const archive = async (reason: "death" | "extubation") => {
    setBusy(true);
    const { error: archiveError } = await supabase.from("patients").update({
      status: "archived",
      discharge_reason: reason,
      discharge_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", patient.id);
    setBusy(false);
    if (archiveError) {
      setError(archiveError.message);
      return;
    }
    setError(null);
    setChoosing(false);
    onUpdate();
  };

  const reactivate = async () => {
    setBusy(true);
    const { error: reactivateError } = await supabase.from("patients").update({
      status: "active",
      discharge_reason: null,
      discharge_date: null,
      updated_at: new Date().toISOString(),
    }).eq("id", patient.id);
    setBusy(false);
    if (reactivateError) {
      setError(reactivateError.message);
      return;
    }
    setError(null);
    onUpdate();
  };

  if (archived) {
    const label = patient.discharge_reason === "death" ? "Óbito" : "Extubação";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, background: `${T.warn}14`, border: `1px solid ${T.warn}40`, borderRadius: 12, padding: "10px 16px" }}>
        <span style={{ fontSize: 13, color: T.warn, fontWeight: 600 }}>
          Paciente arquivado · {label}
          {patient.discharge_date ? ` · ${new Date(patient.discharge_date).toLocaleDateString("pt-BR")}` : ""}
          <span style={{ color: T.dim, fontWeight: 400 }}> · histórico em modo leitura</span>
        </span>
        <Btn variant="ghost" onClick={reactivate} disabled={busy}>Reativar</Btn>
        {error && <Alert>{error}</Alert>}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        {!choosing ? (
          <Btn variant="ghost" onClick={() => setChoosing(true)}>Dar alta / Arquivar</Btn>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: T.dim }}>Motivo da alta:</span>
            <Btn variant="ghost" onClick={() => archive("extubation")} disabled={busy}>Extubação</Btn>
            <Btn variant="danger" onClick={() => archive("death")} disabled={busy}>Óbito</Btn>
            <Btn variant="ghost" onClick={() => setChoosing(false)} disabled={busy}>Cancelar</Btn>
          </div>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
// ---------- Sugestão de admissão (sem evolução / dados incompletos) ----------
function AdmissionCard({ patient }: { patient: Patient }) {
  const sug = C.admissionSuggestion(
    (patient.sex ?? "M") as "M" | "F",
    patient.height_cm,
    patient.weight_kg,
    null, // sem gasometria na admissão
    null,
    patient.current_mode
  );
  const { vc, peepFio2, ventilation } = sug;

  return (
    <Panel
      title={`Sugestão de admissão · ${sug.mode}`}
      accent={T.accent}
      sub="Ponto de partida para colocar o paciente na ventilação — complete os dados depois para refinar"
    >
      {(sug.pbwEstimated || sug.obeseUnknown || peepFio2.admission) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {sug.pbwEstimated && (
            <Badge text={`PBW estimado (altura média) — informe a altura para precisão`} />
          )}
          {peepFio2.admission && (
            <Badge text="FiO₂/PEEP de admissão — titular pela gasometria/SpO₂" />
          )}
          {sug.obeseUnknown && (
            <Badge text="Sem IMC — assumindo faixa protetora; confirme peso/altura" />
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {vc && (
          <SugBox
            label="VOLUME CORRENTE"
            big={`${vc.target} mL`}
            sub={`faixa ${vc.low}–${vc.high} mL · PBW ${sug.pbw.toFixed(0)} kg`}
          />
        )}
        <SugBox label="PEEP / FiO₂" big={`${peepFio2.peep} cmH₂O`} sub={`FiO₂ ${peepFio2.fio2}%`} />
        {ventilation && <SugBox label="FREQUÊNCIA" big={`${ventilation.fr} /min`} sub="derivada do VC alvo" />}
        {ventilation && <SugBox label="VOLUME-MINUTO" big={`${fmt(ventilation.veL)} L/min`} sub="~100 ml/kg PBW/min" />}
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 11, color: T.dim }}>
        Assim que registrar a primeira evolução (gasometria, pressões), os 4 indicadores e a
        predição de extubação aparecem aqui. A Pressão de Platô continua sendo o limite de segurança.
      </p>
    </Panel>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        color: T.warn,
        background: `${T.warn}14`,
        border: `1px solid ${T.warn}40`,
        borderRadius: 8,
        padding: "5px 10px",
      }}
    >
      {text}
    </span>
  );
}

// ---------- Formulário de evolução diária ----------
const EV_FIELDS: { k: keyof DailyEvolution; label: string; unit?: string }[] = [
  { k: "fr", label: "FR", unit: "/min" }, { k: "vc", label: "VC", unit: "mL" },
  { k: "peep", label: "PEEP", unit: "cmH₂O" }, { k: "fio2", label: "FiO₂", unit: "%" },
  { k: "ppico", label: "P. pico", unit: "cmH₂O" }, { k: "pplat", label: "P. platô", unit: "cmH₂O" },
  { k: "flow", label: "Fluxo", unit: "L/min" }, { k: "ph", label: "pH" },
  { k: "pao2", label: "PaO₂", unit: "mmHg" }, { k: "paco2", label: "PaCO₂", unit: "mmHg" },
  { k: "spo2", label: "SpO₂", unit: "%" }, { k: "pimax", label: "PImax", unit: "cmH₂O" },
  { k: "peak_cough_flow", label: "Pico tosse", unit: "L/min" }, { k: "glasgow", label: "Glasgow" },
  { k: "hr", label: "FC", unit: "bpm" }, { k: "sbp", label: "PAS", unit: "mmHg" },
  { k: "dbp", label: "PAD", unit: "mmHg" }, { k: "lactate", label: "Lactato", unit: "mmol/L" },
];

const FIELD_BY_KEY = Object.fromEntries(
  EV_FIELDS.map((f) => [f.k as string, f])
) as Record<string, (typeof EV_FIELDS)[number]>;

// Agrupamento visual por seção (não altera os campos salvos no banco).
const EV_SECTIONS: { title: string; color: string; keys: string[]; extra?: "tre" | "vaso" }[] = [
  { title: "Parâmetros do ventilador", color: T.accent, keys: ["fr", "vc", "peep", "fio2", "ppico", "pplat", "flow"] },
  { title: "Gasometria", color: T.ok, keys: ["ph", "pao2", "paco2", "spo2"] },
  { title: "Desmame", color: T.purple, keys: ["pimax", "peak_cough_flow", "glasgow"], extra: "tre" },
  { title: "Hemodinâmica", color: T.warn, keys: ["hr", "sbp", "dbp", "lactate"] },
];

function EvolutionForm({ patient, ownerId, previous, onSaved }: { patient: Patient; ownerId: string; previous?: DailyEvolution; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [tre, setTre] = useState("");
  const [notes, setNotes] = useState("");
  // Carry-forward: herda o quadro clínico da última evolução (não os números do dia).
  const [imaging, setImaging] = useState<ImagingData>(previous?.imaging ?? {});
  const [meds, setMeds] = useState<IvMeds>(previous?.iv_meds ?? {});
  const [feeding, setFeeding] = useState<Feeding>(previous?.feeding ?? {});
  const [mrc, setMrc] = useState<Mrc>({});
  const [rass, setRass] = useState("");
  const [ims, setIms] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (k: string) => (v: string) => setVals((s) => ({ ...s, [k]: v }));

  const toggleFinding = (modality: "xray" | "ct" | "mri", key: string) =>
    setImaging((s) => {
      const cur = s[modality] ?? [];
      const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
      return { ...s, [modality]: next };
    });
  const toggleMed = (key: IvMedKey) =>
    setMeds((s) => ({ ...s, [key]: { on: !s[key]?.on, note: s[key]?.note } }));
  const setMedNote = (key: IvMedKey) => (v: string) =>
    setMeds((s) => ({ ...s, [key]: { on: s[key]?.on ?? false, note: v } }));

  const clearBoard = () => {
    setImaging({});
    setMeds({});
    setFeeding({});
    setNotes("");
  };

  const save = async () => {
    // Medida impossível não pode entrar no banco: era daqui que saíam a P/F
    // infinita, o IMC infinito e a driving pressure negativa.
    const problemas = [
      ...invalidMeasurements(vals),
      ...inconsistentMeasurements(vals),
    ];
    if (problemas.length > 0) {
      setErrors(problemas.map((p) => p.message));
      return;
    }
    setErrors([]);
    setSaving(true);
    const payload: Record<string, unknown> = {
      patient_id: patient.id,
      owner_id: ownerId,
      mode: patient.current_mode,
      tre_result: tre || null,
      // null quando o chip nunca foi tocado: "não avaliado" não pode virar
      // "sem vasopressor", que a triagem de extubação conta como critério atendido.
      vasopressor: meds.vasopressor?.on ?? null,
      notes: notes || null,
      imaging,
      iv_meds: meds,
      feeding,
      mrc,
      // RASS 0 (alerta e calmo) e IMS 0 (nada, deitado) são valores clínicos
      // legítimos: a comparação é com string vazia, nunca `Number(v) || null`,
      // que transformaria uma medida real em "não avaliado".
      rass: rass === "" ? null : Number(rass),
      ims: ims === "" ? null : Number(ims),
    };
    for (const f of EV_FIELDS) {
      const raw = vals[f.k as string];
      payload[f.k as string] = raw ? Number(raw) : null;
    }
    const { error } = await supabase.from("daily_evolutions").insert(payload);
    setSaving(false);
    if (error) {
      setErrors([error.message]);
      return;
    }
    setVals({});
    setTre("");
    onSaved();
  };

  const modalities: { key: "xray" | "ct" | "mri"; label: string }[] = [
    { key: "xray", label: "Raio-X" },
    { key: "ct", label: "Tomografia" },
    { key: "mri", label: "Ressonância" },
  ];

  return (
    <Panel title="Nova evolução" sub="Registra o estado atual e alimenta as tendências">
      <div style={{ display: "grid", gap: 12 }}>
        {EV_SECTIONS.map((sec) => (
          <Fragment key={sec.title}>
            <FormSection title={sec.title} color={sec.color}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {sec.keys.map((k) => {
                  const f = FIELD_BY_KEY[k];
                  return (
                    <Field key={k} label={f.label} unit={f.unit} value={vals[k] ?? ""} onChange={set(k)} />
                  );
                })}
                {sec.extra === "tre" && (
                  <Field label="TRE" value={tre} onChange={setTre}
                    options={[{ v: "", t: "—" }, { v: "pass", t: "Aprovado" }, { v: "fail", t: "Falhou" }]} />
                )}
              </div>
            </FormSection>
            {sec.title === "Desmame" && (
              <ScoresPanel mrc={mrc} onMrc={setMrc} rass={rass} onRass={setRass} ims={ims} onIms={setIms} />
            )}
          </Fragment>
        ))}

        <FormSection title="Evolução clínica" color={T.accent}>
          <Field label="Impressão geral do quadro" value={notes} onChange={setNotes} multiline placeholder="Evolução escrita, análise geral do quadro…" />
        </FormSection>

        <FormSection title="Exames de imagem" color={T.purple}>
          <div style={{ display: "grid", gap: 10 }}>
            {modalities.map((m) => (
              <div key={m.key}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 6 }}>{m.label}</div>
                <ChipGroup
                  options={IMAGING_FINDINGS.filter((f) => f.modality === m.key).map((f) => ({ v: f.key, t: f.label }))}
                  selected={imaging[m.key] ?? []}
                  onToggle={(v) => toggleFinding(m.key, v)}
                />
              </div>
            ))}
            <Field label="Observação (opcional)" value={imaging.note ?? ""} onChange={(v) => setImaging((s) => ({ ...s, note: v }))} multiline placeholder="Detalhe do laudo, se necessário" />
          </div>
        </FormSection>

        <FormSection title="Medicamentos venosos" color={T.warn}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {IV_MED_CATEGORIES.map((m) => (
                <ChipToggle key={m.key} label={m.label} on={!!meds[m.key]?.on} onClick={() => toggleMed(m.key)} />
              ))}
            </div>
            {IV_MED_CATEGORIES.filter((m) => meds[m.key]?.on).map((m) => (
              <Field key={m.key} label={`${m.label} (obs)`} value={meds[m.key]?.note ?? ""} onChange={setMedNote(m.key)} type="text" placeholder="droga / dose (opcional)" />
            ))}
            <Field label="Outros" value={meds.other ?? ""} onChange={(v) => setMeds((s) => ({ ...s, other: v }))} type="text" placeholder="outras drogas venosas" />
          </div>
        </FormSection>

        <FormSection title="Sonda e dieta" color={T.ok}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <Field label="Sonda" value={feeding.tube ?? "none"} onChange={(v) => setFeeding((s) => ({ ...s, tube: v as Feeding["tube"] }))} options={FEEDING_TUBES} />
            <Field label="Dieta" value={feeding.diet ?? "fasting"} onChange={(v) => setFeeding((s) => ({ ...s, diet: v as Feeding["diet"] }))} options={DIET_TYPES} />
          </div>
        </FormSection>
      </div>
      {errors.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <Alert>
            <div style={{ display: "grid", gap: 4 }}>
              {errors.map((e) => <span key={e}>{e}</span>)}
            </div>
          </Alert>
        </div>
      )}
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <Btn onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar evolução"}</Btn>
        <button type="button" onClick={clearBoard} style={{ background: "transparent", border: "none", color: T.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
          Limpar quadro / começar do zero
        </button>
      </div>
    </Panel>
  );
}

// ---------- Histórico de evoluções (autor + data, passagem de plantão) ----------

const IMAGING_LABEL: Record<string, string> = Object.fromEntries(
  IMAGING_FINDINGS.map((f) => [f.key, f.label])
);
const TUBE_LABEL: Record<string, string> = Object.fromEntries(FEEDING_TUBES.map((o) => [o.v, o.t]));
const DIET_LABEL: Record<string, string> = Object.fromEntries(DIET_TYPES.map((o) => [o.v, o.t]));

function boardSummary(e: DailyEvolution) {
  const findings = [
    ...(e.imaging?.xray ?? []),
    ...(e.imaging?.ct ?? []),
    ...(e.imaging?.mri ?? []),
  ].map((k) => IMAGING_LABEL[k] ?? k);
  const medsOn = IV_MED_CATEGORIES.filter(
    (m) => e.iv_meds?.[m.key]?.on
  ).map((m) => m.label);
  const tube = e.feeding?.tube && e.feeding.tube !== "none" ? TUBE_LABEL[e.feeding.tube] : null;
  const diet = e.feeding?.diet ? DIET_LABEL[e.feeding.diet] : null;
  const hasContent = !!e.notes || findings.length > 0 || medsOn.length > 0 || !!tube || !!diet;
  return { findings, medsOn, tube, diet, hasContent };
}

function EvolutionHistory({ evolutions, authors }: { evolutions: DailyEvolution[]; authors: Record<string, string> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (evolutions.length === 0) return null;
  const ordered = [...evolutions].reverse();
  return (
    <Panel title="Histórico de evoluções" sub="Quem registrou e quando (toque para ver o quadro clínico do dia)">
      <div style={{ display: "grid", gap: 8 }}>
        {ordered.map((e) => {
          const b = boardSummary(e);
          const open = openId === e.id;
          return (
            <div key={e.id} style={{ borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
              <div
                onClick={() => b.hasContent && setOpenId(open ? null : e.id)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", cursor: b.hasContent ? "pointer" : "default" }}
              >
                <div style={{ fontSize: 13, color: T.txt }}>
                  {b.hasContent ? <span style={{ color: T.dim }}>{open ? "▾ " : "▸ "}</span> : null}
                  {new Date(e.recorded_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                  {e.mode ? <span style={{ color: T.dim }}> · {e.mode}</span> : null}
                </div>
                <div style={{ fontSize: 12, color: T.dim }}>{authors[e.owner_id] ?? "Profissional"}</div>
              </div>
              {open && b.hasContent && (
                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 13, color: T.txt, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 12 }}>
                  {e.notes && <div><span style={{ color: T.dim }}>Impressão: </span>{e.notes}</div>}
                  {b.findings.length > 0 && <div><span style={{ color: T.dim }}>Imagem: </span>{b.findings.join(", ")}</div>}
                  {b.medsOn.length > 0 && <div><span style={{ color: T.dim }}>Medicamentos: </span>{b.medsOn.join(", ")}</div>}
                  {(b.tube || b.diet) && <div><span style={{ color: T.dim }}>Sonda/dieta: </span>{[b.tube, b.diet].filter(Boolean).join(" · ")}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------- Predição de extubação ----------
function ExtubationCard({ ev }: { ev?: DailyEvolution }) {
  if (!ev) return null;
  const tobinVal = C.tobin(ev.fr, ev.vc);
  const r = C.extubationReadiness({
    fio2: ev.fio2, peep: ev.peep, tobinVal, pimaxVal: ev.pimax,
    glasgow: ev.glasgow, vasopressor: ev.vasopressor, treResult: ev.tre_result,
    peakCoughFlow: ev.peak_cough_flow,
  });
  const veredito = {
    favorable: { c: T.ok, t: "Critérios favoráveis para extubação" },
    borderline: { c: T.warn, t: "Critérios parciais, reavaliar" },
    unfavorable: { c: T.danger, t: "Critérios desfavoráveis" },
    insufficient: { c: T.dim, t: "Dados insuficientes para triagem" },
  }[r.level];

  return (
    <Panel title="Prontidão para extubação" accent={veredito.c}
      sub="Triagem objetiva a partir da última evolução, não é indicação de extubar">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: veredito.c }}>
          {r.level === "favorable" ? "✓" : r.level === "insufficient" ? "ℹ" : "⚠"} {veredito.t}
        </span>
        <span style={{ fontSize: 13, color: T.dim, marginLeft: "auto" }}>
          {r.score}/{r.max} critérios atendidos
        </span>
      </div>
      {r.level === "insufficient" && (
        <p style={{ margin: "0 0 12px", fontSize: 12, color: T.dim }}>
          Registre ao menos {C.MIN_CRITERIOS_AVALIADOS} critérios objetivos na evolução para o
          app conseguir triar. O que está abaixo é o que já foi medido.
        </p>
      )}
      <div style={{ display: "grid", gap: 6 }}>
        {r.met.map((m) => (
          <div key={m} style={{ fontSize: 13, color: T.ok }}>✓ {m}</div>
        ))}
        {r.failed.map((m) => (
          <div key={m} style={{ fontSize: 13, color: T.danger }}>✗ {m}</div>
        ))}
        {r.notMeasured.map((m) => (
          <div key={m} style={{ fontSize: 13, color: T.dim }}>○ {m} <span style={{ fontSize: 11 }}>(não medido)</span></div>
        ))}
      </div>
    </Panel>
  );
}

// ---------- Gráficos de tendência ----------
function TrendCharts({ patient, evolutions }: { patient: Patient; evolutions: DailyEvolution[] }) {
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

// ---------- Módulo de assincronias ----------
function AsynchronyModule({ patientId, ownerId, asyncs, onChange }: {
  patientId: string; ownerId: string; asyncs: Asynchrony[]; onChange: () => void;
}) {
  const [selected, setSelected] = useState(ASYNCHRONIES[0].key);
  const [severity, setSeverity] = useState("moderate");
  const def = ASYNC_BY_KEY[selected];

  const add = async () => {
    await supabase.from("asynchronies").insert({
      patient_id: patientId, owner_id: ownerId, type: selected, severity,
    });
    onChange();
  };
  const remove = async (id: string) => {
    await supabase.from("asynchronies").delete().eq("id", id);
    onChange();
  };

  return (
    <Panel title="Assincronias" sub="Registre o que observou; o app sugere o ajuste por protocolo">
      <Row cols={2}>
        <Field label="Tipo observado" value={selected} onChange={setSelected}
          options={ASYNCHRONIES.map((a) => ({ v: a.key, t: a.label }))} />
        <Field label="Gravidade" value={severity} onChange={setSeverity}
          options={[{ v: "mild", t: "Leve" }, { v: "moderate", t: "Moderada" }, { v: "severe", t: "Grave" }]} />
      </Row>

      <div style={{ marginTop: 12, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, color: T.txt, marginBottom: 6 }}>{def.description}</div>
        <div style={{ fontSize: 12, color: T.dim, marginBottom: 4 }}>Ajustes sugeridos:</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.txt, lineHeight: 1.7 }}>
          {def.adjustments.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 12 }}>
        <Btn onClick={add}>Registrar assincronia</Btn>
      </div>

      {asyncs.length > 0 && (
        <div style={{ marginTop: 14, display: "grid", gap: 6 }}>
          {asyncs.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.dim, borderTop: `1px solid ${T.line}`, paddingTop: 6 }}>
              <span>
                {ASYNC_BY_KEY[a.type]?.label ?? a.type}
                {a.severity ? ` · ${a.severity}` : ""} ·{" "}
                {new Date(a.recorded_at).toLocaleDateString("pt-BR")}
              </span>
              <button onClick={() => remove(a.id)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", fontSize: 12 }}>remover</button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
