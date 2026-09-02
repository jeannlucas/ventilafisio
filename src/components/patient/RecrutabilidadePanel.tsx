import { CSSProperties, useState } from "react";
import { Panel, Alert, Field, Btn, Row } from "../ui";
import { SourceFooter } from "../SourceFooter";
import {
  calcularRi,
  FAIXA_RI_OBSERVADA,
  type Recrutabilidade,
  type RecrutabilidadeEntrada,
} from "../../lib/mecanica";
import { supabase } from "../../lib/supabase";
import { T, fmt } from "../../lib/theme";
import type { ManobraDesfecho, RecruitmentManeuver } from "../../types";

/**
 * Painel da manobra de recrutabilidade (R/I de Chen 2020).
 *
 * O APLICATIVO NÃO DIZ SE O PACIENTE É RECRUTÁVEL. Ele mostra a razão medida,
 * a data e a fonte, e para por aí. O valor que circula como ponto de corte é a
 * mediana da coorte de derivação, usada ali para dicotomizar a análise: não é
 * limiar validado contra desfecho, o erro de medida é da mesma ordem da
 * distância entre os cortes propostos na literatura, e a validação mais recente
 * contra tomografia tem piso de intervalo de confiança encostando no acaso.
 * Classificar o paciente com esse número seria afirmar mais do que a fonte dá.
 *
 * Nenhuma conta mora aqui: o R/I vem de `calcularRi` e a faixa observada de
 * `FAIXA_RI_OBSERVADA`. Não há limiar digitado neste arquivo.
 */

/**
 * O que cada desfecho significa, dito na tela.
 *
 * Os três são coisas diferentes e nenhum é falha do paciente: 'concluida'
 * produziu número; 'abortada' não pôde ser feita, porque a manobra pressupõe
 * paciente passivo; 'inconclusiva' foi feita e não produziu número. Confundir
 * as duas últimas apaga a diferença entre medida ausente e medida tentada.
 */
const DESFECHO: Record<ManobraDesfecho, { rotulo: string; cor: string; efeito: string }> = {
  concluida: {
    rotulo: "Concluída",
    cor: T.ok,
    efeito:
      "A manobra foi realizada até o fim e produziu número. O que aparece abaixo é a razão medida, sem leitura do aplicativo.",
  },
  abortada: {
    rotulo: "Abortada",
    cor: T.dim,
    efeito:
      "A manobra não chegou a ser realizada, e o motivo é o que está registrado abaixo. Não há razão a mostrar, e a ausência dela não é resultado nem falha do paciente.",
  },
  inconclusiva: {
    rotulo: "Inconclusiva",
    cor: T.warn,
    efeito:
      "A manobra foi realizada e não produziu número aproveitável. Fica registrada assim de propósito: medida tentada e perdida não é medida que nunca existiu.",
  },
};

/** Desfecho fora do domínio conhecido: avisa, em vez de renderizar `undefined`. */
const DESFECHO_DESCONHECIDO = {
  rotulo: "Desfecho não reconhecido",
  cor: T.warn,
  efeito:
    "O aplicativo recebeu um desfecho que esta tela não sabe nomear. Não interprete a manobra por aqui.",
};

const SIM_NAO = [
  { v: "", t: "— selecione —" },
  { v: "sim", t: "Sim" },
  { v: "nao", t: "Não" },
];

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Texto para número. Vazio é ausência de dado; zero é medida — ZEEP é
 * regulagem válida, e tratá-lo como campo em branco apagaria uma PEEP real.
 */
const numero = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const booleano = (s: string): boolean | null =>
  s === "sim" ? true : s === "nao" ? false : null;

const entradaDe = (m: RecruitmentManeuver): RecrutabilidadeEntrada => ({
  passivo: m.passivo,
  fechamentoViaAerea: m.fechamento_via_aerea,
  pressaoAbertura: m.pressao_abertura,
  peepAlta: m.peep_alta,
  peepBaixa: m.peep_baixa,
  volumeExpiradoExtra: m.volume_expirado_extra,
  pplatBaixa: m.pplat_baixa,
  vcBaixa: m.vc_baixa,
});

/**
 * A razão de uma manobra encerrada, ou nada.
 *
 * Só a manobra declarada 'concluida' mostra número. Numa 'inconclusiva' os
 * valores gravados podem até fechar a conta, mas quem esteve ao lado do
 * paciente registrou que a medida não vale — a tela não desmente o registro.
 */
const razaoDe = (m: RecruitmentManeuver): Recrutabilidade | null =>
  m.desfecho === "concluida" ? calcularRi(entradaDe(m)) : null;

const rotuloBloco: CSSProperties = {
  fontSize: 11,
  color: T.dim,
  letterSpacing: 0.3,
  marginBottom: 4,
};

const caixa = (cor: string): CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 10,
  background: T.panel2,
  border: `1px solid ${T.line}`,
  borderLeft: `4px solid ${cor}`,
});

const textoMenor: CSSProperties = {
  margin: "6px 0 0",
  fontSize: 11.5,
  color: T.dim,
  lineHeight: 1.6,
};

/**
 * A razão em destaque, com o texto que diz que o aplicativo não classifica.
 *
 * NÃO é o único lugar do arquivo que imprime a razão: a linha do histórico
 * também a imprime, resumida. Por isso a promessa de não classificar é
 * conferida no painel inteiro (`container.textContent`), e não só dentro deste
 * bloco — teste que olha um elemento só não cobre os outros cantos da tela. E
 * por isso `mostraRessalva` é derivado da MESMA lista de razões que a tela
 * renderiza: enquanto os dois saírem do mesmo cálculo, é impossível aparecer
 * número sem a ressalva junto.
 *
 * Aqui dentro não entra NENHUM outro número: a asserção do teste é por
 * conteúdo de texto, e um dígito vindo de prosa vizinha a satisfaria pelo
 * motivo errado (a fase anterior teve exatamente esse defeito). Os valores
 * intermediários e a faixa observada ficam em blocos irmãos.
 */
function BlocoRi({ r, testId }: { r: Recrutabilidade; testId: string }) {
  return (
    <div data-testid={testId} style={caixa(T.accent)}>
      <div style={rotuloBloco}>RAZÃO RECRUTAMENTO SOBRE INSUFLAÇÃO (R/I)</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: T.txt,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt(r.ri, 1)}
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
        O aplicativo mostra a razão medida e não a classifica.
        {r.ri < 0 &&
          " Razão negativa: o volume expirado extra ficou abaixo do volume insuflado. Isso aponta problema na medida, e o valor aparece como saiu justamente para que o problema apareça."}
      </p>
    </div>
  );
}

/** Valores intermediários da conta, para quem quiser conferir a medida. */
function BlocoComponentes({ r }: { r: Recrutabilidade }) {
  const linhas: { rot: string; val: string }[] = [
    { rot: "Complacência em PEEP baixa", val: `${fmt(r.cBaixa, 1)} mL/cmH₂O` },
    { rot: "Volume insuflado", val: `${fmt(r.vInflado, 0)} mL` },
    { rot: "Volume recrutado", val: `${fmt(r.vRecrutado, 0)} mL` },
    { rot: "PEEP baixa efetiva", val: `${fmt(r.peepBaixaEfetiva, 0)} cmH₂O` },
  ];
  return (
    <div data-testid="rec-componentes" style={{ display: "grid", gap: 4 }}>
      {linhas.map((l) => (
        <div key={l.rot} style={{ display: "flex", gap: 8, fontSize: 12, color: T.dim }}>
          <span style={{ flex: 1 }}>{l.rot}</span>
          <span style={{ color: T.txt, fontVariantNumeric: "tabular-nums" }}>{l.val}</span>
        </div>
      ))}
    </div>
  );
}

/** Faixa OBSERVADA na coorte, lida do módulo. Não é faixa de normalidade. */
function BlocoFaixa() {
  return (
    <p data-testid="rec-faixa" style={textoMenor}>
      Na coorte de derivação, os valores observados foram de{" "}
      {fmt(FAIXA_RI_OBSERVADA.min, 1)} a {fmt(FAIXA_RI_OBSERVADA.max, 1)}. É descrição do que se
      mediu naquele grupo de pacientes, não faixa de normalidade nem limiar de conduta.
    </p>
  );
}

export function RecrutabilidadePanel({
  patientId,
  ownerId,
  manobras,
  onChange,
}: {
  patientId: string;
  ownerId: string;
  manobras: RecruitmentManeuver[];
  onChange: () => void;
}) {
  // `desfecho` nulo é manobra EM ANDAMENTO, não dado faltando.
  const emAndamento = manobras.find((m) => m.desfecho == null) ?? null;
  const encerradas = [...manobras]
    .filter((m) => m.desfecho != null)
    .sort((a, b) => new Date(b.realizada_em).getTime() - new Date(a.realizada_em).getTime());
  const ultima = encerradas[0] ?? null;
  const anteriores = encerradas.slice(1);

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [passivo, setPassivo] = useState("");
  const [fechamento, setFechamento] = useState("");
  const [pAbertura, setPAbertura] = useState("");
  const [peepAlta, setPeepAlta] = useState("");
  const [peepBaixa, setPeepBaixa] = useState("");
  const [volExtra, setVolExtra] = useState("");
  const [pplatBaixa, setPplatBaixa] = useState("");
  const [vcBaixa, setVcBaixa] = useState("");
  const [encerrandoCom, setEncerrandoCom] = useState<ManobraDesfecho | null>(null);
  const [motivo, setMotivo] = useState("");

  const limpar = () => {
    setPassivo("");
    setFechamento("");
    setPAbertura("");
    setPeepAlta("");
    setPeepBaixa("");
    setVolExtra("");
    setPplatBaixa("");
    setVcBaixa("");
    setEncerrandoCom(null);
    setMotivo("");
    setErro(null);
  };

  // Estado derivado de prop, no padrão "ajustar durante o render". Trocar de
  // paciente ou de manobra aberta tem que zerar o que era da anterior: a
  // armadilha nº 10 do CLAUDE.md é exatamente um sinalizador que ficou para
  // trás numa troca de rota.
  const chave = `${patientId}|${emAndamento?.id ?? ""}`;
  const [chaveCarregada, setChaveCarregada] = useState(chave);
  if (chave !== chaveCarregada) {
    setChaveCarregada(chave);
    limpar();
  }

  const abortandoNoRegistro = passivo === "nao";
  const respondeuAsPerguntas = abortandoNoRegistro
    ? motivo.trim() !== ""
    : passivo === "sim" && fechamento !== "" && (fechamento !== "sim" || pAbertura.trim() !== "");

  /**
   * Registra a manobra.
   *
   * Com paciente não passivo, a manobra não pôde ser feita e nasce 'abortada':
   * seria mentira gravá-la como em andamento. Nos demais casos ela nasce em
   * andamento (`desfecho` nulo) e quem escolhe o desfecho é o terapeuta, depois
   * de ver o que os valores produziram — inclusive a possibilidade de não terem
   * produzido número nenhum.
   */
  const registrar = async () => {
    if (salvando || !respondeuAsPerguntas) return;
    setErro(null);
    setSalvando(true);
    const temFechamento = fechamento === "sim";
    const { error } = await supabase.from("recruitment_maneuvers").insert({
      patient_id: patientId,
      owner_id: ownerId,
      passivo: booleano(passivo),
      fechamento_via_aerea: abortandoNoRegistro ? null : booleano(fechamento),
      // Pressão de abertura só existe quando há fechamento: gravá-la fora disso
      // deixaria no banco um número que a conta usaria em outro paciente.
      pressao_abertura: !abortandoNoRegistro && temFechamento ? numero(pAbertura) : null,
      peep_alta: abortandoNoRegistro ? null : numero(peepAlta),
      peep_baixa: abortandoNoRegistro ? null : numero(peepBaixa),
      volume_expirado_extra: abortandoNoRegistro ? null : numero(volExtra),
      pplat_baixa: abortandoNoRegistro ? null : numero(pplatBaixa),
      vc_baixa: abortandoNoRegistro ? null : numero(vcBaixa),
      desfecho: abortandoNoRegistro ? "abortada" : null,
      motivo: abortandoNoRegistro ? motivo.trim() : null,
    });
    setSalvando(false);
    if (error) {
      // Falha de escrita tem que aparecer: silenciar faz o terapeuta acreditar
      // que registrou uma manobra que o banco recusou.
      setErro(error.message);
      return;
    }
    limpar();
    onChange();
  };

  const encerrar = async (desfecho: ManobraDesfecho) => {
    if (!emAndamento || salvando) return;
    setErro(null);
    setSalvando(true);
    const { error } = await supabase
      .from("recruitment_maneuvers")
      .update({
        desfecho,
        motivo: desfecho === "concluida" ? null : motivo.trim() || null,
      })
      .eq("id", emAndamento.id);
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEncerrandoCom(null);
    setMotivo("");
    onChange();
  };

  const riEmAndamento = emAndamento ? calcularRi(entradaDe(emAndamento)) : null;
  const riUltima = ultima ? razaoDe(ultima) : null;
  // Uma razão por manobra anterior, na mesma ordem da lista: é ela que a linha
  // do histórico imprime, e é ela que entra na conta da ressalva. Recalcular
  // dentro do `map` deixava o histórico exibindo número que a ressalva não
  // sabia que existia — foi exatamente esse o defeito.
  const riAnteriores = anteriores.map(razaoDe);
  // A ressalva acompanha QUALQUER razão na tela, venha ela do destaque, da
  // manobra em andamento ou de uma linha do histórico. Ela é a única proteção
  // que este painel oferece: número sem ela é o painel classificando por
  // omissão.
  const mostraRessalva =
    riEmAndamento != null || riUltima != null || riAnteriores.some((r) => r != null);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {erro && <Alert>{erro}</Alert>}

      {emAndamento && (
        <Panel
          title="Manobra em andamento"
          sub={`Registrada às ${quando(emAndamento.realizada_em)}`}
          accent={T.warn}
        >
          <ValoresRegistrados m={emAndamento} />

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {riEmAndamento ? (
              <>
                <BlocoRi r={riEmAndamento} testId="rec-ri-previa" />
                <BlocoComponentes r={riEmAndamento} />
                <BlocoFaixa />
              </>
            ) : (
              <p data-testid="rec-sem-numero" style={{ ...textoMenor, marginTop: 0 }}>
                Com o que está registrado, o aplicativo não calcula a razão. Faltam:{" "}
                {faltantes(emAndamento).join(", ")}. Sem paciente passivo confirmado e sem resposta
                sobre fechamento de via aérea não há conta possível: não saber se houve fechamento
                não é o mesmo que saber que não houve.
              </p>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            {encerrandoCom == null ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Btn onClick={() => encerrar("concluida")} disabled={salvando || !riEmAndamento}>
                  Concluir manobra
                </Btn>
                <Btn variant="ghost" onClick={() => setEncerrandoCom("inconclusiva")}>
                  Registrar como inconclusiva
                </Btn>
                <Btn variant="danger" onClick={() => setEncerrandoCom("abortada")}>
                  Abortar manobra
                </Btn>
                {!riEmAndamento && (
                  <span style={{ ...textoMenor, flex: "1 1 220px", marginTop: 0 }}>
                    Concluir exige um número. Sem ele, o registro honesto é inconclusiva.
                  </span>
                )}
              </div>
            ) : (
              <div style={{ padding: 14, borderRadius: 10, background: T.panel2, border: `1px solid ${T.line}` }}>
                <Field
                  label={
                    encerrandoCom === "abortada"
                      ? "Por que a manobra não pôde ser feita?"
                      : "Por que a manobra não produziu número?"
                  }
                  type="text"
                  value={motivo}
                  onChange={setMotivo}
                  placeholder={
                    encerrandoCom === "abortada" ? "ex.: paciente disparando" : "ex.: vazamento no circuito"
                  }
                />
                <p style={{ ...textoMenor, margin: "8px 0 12px" }}>
                  {DESFECHO[encerrandoCom].efeito}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Btn onClick={() => encerrar(encerrandoCom)} disabled={salvando || !motivo.trim()}>
                    Confirmar
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setEncerrandoCom(null);
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

      {!emAndamento && (
        <Panel
          title="Manobra de recrutabilidade"
          sub="Paciente passivo, PEEP alta, PEEP baixa e o volume expirado extra"
          accent={T.accent}
        >
          <div style={{ display: "grid", gap: 10 }}>
            {/* A ordem dos campos é a ordem da manobra à beira do leito, e as
                duas perguntas de sim/não vêm primeiro porque são pré-requisito:
                sem paciente passivo a manobra não acontece, e sem saber do
                fechamento de via aérea a conta usaria a PEEP errada. */}
            <Field label="1. Paciente passivo?" value={passivo} onChange={setPassivo} options={SIM_NAO} />

            {abortandoNoRegistro && (
              <>
                <p data-testid="rec-nao-passivo" style={{ ...textoMenor, marginTop: 0 }}>
                  A manobra pressupõe paciente passivo, então ela não pode ser feita agora. Registre
                  a tentativa como abortada: isso não é falha do paciente, e some da tela se não for
                  registrado.
                </p>
                <Field
                  label="Motivo"
                  type="text"
                  value={motivo}
                  onChange={setMotivo}
                  placeholder="ex.: paciente disparando"
                />
              </>
            )}

            {passivo === "sim" && (
              <>
                <Field
                  label="2. Fechamento de via aérea?"
                  value={fechamento}
                  onChange={setFechamento}
                  options={SIM_NAO}
                />
                {fechamento === "sim" && (
                  <Field
                    label="3. Pressão de abertura"
                    value={pAbertura}
                    onChange={setPAbertura}
                    unit="cmH₂O"
                  />
                )}
                {fechamento !== "" && (
                  <>
                    <Row cols={2}>
                      <Field label="4. PEEP alta" value={peepAlta} onChange={setPeepAlta} unit="cmH₂O" />
                      <Field label="5. PEEP baixa" value={peepBaixa} onChange={setPeepBaixa} unit="cmH₂O" />
                    </Row>
                    <Field
                      label="6. Volume expirado extra"
                      value={volExtra}
                      onChange={setVolExtra}
                      unit="mL"
                    />
                    <Row cols={2}>
                      <Field
                        label="7. Platô em PEEP baixa"
                        value={pplatBaixa}
                        onChange={setPplatBaixa}
                        unit="cmH₂O"
                      />
                      <Field
                        label="8. Volume corrente em PEEP baixa"
                        value={vcBaixa}
                        onChange={setVcBaixa}
                        unit="mL"
                      />
                    </Row>
                  </>
                )}
              </>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <Btn onClick={registrar} disabled={salvando || !respondeuAsPerguntas}>
              {salvando ? "Registrando…" : abortandoNoRegistro ? "Registrar manobra abortada" : "Registrar manobra"}
            </Btn>
            <p style={textoMenor}>
              Valor que não foi medido fica em branco: em branco é medida ausente, e zero é medida.
              A manobra fica em andamento até você escolher o desfecho.
            </p>
          </div>
        </Panel>
      )}

      {ultima && (
        <Panel title="Última manobra" sub={quando(ultima.realizada_em)}>
          <BlocoDesfecho m={ultima} />
          {riUltima && (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <BlocoRi r={riUltima} testId="rec-ri" />
              <BlocoComponentes r={riUltima} />
              <BlocoFaixa />
            </div>
          )}
        </Panel>
      )}

      {anteriores.length > 0 && (
        <Panel title="Manobras anteriores" sub="Da mais recente para a mais antiga">
          <div style={{ display: "grid", gap: 8 }}>
            {anteriores.map((m, i) => {
              const d = DESFECHO[m.desfecho as ManobraDesfecho] ?? DESFECHO_DESCONHECIDO;
              const r = riAnteriores[i];
              return (
                <div key={m.id} data-testid={`rec-historico-${m.id}`} style={caixa(d.cor)}>
                  <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.cor }}>{d.rotulo}</span>
                    <span style={{ fontSize: 12, color: T.dim }}>{quando(m.realizada_em)}</span>
                    {r && (
                      <span style={{ fontSize: 12, color: T.txt, fontVariantNumeric: "tabular-nums" }}>
                        R/I {fmt(r.ri, 1)}
                      </span>
                    )}
                  </div>
                  {m.motivo && (
                    <div style={{ fontSize: 12.5, color: T.txt, marginTop: 4 }}>Motivo: {m.motivo}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Uma ressalva só, fora dos painéis, e só quando há razão na tela: é
          sobre o número, e ressalva sem número acima dela é ruído. */}
      {mostraRessalva && (
        <p data-testid="rec-ressalva" style={{ ...textoMenor, marginTop: 0 }}>
          O aplicativo não classifica este resultado, e não sugere PEEP a partir dele. O valor que
          circula como ponto de corte é a mediana da coorte de derivação (n = 45), usada ali para
          dividir a análise em dois grupos, e não limiar validado contra desfecho: o erro da medida é
          da mesma ordem da distância entre os cortes que a literatura propõe, e a validação mais
          recente contra tomografia tem piso de intervalo de confiança encostando no acaso. Quem lê a
          razão, com o paciente à frente, é você.
        </p>
      )}

      <div data-testid="rec-fonte">
        <SourceFooter sourceKeys={["recrutabilidade"]} />
      </div>
    </div>
  );
}

/** Desfecho por extenso: rótulo, data e o que ele significa. */
function BlocoDesfecho({ m }: { m: RecruitmentManeuver }) {
  const d = DESFECHO[m.desfecho as ManobraDesfecho] ?? DESFECHO_DESCONHECIDO;
  return (
    <div data-testid="rec-desfecho" style={caixa(d.cor)}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: d.cor }}>{d.rotulo}</span>
        <span style={{ fontSize: 12, color: T.dim }}>{quando(m.realizada_em)}</span>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>{d.efeito}</p>
      {m.motivo && (
        <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt }}>Motivo: {m.motivo}</p>
      )}
    </div>
  );
}

/** Os oito valores como foram gravados. Em branco vira "não registrado". */
function ValoresRegistrados({ m }: { m: RecruitmentManeuver }) {
  const simNao = (v: boolean | null) => (v == null ? "não respondido" : v ? "sim" : "não");
  const valor = (v: number | null, unidade: string) =>
    v == null ? "não registrado" : `${fmt(v, 0)} ${unidade}`;
  const linhas: { rot: string; val: string }[] = [
    { rot: "Paciente passivo", val: simNao(m.passivo) },
    { rot: "Fechamento de via aérea", val: simNao(m.fechamento_via_aerea) },
    ...(m.fechamento_via_aerea === true
      ? [{ rot: "Pressão de abertura", val: valor(m.pressao_abertura, "cmH₂O") }]
      : []),
    { rot: "PEEP alta", val: valor(m.peep_alta, "cmH₂O") },
    { rot: "PEEP baixa", val: valor(m.peep_baixa, "cmH₂O") },
    { rot: "Volume expirado extra", val: valor(m.volume_expirado_extra, "mL") },
    { rot: "Platô em PEEP baixa", val: valor(m.pplat_baixa, "cmH₂O") },
    { rot: "Volume corrente em PEEP baixa", val: valor(m.vc_baixa, "mL") },
  ];
  return (
    <div data-testid="rec-valores" style={{ display: "grid", gap: 4 }}>
      {linhas.map((l) => (
        <div key={l.rot} style={{ display: "flex", gap: 8, fontSize: 12.5, color: T.dim }}>
          <span style={{ flex: 1 }}>{l.rot}</span>
          <span style={{ color: T.txt, fontVariantNumeric: "tabular-nums" }}>{l.val}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * O que impede a conta, dito pelo nome. Vale a armadilha nº 5 do projeto:
 * ausência de dado não é resultado, e a tela precisa dizer qual dado falta em
 * vez de mostrar razão nenhuma sem explicação.
 */
function faltantes(m: RecruitmentManeuver): string[] {
  const fs: string[] = [];
  if (m.passivo !== true) fs.push("confirmação de paciente passivo");
  if (typeof m.fechamento_via_aerea !== "boolean") fs.push("resposta sobre fechamento de via aérea");
  if (m.fechamento_via_aerea === true && m.pressao_abertura == null) fs.push("pressão de abertura");
  if (m.peep_alta == null) fs.push("PEEP alta");
  if (m.fechamento_via_aerea === false && m.peep_baixa == null) fs.push("PEEP baixa");
  if (m.volume_expirado_extra == null) fs.push("volume expirado extra");
  if (m.pplat_baixa == null) fs.push("platô em PEEP baixa");
  if (m.vc_baixa == null) fs.push("volume corrente em PEEP baixa");
  return fs.length > 0 ? fs : ["medidas coerentes entre si"];
}
