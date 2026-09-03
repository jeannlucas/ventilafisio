import { T, fmt } from "../../lib/theme";
import { Panel, HeroCard, SugBox } from "../ui";
import { Patient, DailyEvolution } from "../../types";
import * as C from "../../lib/clinical";
import { sugerirVc, sugerirPeepFio2, sugerirVentilacao, alvoPaco2 } from "../../lib/alvos";
import type { Alvo, AlvoPeepFio2, Modulacao } from "../../lib/alvos";
import { derivarPerfil } from "../../lib/perfil";
import { SourceFooter } from "../SourceFooter";
import { LinhaModulacao } from "./LinhaModulacao";
import { LinhaModulacaoSimples } from "./LinhaModulacaoSimples";

/**
 * Como a PEEP sugerida aparece na caixa: número, faixa ou traço.
 *
 * Os três casos vêm do motor, não daqui. `peep` é null quando o aplicativo
 * NÃO TEM número a dar (DPOC sem auto-PEEP medido, onde a tabela do ARDSnet
 * não se aplica), e `faixaPeep` traz a faixa do DPOC. O traço sai de
 * `fmt(null)`, e não de interpolar o valor: `${null}` escreveria a palavra
 * "null" na tela de um aplicativo clínico.
 *
 * Nenhum número clínico mora aqui — nem o teto da asma, nem a fração do
 * auto-PEEP. O `sub` remete à linha de modulação, que é onde o motor escreve
 * o porquê, com a fonte junto.
 *
 * Exportada porque o AdmissionCard exibe o mesmo alvo: dois lugares
 * formatando "número, faixa ou traço" por conta própria divergem, e o que
 * divergiria é justamente o caso em que não há número.
 */
export function textoPeep(alvo: Alvo<AlvoPeepFio2>): { big: string; sub: string } {
  const { peep, faixaPeep, presetAdmissao } = alvo.valor;
  if (peep != null) {
    // "tabela ARDSnet" só quando o número VEIO da tabela. O preset de admissão
    // (sem gasometria e sem oximetria) não vem: rotulá-lo assim afirmava a
    // tabela justamente onde o motor não a consultou, e no obstrutivo afirmava
    // a tabela que a fase declara não se aplicar.
    const sub = presetAdmissao
      ? alvo.modulacoes.length > 0
        ? "preset inicial · ver abaixo"
        : "preset inicial · titular pela gasometria/SpO₂"
      : alvo.modulacoes.length > 0
        ? "limitada pela patologia · ver abaixo"
        : "tabela ARDSnet";
    return { big: `${fmt(peep, 0)} cmH₂O`, sub };
  }
  if (faixaPeep != null) {
    return {
      big: `${fmt(faixaPeep.min)}–${fmt(faixaPeep.max)} cmH₂O`,
      sub: "fração do auto-PEEP medido · ver abaixo",
    };
  }
  return { big: `${fmt(null)} cmH₂O`, sub: "sem número · ver a modulação abaixo" };
}

/**
 * O aviso do obeso sobre recrutamento.
 *
 * É a RECUSA de um alvo, não um alvo: o ensaio que testou recrutamento com
 * PEEP alta no obeso é intraoperatório e negativo, e não sustenta piso de
 * PEEP nenhum — por isso o texto não tem número. Não vem de `alvos.ts`
 * porque não modula valor nenhum, e é montado como `Modulacao` para que
 * motivo e fonte andem no mesmo objeto: o rodapé cita a chave desta mesma
 * lista, então não há como o aviso aparecer sem a fonte, nem a fonte sem o
 * aviso.
 */
const AVISO_OBESO: Modulacao = {
  motivo:
    "Obesidade: recrutamento alveolar de rotina com PEEP alta não está autorizado. O ensaio que testou essa estratégia no obeso não achou benefício, e a evidência não sustenta piso de PEEP — titule a PEEP pela resposta do paciente.",
  sourceKey: "obesidadeVentilacao",
};

// ---------- Dashboard 4 indicadores + sugestão ----------
export function Dashboard({ patient, ev }: { patient: Patient; ev: DailyEvolution }) {
  const perfil = derivarPerfil(patient);
  const pbwVal = perfil.pbw;
  const obese = perfil.obeso;

  const dp = C.drivingPressure(ev.pplat, ev.peep);
  const pf = C.pfRatio(ev.pao2, ev.fio2);
  const vcKg = C.vcPerKg(ev.vc, pbwVal);
  const mp = C.mechanicalPower(ev.fr, ev.vc, ev.ppico, dp);

  const sVc = sugerirVc(perfil);
  const sPeep = sugerirPeepFio2(pf, ev.spo2, perfil, ev.auto_peep);
  // sVc nunca é null (sugerirVc devolve Alvo<AlvoVc> sempre) e perfil.pbw vem
  // de pbwOrEstimate, que sempre devolve um número finito — então
  // sugerirVentilacao nunca cai no ramo null nesta chamada. Assertion
  // documentada, não suposição: sem ela sobrava um `sVc ?` morto.
  const sVent = sugerirVentilacao(pbwVal, sVc.valor.target, perfil)!;
  // null sem lesão cerebral aguda: o aplicativo não sugere PaCO₂ em nenhum
  // outro caso, e o bloco inteiro só existe quando este alvo existe.
  const sPaco2 = alvoPaco2(perfil);
  // Lista, e não booleano, para o rodapé citar a fonte a partir do MESMO
  // valor que desenha o aviso.
  const avisoObeso: Modulacao[] = obese ? [AVISO_OBESO] : [];
  const peepTexto = textoPeep(sPeep);

  // Conteúdo de apoio à decisão exibido quando o indicador sai da faixa (item 2).
  // A validar pela equipe; não altera nenhuma fórmula nem os limites de classify.
  // Lida do alvo em vez de recomputada de `obese`: hoje as duas contas
  // concordam, mas se uma fase futura somar outra modulação à faixa de VC,
  // `sugerirVc` já devolve a faixa deslocada e este texto acompanha sem
  // precisar lembrar de um segundo lugar (item 4 da onda de fechamento).
  const vcLow = sVc.valor.lowKg;
  const vcHigh = sVc.valor.highKg;
  const vcTooLow = vcKg != null && vcKg < vcLow;
  const sug = {
    dp: {
      ideal: "< 13 cmH₂O",
      actions: [
        "Reduzir o VC rumo a 6 ml/kg de peso predito (PBW)",
        "Otimizar a PEEP (se a complacência melhora, a Driving Pressure cai)",
        "Reavaliar a Pressão de Platô",
      ],
    },
    pplat: {
      ideal: "< 30 cmH₂O",
      actions: [
        "Reduzir o VC em passos de 1 ml/kg",
        "Reavaliar a PEEP",
        "Tratar fatores que reduzem a complacência",
      ],
    },
    vc: {
      ideal: `faixa ${vcLow}–${vcHigh} ml/kg sobre o peso predito`,
      actions: vcTooLow
        ? ["Avaliar aumento do VC rumo à faixa", "Checar hipoventilação"]
        : [
            "Reduzir o VC rumo à faixa",
            "Confirmar o cálculo sobre o peso predito (PBW)",
            "Vigiar a Pressão de Platô",
          ],
    },
    pf: {
      ideal: "≥ 300",
      actions: [
        "Aumentar a PEEP para recrutar (reavaliando o platô)",
        "Titular a FiO₂ pela SpO₂/PaO₂",
        "Considerar recrutamento e prona se P/F < 150",
        "Tratar a causa de base",
      ],
    },
  };

  const alerts: { s: "ok" | "warn" | "danger"; t: string }[] = [];
  if (vcKg != null && vcKg > 8) alerts.push({ s: "danger", t: `VC ${fmt(vcKg)} ml/kg acima de 8 — reduzir volume` });
  if (ev.pplat != null && ev.pplat >= 30) alerts.push({ s: "danger", t: `Pressão de platô ${fmt(ev.pplat, 0)} ≥ 30` });
  if (dp != null && dp > 15) alerts.push({ s: "danger", t: `Driving Pressure ${fmt(dp, 0)} > 15` });
  if (mp != null && mp >= 17) alerts.push({ s: "warn", t: `Mechanical Power ${fmt(mp)} J/min elevada` });

  // Painel único "Leitura do caso": alertas numéricos + correlações de
  // drogas/imagem, ordenados por severidade (danger > warn > info).
  const correlations = C.ventilationCorrelations(ev);
  const sevRank = { danger: 0, warn: 1, info: 2 } as const;
  const reading: { s: "danger" | "warn" | "info"; t: string }[] = [
    ...alerts.map((a) => ({ s: a.s as "danger" | "warn" | "info", t: a.t })),
    ...correlations.map((c) => ({ s: c.level as "warn" | "info", t: c.text })),
  ].sort((a, b) => sevRank[a.s] - sevRank[b.s]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
        <HeroCard label="DRIVING PRESSURE" value={fmt(dp, 0)} unit="cmH₂O" st={C.classify.dp(dp)} formula="Pplat − PEEP" suggestion={sug.dp} />
        <HeroCard label="PRESSÃO DE PLATÔ" value={fmt(ev.pplat, 0)} unit="cmH₂O" st={C.classify.pplat(ev.pplat)} formula="meta < 30" suggestion={sug.pplat} />
        <HeroCard label="VC / PESO PREDITO" value={fmt(vcKg)} unit="ml/kg" st={C.classify.vcKg(vcKg, obese)} formula={`meta ${vcLow}–${vcHigh}`} suggestion={sug.vc} />
        <HeroCard label="RELAÇÃO P/F" value={fmt(pf, 0)} unit="" st={C.classify.pf(pf)} formula="PaO₂ / FiO₂" suggestion={sug.pf} />
      </div>

      <SourceFooter sourceKeys={["dp", "pplat", "vcKg", "pf"]} />

      {reading.length > 0 && (
        <Panel title="Leitura do caso" sub="Alertas dos indicadores e correlações do quadro clínico com a ventilação">
          <div style={{ display: "grid", gap: 8 }}>
            {reading.map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: `${color(a.s === "info" ? "ok" : a.s)}14`, border: `1px solid ${color(a.s === "info" ? "ok" : a.s)}40`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: color(a.s === "info" ? "ok" : a.s), fontWeight: 600 }}>
                <span>{a.s === "danger" ? "⚠" : a.s === "warn" ? "⚠" : "ℹ"}</span>
                <span style={{ color: T.txt, fontWeight: 500 }}>{a.t}</span>
              </div>
            ))}
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: T.dim, fontStyle: "italic" }}>
              Apoio à decisão, não conduta automática.
            </p>
            <SourceFooter sourceKeys={["vcKg", "pplat", "dp", "mp"]} />
          </div>
        </Panel>
      )}

      <Panel title={`Sugestão inicial · ${patient.current_mode ?? ""}`} accent={T.accent}
        sub={`${obese ? `obeso (IMC ≥30): alvo ${vcLow}–${vcHigh} ml/kg sobre peso predito` : `alvo protetor ${vcLow}–${vcHigh} ml/kg`} · ponto de partida, ajuste pela resposta`}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <SugBox label="VOLUME CORRENTE" big={`${sVc.valor.target} mL`} sub={`faixa ${sVc.valor.low}–${sVc.valor.high} mL · 6kg=${sVc.valor.ml6} 8kg=${sVc.valor.ml8}`} />
          {/* PEEP e FiO₂ em caixas separadas: no DPOC sem auto-PEEP medido a
              PEEP não tem número e a FiO₂ tem. Juntas, ou a caixa afirmaria
              uma PEEP que o motor recusou dar, ou o app perderia a FiO₂
              sugerida só para não afirmá-la. */}
          <SugBox label="PEEP" big={peepTexto.big} sub={peepTexto.sub} testid="sug-peep" />
          <SugBox label="FiO₂" big={`${sPeep.valor.fio2}%`} sub="titular pela SpO₂/PaO₂" />
          <SugBox label="FREQUÊNCIA" big={`${sVent.valor.fr} /min`} sub="derivada do VC alvo" />
          <SugBox label="VOLUME-MINUTO" big={`${fmt(sVent.valor.veL)} L/min`} sub="~100 ml/kg PBW/min" />
        </div>
        <LinhaModulacaoSimples modulacoes={sPeep.modulacoes} testid="peep-modulacao" />
        <LinhaModulacaoSimples modulacoes={sVent.modulacoes} testid="ventilacao-modulacao" />
        <LinhaModulacao alvo={sVc} />
        {/* Junto da modulação de volume corrente, e não em bloco próprio: é a
            mesma patologia falando do mesmo paciente. Em elemento separado
            porque o que ele afirma é a AUSÊNCIA de número, e a asserção que
            garante isso precisa de um elemento sem os números da linha de
            cima. */}
        <LinhaModulacaoSimples modulacoes={avisoObeso} testid="obeso-recrutamento" />
        {sPaco2 && (
          <div style={{ marginTop: 12 }}>
            <div
              data-testid="alvo-paco2"
              style={{ fontSize: 13, color: T.txt, fontWeight: 600 }}
            >
              Alvo de PaCO₂: {sPaco2.valor.min} a {sPaco2.valor.max} mmHg
            </div>
            {/* A ressalva fica FORA do bloco acima, e não dentro: ela repete
                os mesmos números na prosa, e um teste que procurasse "35" no
                bloco passaria pela prosa mesmo que o alvo sumisse da tela. */}
            <LinhaModulacaoSimples modulacoes={sPaco2.modulacoes} testid="alvo-paco2-ressalva" />
          </div>
        )}
        <p style={{ margin: "12px 0 0", fontSize: 11, color: T.dim }}>
          A Pressão de Platô é o limite de segurança: se passar de 30 cmH₂O, reduza o VC mesmo dentro da faixa.
        </p>
        {/* Deriva do alvo em vez de listar "vcKg" à mão: uma modulação nova
            some do rodapé sem ninguém lembrar de atualizar este array (item 3
            da onda de fechamento — já foi a terceira vez que essa lacuna
            apareceu). SourceFooter já deduplica, então repetir uma chave
            citada em outro lugar do painel é inofensivo. */}
        <SourceFooter
          sourceKeys={[
            "vcTarget",
            "peepFio2",
            ...sVc.modulacoes.map((m) => m.sourceKey),
            ...sPeep.modulacoes.map((m) => m.sourceKey),
            ...sVent.modulacoes.map((m) => m.sourceKey),
            ...(sPaco2?.modulacoes ?? []).map((m) => m.sourceKey),
            ...avisoObeso.map((m) => m.sourceKey),
          ]}
        />
      </Panel>
    </div>
  );
}

const color = (s: "ok" | "warn" | "danger") => (s === "ok" ? T.ok : s === "warn" ? T.warn : T.danger);
