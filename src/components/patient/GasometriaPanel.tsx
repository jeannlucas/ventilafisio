import { Panel } from "../ui";
import { SourceFooter } from "../SourceFooter";
import {
  interpretar,
  ALBUMINA_REFERENCIA,
  type DisturbioPrimario,
  type Temporalidade,
} from "../../lib/gasometria";
import { T, fmt } from "../../lib/theme";
import type { DailyEvolution } from "../../types";

/**
 * Painel de gasometria interpretada.
 *
 * Quem pensa é `lib/gasometria.ts`: este arquivo chama `interpretar` UMA vez e
 * desenha o que voltou. Não há aqui limiar, fórmula nem classificação — se um
 * número não vem do resultado, ele não aparece na tela.
 */

type Rotulo = { rotulo: string; explicacao: string; cor: string };

/**
 * Nome por extenso de cada distúrbio.
 *
 * `indeterminado` NÃO é `sem_disturbio`, e os dois nunca podem parecer a mesma
 * coisa na tela. "Sem distúrbio" é o paciente sem problema ácido-base;
 * "indeterminado" é gasometria que não fecha — o pH diz uma coisa e os outros
 * dois parâmetros não a sustentam. Pintar isso de verde tranquilizador é
 * exatamente o defeito que a armadilha nº 5 do CLAUDE.md registra.
 */
const DISTURBIO: Record<DisturbioPrimario, Rotulo> = {
  acidose_respiratoria: {
    rotulo: "Acidose respiratória",
    explicacao: "PaCO₂ retida, com o pH pendendo para o lado ácido.",
    cor: T.warn,
  },
  alcalose_respiratoria: {
    rotulo: "Alcalose respiratória",
    explicacao: "PaCO₂ baixa, com o pH pendendo para o lado alcalino.",
    cor: T.warn,
  },
  acidose_metabolica: {
    rotulo: "Acidose metabólica",
    explicacao: "HCO₃⁻ baixo, com o pH pendendo para o lado ácido.",
    cor: T.warn,
  },
  alcalose_metabolica: {
    rotulo: "Alcalose metabólica",
    explicacao: "HCO₃⁻ alto, com o pH pendendo para o lado alcalino.",
    cor: T.warn,
  },
  acidose_mista: {
    rotulo: "Acidose mista",
    explicacao:
      "PaCO₂ alta e HCO₃⁻ baixo empurram para o mesmo lado: nenhum dos dois está compensando o outro, os dois são causa.",
    cor: T.danger,
  },
  alcalose_mista: {
    rotulo: "Alcalose mista",
    explicacao:
      "PaCO₂ baixa e HCO₃⁻ alto empurram para o mesmo lado: nenhum dos dois está compensando o outro, os dois são causa.",
    cor: T.danger,
  },
  sem_disturbio: {
    rotulo: "Sem distúrbio ácido-base",
    explicacao: "pH, PaCO₂ e HCO₃⁻ dentro da faixa de referência.",
    cor: T.ok,
  },
  indeterminado: {
    rotulo: "Os números não fecham",
    explicacao:
      "O pH está fora da faixa, mas PaCO₂ e HCO₃⁻ estão dentro dela. Isto não é ausência de problema: é desacordo entre os valores. Confira a coleta e a amostra antes de decidir qualquer coisa.",
    cor: T.warn,
  },
};

/** Valor fora do domínio conhecido: avisa, em vez de renderizar `undefined`. */
const DESCONHECIDO: Rotulo = {
  rotulo: "Distúrbio não reconhecido",
  explicacao:
    "O app recebeu uma classificação que esta tela não sabe nomear. Não interprete por aqui.",
  cor: T.warn,
};

/**
 * Aguda ou crônica é distinção TEMPORAL e depende da história do paciente, que
 * o app não tem. Por isso todo texto começa em "Compatível com", nunca em "É".
 */
const TEMPORALIDADE: Record<Temporalidade, string> = {
  aguda:
    "Compatível com quadro agudo: o bicarbonato ainda não subiu o que subiria numa retenção de longa data.",
  cronica:
    "Compatível com quadro crônico: o bicarbonato acompanha o padrão de uma retenção de longa data.",
  indeterminada:
    "Compatível com quadro agudo ou crônico: o bicarbonato medido não se aproxima o bastante de nenhum dos dois padrões, e a gasometria isolada não separa os dois.",
};

const rotuloAviso = { fontSize: 11, color: T.dim, letterSpacing: 0.3, margin: "0 0 6px" } as const;

const caixa = (cor: string) => ({
  padding: "10px 14px",
  borderRadius: 10,
  background: T.panel2,
  border: `1px solid ${T.line}`,
  borderLeft: `4px solid ${cor}`,
});

export function GasometriaPanel({ ev }: { ev: DailyEvolution }) {
  const r = interpretar({
    ph: ev.ph,
    paco2: ev.paco2,
    hco3: ev.hco3,
    be: ev.be,
    na: ev.na,
    cl: ev.cl,
    albumina: ev.albumina,
  });

  // Sem os três parâmetros não há interpretação nenhuma, e a tela diz isso em
  // vez de mostrar meia leitura. Nenhum testid de conteúdo é renderizado aqui.
  if (!r) {
    return (
      <Panel title="Gasometria interpretada" sub="Distúrbio ácido-base e conduta sugerida">
        <p data-testid="gaso-incompleto" style={{ margin: 0, fontSize: 13, color: T.dim, lineHeight: 1.6 }}>
          Faltam dados para interpretar. O app precisa de pH, PaCO₂ e HCO₃⁻ juntos: com dois
          deles não dá para nomear o distúrbio, e chutar seria pior do que não responder.
        </p>
      </Panel>
    );
  }

  const d = DISTURBIO[r.disturbio] ?? DESCONHECIDO;
  const ag = r.anionGap;

  return (
    <Panel
      title="Gasometria interpretada"
      sub="Distúrbio ácido-base e conduta sugerida"
      accent={d.cor}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div data-testid="gaso-disturbio" style={caixa(d.cor)}>
          <div style={{ fontSize: 15, fontWeight: 700, color: d.cor }}>{d.rotulo}</div>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
            {d.explicacao}
          </p>
        </div>

        {r.temporalidade && (
          <div data-testid="gaso-temporalidade" style={caixa(T.dim)}>
            <div style={rotuloAviso}>TEMPORALIDADE</div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
              {TEMPORALIDADE[r.temporalidade]}
            </p>
            {/* Leitura auxiliar, em texto secundário: a regra do pH por 10 mmHg
                é convenção de livro-texto sem estudo primário rastreável, e
                aqui não decide nada. Nenhum número dela aparece — o módulo não
                devolve nenhum, e inventá-lo seria trazer limiar para dentro do
                componente. */}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
              Leitura auxiliar: a regra do pH por 10 mmHg de PaCO₂ é convenção de livro-texto,
              sem estudo primário rastreável. Ela não decide esta leitura — quem separa agudo de
              crônico aqui é o bicarbonato.
            </p>
          </div>
        )}

        {r.hipercapniaCronica && (
          <div data-testid="gaso-hipercapnia-cronica" style={caixa(T.purple)}>
            <div style={rotuloAviso}>HIPERCAPNIA DE LONGA DATA</div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
              Compatível com hipercapnia crônica pelo critério da BTS. É critério sensível: marca
              mais gente do que confirma, e a história do paciente é que decide.
            </p>
          </div>
        )}

        {/* Só existe na acidose metabólica. Na alcalose metabólica o app não dá
            número, e isso é decisão do mentor — ver `gaso-alcalose-aviso`. */}
        {r.compensacao && (
          <div data-testid="gaso-compensacao" style={caixa(r.compensacao.adequada ? T.ok : T.warn)}>
            <div style={rotuloAviso}>COMPENSAÇÃO RESPIRATÓRIA ESPERADA (WINTERS)</div>
            <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.7 }}>
              PaCO₂ esperada{" "}
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(r.compensacao.esperada, 1)}
              </strong>{" "}
              ± {fmt(r.compensacao.margem, 0)} mmHg · medida{" "}
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(r.compensacao.medida, 1)}
              </strong>{" "}
              mmHg
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12.5,
                fontWeight: 700,
                color: r.compensacao.adequada ? T.ok : T.warn,
              }}
            >
              {r.compensacao.adequada
                ? "Compensação dentro do previsto para uma acidose metabólica simples."
                : "Compensação fora do previsto: sugere um segundo distúrbio associado."}
            </p>
          </div>
        )}

        {r.disturbio === "alcalose_metabolica" && (
          <div data-testid="gaso-alcalose-aviso" style={caixa(T.dim)}>
            <div style={rotuloAviso}>COMPENSAÇÃO RESPIRATÓRIA</div>
            <p style={{ margin: 0, fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
              Espera-se hipoventilação, com retenção de PaCO₂. O app não dá o número esperado:
              a previsão quantitativa neste distúrbio é pouco confiável, e um valor exibido aqui
              teria mais precisão aparente do que a literatura sustenta.
            </p>
          </div>
        )}

        {ag && (
          <div data-testid="gaso-anion-gap" style={caixa(T.accent)}>
            <div style={rotuloAviso}>ÂNION GAP</div>
            <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.7 }}>
              Bruto{" "}
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(ag.bruto, 1)}</strong>{" "}
              mmol/L
              {ag.corrigido != null && ag.albuminaUsada != null && (
                <>
                  {" · corrigido para albumina "}
                  {fmt(ag.albuminaUsada, 1)} g/dL:{" "}
                  <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(ag.corrigido, 1)}
                  </strong>{" "}
                  mmol/L
                </>
              )}
            </div>
            {/* A palavra "corrigido" fica confinada ao ramo acima: sem albumina
                não há valor ajustado, e nomear a ausência já sugeriria um
                número que não existe. */}
            {ag.corrigido == null && (
              <p style={{ margin: "4px 0 0", fontSize: 12, color: T.warn, lineHeight: 1.5 }}>
                Sem albumina registrada. Hipoalbuminemia derruba o gap calculado e esconde
                acidose: registre a albumina para que o ajuste apareça.
              </p>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: T.dim, lineHeight: 1.5 }}>
              O app não afirma faixa de normalidade: ela depende do analisador, e as fontes
              divergem. Confira a faixa do laboratório do seu serviço. O ajuste pela albumina usa
              a referência de {fmt(ALBUMINA_REFERENCIA, 1)} g/dL.
            </p>
          </div>
        )}

        {r.condutas.length > 0 && (
          <div data-testid="gaso-condutas">
            <div style={rotuloAviso}>CONDUTA SUGERIDA</div>
            <div style={{ display: "grid", gap: 6 }}>
              {r.condutas.map((c) => {
                const medica = c.alcada === "medica";
                return (
                  <div key={c.texto} style={caixa(medica ? T.danger : T.accent)}>
                    {/* Alçada médica sai visualmente distinta e sempre dizendo
                        de quem é a decisão. Nenhuma conduta carrega dose: o
                        tipo `Conduta` não tem onde escrever uma. */}
                    {medica && (
                      <div
                        data-testid="gaso-selo-medica"
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          color: T.danger,
                          marginBottom: 4,
                        }}
                      >
                        ALÇADA MÉDICA — QUEM DECIDE É A EQUIPE MÉDICA
                      </div>
                    )}
                    <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>{c.texto}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* As chaves vêm do resultado, nunca de lista escrita à mão: rodapé
          escrito à mão já citou três vezes fonte que não cobria o painel. */}
      <div data-testid="gaso-fonte">
        <SourceFooter sourceKeys={r.sourceKeys} />
      </div>
    </Panel>
  );
}
