import { CSSProperties, useEffect, useState } from "react";
import { Panel, Alert, Field, Btn } from "../ui";
import { SourceFooter } from "../SourceFooter";
import { CRITERIOS_FALHA, MODALIDADES_TESTE } from "../../data/tre";
import { sessaoEmAndamento, criteriosAtingidos, duracaoMinutos } from "../../lib/tre";
import { supabase } from "../../lib/supabase";
import { T } from "../../lib/theme";
import type { TreCriterio, TreDesfecho, TreSession } from "../../types";

const LABEL_CRITERIO = new Map(CRITERIOS_FALHA.map((c) => [c.key, c.label]));
const LABEL_MODALIDADE = new Map(MODALIDADES_TESTE.map((m) => [m.v, m.t]));

/**
 * O que cada desfecho significa para a triagem de extubação, dito na tela.
 *
 * 'interrompido' NÃO é 'falhou', e a diferença é a razão de ser desta fase:
 * um teste parado por tomografia ou transporte é um teste que não aconteceu,
 * enquanto um TRE reprovado é bloqueador absoluto da triagem. Por isso os dois
 * carregam cor, peso e frase diferentes — confundir os dois na tela produz
 * reprovações que nunca existiram.
 */
const DESFECHO: Record<TreDesfecho, { rotulo: string; cor: string; efeito: string }> = {
  aprovado: {
    rotulo: "Aprovado",
    cor: T.ok,
    efeito: "Atende ao critério de TRE na triagem de extubação.",
  },
  falhou: {
    rotulo: "Falhou",
    cor: T.danger,
    efeito: "Bloqueia a extubação na triagem.",
  },
  interrompido: {
    rotulo: "Interrompido",
    cor: T.dim,
    efeito: "O teste não aconteceu: não conta como falha, e a triagem fica sem resposta de TRE.",
  },
};

/** Duração máxima usual de um TRE. Acima disso, a sessão foi esquecida aberta. */
const LIMITE_ABANDONO = 120;

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const botaoDesfecho = (cor: string): CSSProperties => ({
  flex: "1 1 150px",
  minWidth: 0,
  textAlign: "left",
  padding: "12px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
  background: `${cor}14`,
  border: `1px solid ${cor}66`,
  color: T.txt,
});

export function TrePanel({
  patientId,
  ownerId,
  modoAtual,
  sessoes,
  pendencias,
  onChange,
}: {
  patientId: string;
  ownerId: string;
  modoAtual: string | null;
  sessoes: TreSession[];
  pendencias: string[];
  onChange: () => void;
}) {
  const aberta = sessaoEmAndamento(sessoes);
  const idAberta = aberta?.id ?? null;

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [modalidade, setModalidade] = useState(MODALIDADES_TESTE[0].v);
  const [modoAntes, setModoAntes] = useState(modoAtual ?? "");
  const [criterios, setCriterios] = useState<Record<string, TreCriterio>>(aberta?.criterios ?? {});
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  // "Falhou" grava um bloqueador ABSOLUTO da triagem de extubação e não tem
  // como ser corrigido depois. Um clique só, sem confirmação, era menos
  // deliberado do que "Interromper", que já pedia motivo digitado — a
  // assimetria estava ao contrário do peso clínico dos dois desfechos.
  const [confirmandoFalha, setConfirmandoFalha] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [agora, setAgora] = useState(() => new Date());

  // Estado derivado de prop, no padrão "ajustar durante o render". Trocar de
  // sessão (ou de paciente, quando a Task 6 montar isto no PatientDetail) tem
  // que zerar o que era da sessão anterior — a armadilha nº 10 do CLAUDE.md é
  // exatamente um sinalizador que ficou para trás numa troca de rota.
  const [idCarregado, setIdCarregado] = useState(idAberta);
  if (idAberta !== idCarregado) {
    setIdCarregado(idAberta);
    setCriterios(aberta?.criterios ?? {});
    setPedindoMotivo(false);
    setConfirmandoFalha(false);
    setMotivo("");
    setErro(null);
  }

  // O modo anterior chega depois do primeiro render (a página carrega a
  // evolução de forma assíncrona). Sem isto o campo ficaria vazio para sempre.
  const [modoVisto, setModoVisto] = useState(modoAtual);
  if (modoAtual !== modoVisto) {
    setModoVisto(modoAtual);
    setModoAntes(modoAtual ?? "");
  }

  // Relógio da sessão. O app cronometra a SESSÃO — nunca os 5 minutos de
  // persistência de cada critério, que quem julga é o terapeuta ao lado do
  // paciente. E nunca encerra sozinho.
  useEffect(() => {
    if (!idAberta) return;
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 30000);
    return () => clearInterval(t);
  }, [idAberta]);

  const iniciar = async () => {
    setErro(null);
    setSalvando(true);
    const { error } = await supabase.from("tre_sessions").insert({
      patient_id: patientId,
      owner_id: ownerId,
      modo_antes: modoAntes.trim() || null,
      modo_durante: modalidade,
    });
    setSalvando(false);
    if (error) {
      // Falha de escrita tem que aparecer: silenciar faz o terapeuta acreditar
      // que iniciou um teste que o banco recusou.
      setErro(error.message);
      return;
    }
    onChange();
  };

  /**
   * Liga e desliga um critério. Desligado é a chave AUSENTE do jsonb, que
   * significa "não avaliado" — nunca `atingido: false`, que afirmaria uma
   * avaliação que ninguém fez.
   */
  const alternar = async (key: string) => {
    if (!aberta) return;
    const anterior = criterios;
    const novo = { ...criterios };
    if (novo[key]?.atingido) delete novo[key];
    else novo[key] = { atingido: true };
    setErro(null);
    setCriterios(novo);
    const { error } = await supabase
      .from("tre_sessions")
      .update({ criterios: novo })
      .eq("id", aberta.id);
    if (error) {
      // Reverte: a tela não pode continuar mostrando marcado o que não gravou.
      setCriterios(anterior);
      setErro(error.message);
    }
  };

  const encerrar = async (desfecho: TreDesfecho) => {
    if (!aberta || salvando) return;
    setErro(null);
    setSalvando(true);
    const { error } = await supabase
      .from("tre_sessions")
      .update({
        desfecho,
        encerrado_em: new Date().toISOString(),
        criterios,
        motivo_interrupcao: desfecho === "interrompido" ? motivo.trim() : null,
      })
      .eq("id", aberta.id);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setPedindoMotivo(false);
    setConfirmandoFalha(false);
    setMotivo("");
    onChange();
  };

  const encerradas = [...sessoes]
    .filter((s) => s.desfecho != null)
    .sort((a, b) => new Date(b.iniciado_em).getTime() - new Date(a.iniciado_em).getTime());

  const decorrido = aberta ? duracaoMinutos(aberta, agora) : 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {erro && <Alert>{erro}</Alert>}

      {!aberta && (
        <Panel
          title="Teste de respiração espontânea"
          sub="Duração usual de 30 a 120 min"
          accent={T.accent}
        >
          {pendencias.length > 0 && (
            // O terapeuta vê o que hoje reprova na triagem ANTES de decidir.
            // O botão continua habilitado de propósito: a sugestão não
            // determina a conduta, quem decide é ele.
            <div
              data-testid="tre-pendencias"
              style={{
                marginBottom: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: `${T.warn}14`,
                border: `1px solid ${T.warn}40`,
              }}
            >
              <div style={{ fontSize: 11.5, color: T.warn, fontWeight: 700, letterSpacing: 0.3 }}>
                HOJE REPROVA NA TRIAGEM DE EXTUBAÇÃO
              </div>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: T.txt, lineHeight: 1.6 }}>
                {pendencias.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: T.dim }}>
                Apoio à decisão, não impedimento: quem decide testar é você.
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Field
              label="Modalidade do teste"
              value={modalidade}
              onChange={setModalidade}
              options={MODALIDADES_TESTE}
            />
            <Field
              label="Modo antes do teste"
              type="text"
              value={modoAntes}
              onChange={setModoAntes}
              placeholder="ex.: PCV"
            />
          </div>

          <Btn onClick={iniciar} disabled={salvando}>
            {salvando ? "Iniciando…" : "Iniciar teste"}
          </Btn>
        </Panel>
      )}

      {aberta && (
        <Panel
          title="TRE em andamento"
          sub={`Iniciado às ${quando(aberta.iniciado_em)}${
            aberta.modo_durante ? ` · ${LABEL_MODALIDADE.get(aberta.modo_durante) ?? aberta.modo_durante}` : ""
          }`}
          accent={T.warn}
        >
          <div
            data-testid="tre-duracao"
            style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}
          >
            <span style={{ fontSize: 34, fontWeight: 700, color: T.txt, fontVariantNumeric: "tabular-nums" }}>
              {decorrido}
            </span>
            <span style={{ fontSize: 13, color: T.dim }}>min de teste</span>
          </div>

          {decorrido > LIMITE_ABANDONO && (
            <div style={{ marginBottom: 12 }}>
              <Alert tone="warn">
                {`Sessão aberta há ${Math.floor(decorrido / 60)} h. O app não encerra o teste sozinho: registre o desfecho ou interrompa.`}
              </Alert>
            </div>
          )}

          <div style={{ fontSize: 11, color: T.dim, letterSpacing: 0.3, margin: "14px 0 8px" }}>
            CRITÉRIOS DE FALHA — MARQUE O QUE OBSERVAR
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {CRITERIOS_FALHA.map((c) => {
              const on = criterios[c.key]?.atingido === true;
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => alternar(c.key)}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "baseline",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: on ? `${T.danger}14` : T.panel2,
                    border: `1px solid ${on ? T.danger : T.line}`,
                  }}
                >
                  <span style={{ color: on ? T.danger : T.dim, fontWeight: 700, fontSize: 13 }}>
                    {on ? "✓" : "○"}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: on ? 700 : 600, color: on ? T.danger : T.txt }}>
                    {c.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: T.dim, flex: 1 }}>{c.detalhe}</span>
                </button>
              );
            })}
          </div>

          <p style={{ margin: "10px 0 0", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
            Cada sinal só caracteriza falha persistindo por 5 minutos ou mais. Quem julga a
            persistência é você, ao lado do paciente: o app cronometra a sessão, não cada critério.
          </p>

          <div style={{ marginTop: 18 }}>
            {!pedindoMotivo && !confirmandoFalha ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => encerrar("aprovado")}
                    style={botaoDesfecho(T.ok)}
                  >
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.ok }}>
                      Aprovado
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: T.dim, marginTop: 2 }}>
                      tolerou o teste
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => setConfirmandoFalha(true)}
                    style={botaoDesfecho(T.danger)}
                  >
                    <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: T.danger }}>
                      Falhou
                    </span>
                    <span style={{ display: "block", fontSize: 11, color: T.dim, marginTop: 2 }}>
                      bloqueia a extubação
                    </span>
                  </button>
                </div>

                {/* Separado dos dois desfechos clínicos, e com outra cor: parar
                    o teste por tomografia não é o paciente reprovando. */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${T.line}`,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    disabled={salvando}
                    onClick={() => setPedindoMotivo(true)}
                    style={{
                      padding: "9px 16px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      background: "transparent",
                      border: `1px solid ${T.line}`,
                      color: T.txt,
                    }}
                  >
                    Interromper
                  </button>
                  <span
                    data-testid="tre-aviso-interrupcao"
                    style={{ fontSize: 11.5, color: T.dim, flex: "1 1 220px", lineHeight: 1.5 }}
                  >
                    Interromper não é falha: registra que o teste não aconteceu (exame,
                    transporte, decisão da equipe) e não bloqueia a extubação.
                  </span>
                </div>
              </>
            ) : confirmandoFalha ? (
              <div
                data-testid="tre-confirmar-falha"
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: `${T.danger}0F`,
                  border: `1px solid ${T.danger}66`,
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.danger }}>
                  Registrar falha do teste?
                </div>
                <p style={{ margin: "6px 0 12px", fontSize: 11.5, color: T.dim, lineHeight: 1.6 }}>
                  Falha bloqueia a extubação na triagem, e o desfecho de um teste encerrado não
                  pode ser corrigido depois. Se o teste parou por exame, transporte ou decisão da
                  equipe, volte e use Interromper.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn variant="danger" onClick={() => encerrar("falhou")} disabled={salvando}>
                    Confirmar falha
                  </Btn>
                  <Btn variant="ghost" onClick={() => setConfirmandoFalha(false)}>
                    Voltar
                  </Btn>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: T.panel2,
                  border: `1px solid ${T.line}`,
                }}
              >
                <Field
                  label="Motivo da interrupção"
                  type="text"
                  value={motivo}
                  onChange={setMotivo}
                  placeholder="ex.: tomografia"
                />
                <p style={{ margin: "8px 0 12px", fontSize: 11.5, color: T.dim }}>
                  Fica registrado como teste não realizado, sem desfecho clínico.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn onClick={() => encerrar("interrompido")} disabled={salvando || !motivo.trim()}>
                    Confirmar
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setPedindoMotivo(false);
                      setMotivo("");
                    }}
                  >
                    Voltar
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {encerradas.length > 0 && (
        <Panel title="Testes anteriores" sub="Do mais recente para o mais antigo">
          <div style={{ display: "grid", gap: 8 }}>
            {encerradas.map((s) => {
              const d = DESFECHO[s.desfecho as TreDesfecho];
              const atingidos = criteriosAtingidos(s);
              return (
                <div
                  key={s.id}
                  data-testid={`tre-historico-${s.id}`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: T.panel2,
                    border: `1px solid ${T.line}`,
                    borderLeft: `4px solid ${d.cor}`,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.cor }}>{d.rotulo}</span>
                    <span style={{ fontSize: 12, color: T.dim }}>{quando(s.iniciado_em)}</span>
                    <span style={{ fontSize: 12, color: T.dim, fontVariantNumeric: "tabular-nums" }}>
                      {duracaoMinutos(s)} min
                    </span>
                    {s.modo_durante && (
                      <span style={{ fontSize: 12, color: T.dim }}>
                        {LABEL_MODALIDADE.get(s.modo_durante) ?? s.modo_durante}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.dim, marginTop: 3 }}>{d.efeito}</div>
                  {s.motivo_interrupcao && (
                    <div style={{ fontSize: 12.5, color: T.txt, marginTop: 4 }}>
                      Motivo: {s.motivo_interrupcao}
                    </div>
                  )}
                  {atingidos.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      {atingidos.map((k) => (
                        <span
                          key={k}
                          style={{
                            fontSize: 11.5,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: `${T.danger}1A`,
                            color: T.danger,
                            fontWeight: 600,
                          }}
                        >
                          {LABEL_CRITERIO.get(k) ?? k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Um rodapé só, fora dos painéis: os três estados de tela mostram o
          mesmo conteúdo clínico (critérios de falha e duração do teste) e
          nunca aparecem os três juntos. */}
      <div data-testid="tre-fonte">
        <SourceFooter sourceKeys={["treFalha"]} />
      </div>
    </div>
  );
}
