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
import { LinhaModulacao } from "../components/patient/LinhaModulacao";
import { ScoresPanel } from "../components/patient/ScoresPanel";
import { CareBundlePanel } from "../components/patient/CareBundlePanel";
import { EvolutionHistory } from "../components/patient/EvolutionHistory";
import { TrendCharts } from "../components/patient/TrendCharts";
import { MotorPanel } from "../components/patient/MotorPanel";
import { TrePanel } from "../components/patient/TrePanel";
import { SourceFooter } from "../components/SourceFooter";
import type { Mrc } from "../lib/scores";
import { Patient, Ventilator, DailyEvolution, Asynchrony, CareAction, ImagingData, IvMeds, IvMedKey, Feeding, TreSession } from "../types";
import { resultadoTreParaTriagem, pendenciasParaIniciar } from "../lib/tre";
import { IMAGING_FINDINGS, IV_MED_CATEGORIES, FEEDING_TUBES, DIET_TYPES } from "../data/clinical-board";
import * as C from "../lib/clinical";
import { sugestaoAdmissao } from "../lib/alvos";
import { derivarPerfil } from "../lib/perfil";
import { ASYNCHRONIES, ASYNC_BY_KEY } from "../data/asynchronies";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [ventilators, setVentilators] = useState<Ventilator[]>([]);
  const [evolutions, setEvolutions] = useState<DailyEvolution[]>([]);
  const [asyncs, setAsyncs] = useState<Asynchrony[]>([]);
  const [careActions, setCareActions] = useState<CareAction[]>([]);
  // null = a busca por sessões de TRE falhou. Ver o comentário em `load()`.
  const [treSessions, setTreSessions] = useState<TreSession[] | null>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("admissao");
  // A aba padrão depende do estado do paciente, mas as evoluções chegam
  // assíncronas: a escolha acontece ao fim da carga, não na inicialização.
  // Este sinalizador impede que a carga troque a aba de quem já navegou —
  // comparar com "admissao" não serviria, porque o usuário pode ter clicado
  // nela de propósito.
  const [abaEscolhidaPeloUsuario, setAbaEscolhidaPeloUsuario] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    const [{ data: p, error: patientError }, { data: v }, { data: ev }, { data: asy }, { data: ca }, { data: tre, error: treError }] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("ventilators").select("*").order("brand"),
      supabase.from("daily_evolutions").select("*").eq("patient_id", id).order("recorded_at", { ascending: true }),
      supabase.from("asynchronies").select("*").eq("patient_id", id).order("recorded_at", { ascending: false }),
      supabase.from("care_actions").select("*").eq("patient_id", id).order("at", { ascending: false }),
      supabase.from("tre_sessions").select("*").eq("patient_id", id).order("iniciado_em", { ascending: true }),
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
    if (!abaEscolhidaPeloUsuario) {
      setTab(((ev as DailyEvolution[]) ?? []).length > 0 ? "evolucao" : "admissao");
    }
    setAsyncs((asy as Asynchrony[]) ?? []);
    setCareActions((ca as CareAction[]) ?? []);
    // null significa "não sei", e é diferente de "não há sessão nenhuma".
    // Com a busca falhando, cair no campo legado faria um TRE reprovado hoje
    // ser apagado por um `tre_result: "pass"` de antes da Fase 5 — o
    // bloqueador absoluto sumiria da tela por causa de um erro de rede.
    setTreSessions(treError ? null : ((tre as TreSession[]) ?? []));
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

  // A triagem de extubação é calculada UMA vez e lida pelos dois painéis da
  // aba Desmame: o de TRE, que mostra o que hoje reprova antes de o terapeuta
  // decidir testar, e o de prontidão. Dois cálculos independentes da mesma
  // pergunta clínica divergem com o tempo; um só não tem como.
  // É null exatamente quando não há evolução — o que a aba já usa como guarda.
  const triagem: C.ExtubationReadiness | null = last
    ? C.extubationReadiness({
        fio2: last.fio2, peep: last.peep, tobinVal: C.tobin(last.fr, last.vc), pimaxVal: last.pimax,
        glasgow: last.glasgow, rass: last.rass, vasopressor: last.vasopressor,
        // O `recorded_at` da evolução é a data do valor legado: sem ela, um
        // TRE aprovado há cinco dias no campo antigo escaparia da janela de
        // 24 h que as sessões já respeitam.
        treResult: resultadoTreParaTriagem(treSessions, last.tre_result, last.recorded_at),
        peakCoughFlow: last.peak_cough_flow,
      })
    : null;

  const tabs = [
    { key: "admissao", label: "Admissão" },
    { key: "evolucao", label: "Evolução" },
    { key: "cuidados", label: "Cuidados" },
    { key: "graficos", label: "Gráficos" },
    { key: "desmame", label: "Desmame" },
  ];

  const hint = (msg: string) => <p style={{ color: T.dim, fontSize: 14 }}>{msg}</p>;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PatientHeader
        patient={patient}
        vent={vent}
        ventilators={ventilators}
        onUpdate={load}
        rassAtual={last?.rass ?? null}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap-reverse", alignItems: "center" }}>
        <ShareControl patient={patient} ownerId={session!.user.id} />
        <ArchiveControl patient={patient} onUpdate={load} />
      </div>

      <Tabs
        tabs={tabs}
        active={tab}
        onChange={(t) => {
          setAbaEscolhidaPeloUsuario(true);
          setTab(t);
        }}
      />

      {tab === "admissao" && (
        <div style={{ display: "grid", gap: 20 }}>
          <AdmissionCard patient={patient} />
          {vent && <VentilatorGuide vent={vent} mode={patient.current_mode} />}
        </div>
      )}

      {tab === "evolucao" && (
        <div style={{ display: "grid", gap: 20 }}>
          {last ? <Dashboard patient={patient} ev={last} /> : hint("Registre a primeira evolução para ver os 4 indicadores.")}
          <MotorPanel evolutions={evolutions} />
          <Grid min={340}>
            <EvolutionForm patient={patient} ownerId={session!.user.id} previous={last} onSaved={load} />
            <AsynchronyModule patientId={patient.id} ownerId={session!.user.id} asyncs={asyncs} onChange={load} />
          </Grid>
          <EvolutionHistory evolutions={evolutions} authors={authors} />
        </div>
      )}

      {tab === "cuidados" && (
        <CareBundlePanel
          patientId={patient.id}
          ownerId={session!.user.id}
          actions={careActions}
          authors={authors}
          onChange={load}
        />
      )}

      {tab === "graficos" && (
        evolutions.length >= 2
          ? <TrendCharts patient={patient} evolutions={evolutions} />
          : hint("São necessárias ao menos 2 evoluções para gerar as tendências.")
      )}

      {tab === "desmame" && (
        triagem
          ? (
            <div style={{ display: "grid", gap: 20 }}>
              {/* O TRE vem antes da triagem porque é o teste que alimenta um
                  dos critérios dela. */}
              <TrePanel
                patientId={patient.id}
                ownerId={session!.user.id}
                modoAtual={patient.current_mode}
                sessoes={treSessions ?? []}
                pendencias={pendenciasParaIniciar(triagem)}
                onChange={load}
              />
              <ExtubationCard triagem={triagem} />
            </div>
          )
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
  const perfil = derivarPerfil(patient);
  const sug = sugestaoAdmissao(
    perfil,
    null, // sem gasometria na admissão
    null,
    patient.current_mode
  );
  const { vc, peepFio2 } = sug;
  // sug.ventilacao é nullable no tipo porque nem toda chamada do motor de
  // alvos tem a garantia abaixo — mas perfil.pbw vem de pbwOrEstimate, que
  // sempre devolve um número finito, e vc.valor.target é derivado dele.
  // sugerirVentilacao nunca cai no ramo null aqui. Assertion documentada,
  // não suposição: sem ela sobrava um `ventilacao &&` morto.
  const ventilacao = sug.ventilacao!;

  return (
    <Panel
      title={`Sugestão de admissão · ${sug.modo}`}
      accent={T.accent}
      sub="Ponto de partida para colocar o paciente na ventilação — complete os dados depois para refinar"
    >
      {(sug.pbwEstimado || sug.obesoIndeterminado || peepFio2.valor.presetAdmissao) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {sug.pbwEstimado && (
            <Badge text={`PBW estimado (altura média) — informe a altura para precisão`} />
          )}
          {peepFio2.valor.presetAdmissao && (
            <Badge text="FiO₂/PEEP de admissão — titular pela gasometria/SpO₂" />
          )}
          {sug.obesoIndeterminado && (
            <Badge text="Sem IMC — assumindo faixa protetora; confirme peso/altura" />
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <SugBox
          label="VOLUME CORRENTE"
          big={`${vc.valor.target} mL`}
          sub={`faixa ${vc.valor.low}–${vc.valor.high} mL · PBW ${sug.pbw.toFixed(0)} kg`}
        />
        <SugBox label="PEEP / FiO₂" big={`${peepFio2.valor.peep} cmH₂O`} sub={`FiO₂ ${peepFio2.valor.fio2}%`} />
        <SugBox label="FREQUÊNCIA" big={`${ventilacao.valor.fr} /min`} sub="derivada do VC alvo" />
        <SugBox label="VOLUME-MINUTO" big={`${fmt(ventilacao.valor.veL)} L/min`} sub="~100 ml/kg PBW/min" />
      </div>
      <LinhaModulacao alvo={vc} />

      <p style={{ margin: "12px 0 0", fontSize: 11, color: T.dim }}>
        Assim que registrar a primeira evolução (gasometria, pressões), os 4 indicadores e a
        predição de extubação aparecem aqui. A Pressão de Platô continua sendo o limite de segurança.
      </p>
      {/* Deriva do alvo em vez de listar "vcKg" à mão: item 3 da onda de
          fechamento — mesma razão do Dashboard. */}
      <SourceFooter sourceKeys={["vcTarget", "peepFio2", ...vc.modulacoes.map((m) => m.sourceKey)]} />
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
// O TRE saiu daqui na Fase 5. O campo era um seletor com "Aprovado" e
// "Falhou" apenas: teste interrompido não tinha como ser registrado e virava
// "Falhou", que é bloqueador ABSOLUTO da triagem de extubação. Quem registra
// TRE agora é o TrePanel, na aba Desmame, com sessão e desfecho próprios.
// `daily_evolutions.tre_result` continua sendo LIDO como legado (ver
// resultadoTreParaTriagem), mas nunca mais escrito.
const EV_SECTIONS: { title: string; color: string; keys: string[] }[] = [
  { title: "Parâmetros do ventilador", color: T.accent, keys: ["fr", "vc", "peep", "fio2", "ppico", "pplat", "flow"] },
  { title: "Gasometria", color: T.ok, keys: ["ph", "pao2", "paco2", "spo2"] },
  { title: "Desmame", color: T.purple, keys: ["pimax", "peak_cough_flow", "glasgow"] },
  { title: "Hemodinâmica", color: T.warn, keys: ["hr", "sbp", "dbp", "lactate"] },
];

function EvolutionForm({ patient, ownerId, previous, onSaved }: { patient: Patient; ownerId: string; previous?: DailyEvolution; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
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
      // `tre_result` NÃO entra no payload: o TRE é registrado em
      // `tre_sessions`, onde "interrompido" existe como desfecho próprio.
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

// ---------- Predição de extubação ----------
// A triagem chega pronta do corpo da página: é o mesmo objeto que o painel de
// TRE lê para listar as pendências. Ver o comentário em `triagem`, acima.
function ExtubationCard({ triagem: r }: { triagem: C.ExtubationReadiness }) {
  const veredito = {
    favorable: { c: T.ok, t: "Critérios favoráveis para extubação" },
    borderline: { c: T.warn, t: "Critérios parciais, reavaliar" },
    unfavorable: { c: T.danger, t: "Critérios desfavoráveis" },
    insufficient: { c: T.dim, t: "Dados insuficientes para triagem" },
  }[r.level];

  return (
    // O subtítulo dizia "a partir da última evolução", e desde a Fase 5 isso
    // deixou de ser verdade: o critério de TRE lê o histórico de sessões, não
    // a evolução do dia. A pergunta clínica que faltava — por quanto tempo um
    // TRE continua valendo — foi respondida pelo mentor em 01/09/2026, e são
    // as 24 h de VALIDADE_TRE_HORAS. O subtítulo diz as duas coisas: de onde
    // vem cada número e qual o recorte de tempo do TRE.
    <Panel title="Prontidão para extubação" accent={veredito.c}
      sub="Medidas da última evolução e TRE das últimas 24 h do histórico de testes, não é indicação de extubar">
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
      {/* Os três grupos ganham um invólucro próprio para que o teste possa
          perguntar EM QUAL deles um critério caiu: procurar o rótulo no painel
          inteiro não distingue atendido de reprovado de não medido, e é essa
          distinção que decide a conduta. `display: contents` mantém as linhas
          como itens diretos do grid de fora, então o espaçamento da tela é
          exatamente o mesmo de antes, inclusive com grupo vazio. */}
      <div style={{ display: "grid", gap: 6 }}>
        <div data-testid="extubacao-atendidos" style={{ display: "contents" }}>
          {r.met.map((m) => (
            <div key={m} style={{ fontSize: 13, color: T.ok }}>✓ {m}</div>
          ))}
        </div>
        <div data-testid="extubacao-reprovados" style={{ display: "contents" }}>
          {r.failed.map((m) => (
            <div key={m} style={{ fontSize: 13, color: T.danger }}>✗ {m}</div>
          ))}
        </div>
        <div data-testid="extubacao-nao-medidos" style={{ display: "contents" }}>
          {r.notMeasured.map((m) => (
            <div key={m} style={{ fontSize: 13, color: T.dim }}>○ {m} <span style={{ fontSize: 11 }}>(não medido)</span></div>
          ))}
        </div>
      </div>
      <SourceFooter sourceKeys={["extubation", "tobin", "pimax", "rass"]} />
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
