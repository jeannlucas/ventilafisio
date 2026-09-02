import { Panel } from "../ui";
import { SourceFooter } from "../SourceFooter";
import {
  classificarDrive,
  estimarEsforco,
  FAIXA_P01,
  type Esforco,
  type FaixaDrive,
  type FaixaEsforco,
} from "../../lib/mecanica";
import type { SourceKey } from "../../lib/references";
import { T, fmt } from "../../lib/theme";
import type { DailyEvolution } from "../../types";

/**
 * Painel de drive respiratório e esforço inspiratório.
 *
 * Quem pensa é `lib/mecanica.ts`: aqui se chama `classificarDrive` e
 * `estimarEsforco` e se desenha o que voltou. Não há neste arquivo limiar,
 * coeficiente nem classificação — a única faixa impressa é `FAIXA_P01`, lida
 * do módulo, nunca digitada.
 */

type Rotulo = { rotulo: string; explicacao: string; cor: string };

/**
 * Leitura por extenso de cada faixa de P0.1.
 *
 * `baixo` inclui o P0.1 zero, e o texto precisa dizer o que zero significa:
 * ausência de drive é o achado mais grave deste campo, e é justamente o valor
 * que um painel descuidado confunde com campo vazio (armadilha nº 5 do
 * projeto).
 */
const DRIVE: Record<FaixaDrive, Rotulo> = {
  baixo: {
    rotulo: "Drive baixo",
    explicacao:
      "P0.1 aquém do piso da faixa usada aqui. No extremo, P0.1 zero é ausência de drive: o paciente não está gerando comando inspiratório, e sedação, hiperventilação induzida pelo ventilador e lesão neurológica entram na conversa.",
    cor: T.warn,
  },
  adequado: {
    rotulo: "Drive adequado",
    explicacao:
      "P0.1 dentro da faixa usada aqui. Segue valendo o que se vê à beira do leito: um número dentro da faixa não descarta assincronia nem desconforto.",
    cor: T.ok,
  },
  elevado: {
    rotulo: "Drive elevado",
    explicacao:
      "P0.1 além do teto da faixa usada aqui, o que sugere comando inspiratório intenso. Dor, febre, acidose, ansiedade e assistência insuficiente do ventilador são causas frequentes.",
    cor: T.danger,
  },
};

/** Faixa fora do domínio conhecido: avisa, em vez de renderizar `undefined`. */
const DRIVE_DESCONHECIDO: Rotulo = {
  rotulo: "Leitura de drive não reconhecida",
  explicacao:
    "O app recebeu uma classificação que esta tela não sabe nomear. Não interprete por aqui.",
  cor: T.warn,
};

/** Leitura por extenso de cada faixa de Pmus estimado. */
const ESFORCO: Record<FaixaEsforco, Rotulo> = {
  muito_baixo: {
    rotulo: "Esforço muito baixo",
    explicacao:
      "Pmus estimado aquém do que o mentor considera desejável em ventilação assistida. Sobreassistência sustentada mantém o diafragma inativo e favorece atrofia.",
    cor: T.warn,
  },
  adequado: {
    rotulo: "Esforço adequado",
    explicacao:
      "Pmus estimado dentro da faixa que o mentor considera desejável: trabalho suficiente para manter o diafragma ativo, sem sinal de sobrecarga.",
    cor: T.ok,
  },
  aumentado: {
    rotulo: "Esforço aumentado",
    explicacao:
      "Pmus estimado além da faixa desejável. Vale revisar assistência, sedação, dor e as causas de demanda ventilatória antes de aceitar o valor como estável.",
    cor: T.warn,
  },
  elevado: {
    rotulo: "Esforço elevado",
    explicacao:
      "Pmus estimado bem além da faixa desejável. É o cenário em que a preocupação com sobrecarga muscular e com lesão pulmonar induzida pelo próprio paciente pesa mais na decisão.",
    cor: T.danger,
  },
};

/** Faixa fora do domínio conhecido: avisa, em vez de renderizar `undefined`. */
const ESFORCO_DESCONHECIDO: Rotulo = {
  rotulo: "Leitura de esforço não reconhecida",
  explicacao:
    "O app recebeu uma classificação que esta tela não sabe nomear. Não interprete por aqui.",
  cor: T.warn,
};

const rotuloAviso = { fontSize: 11, color: T.dim, letterSpacing: 0.3, margin: "0 0 6px" } as const;

const caixa = (cor: string) => ({
  padding: "10px 14px",
  borderRadius: 10,
  background: T.panel2,
  border: `1px solid ${T.line}`,
  borderLeft: `4px solid ${cor}`,
});

const textoRessalva = {
  margin: "6px 0 0",
  fontSize: 11,
  color: T.dim,
  lineHeight: 1.5,
} as const;

export function MecanicaPanel({ ev }: { ev: DailyEvolution }) {
  const drive = classificarDrive(ev.p01);
  const esforco = estimarEsforco(ev.pocc, ev.ppico, ev.peep);

  // Sem P0.1 e sem ΔPocc não há nada a interpretar, e a tela diz quais medidas
  // faltam em vez de mostrar painel vazio. Nenhum testid de conteúdo, e nenhum
  // rodapé: fonte sem afirmação acima dela é ruído.
  if (!drive && !esforco) {
    return (
      <Panel title="Mecânica: drive e esforço" sub="P0.1 e oclusão expiratória">
        <p
          data-testid="mec-incompleto"
          style={{ margin: 0, fontSize: 13, color: T.dim, lineHeight: 1.6 }}
        >
          Faltam medidas para interpretar. O drive precisa do P0.1; o esforço inspiratório precisa
          do ΔPocc, medido na oclusão expiratória. Registre pelo menos um dos dois.
        </p>
      </Panel>
    );
  }

  const d = drive ? (DRIVE[drive] ?? DRIVE_DESCONHECIDO) : null;
  const e = esforco ? (ESFORCO[esforco.faixa] ?? ESFORCO_DESCONHECIDO) : null;

  return (
    <Panel
      title="Mecânica: drive e esforço"
      sub="P0.1 e oclusão expiratória"
      accent={d?.cor ?? e?.cor}
    >
      <div style={{ display: "grid", gap: 12 }}>
        {d && (
          <>
            <div data-testid="mec-drive" style={caixa(d.cor)}>
              <div style={rotuloAviso}>DRIVE RESPIRATÓRIO (P0.1)</div>
              <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.7 }}>
                P0.1{" "}
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(ev.p01, 1)}</strong>{" "}
                cmH₂O · faixa usada {fmt(FAIXA_P01.min, 1)} a {fmt(FAIXA_P01.max, 1)} cmH₂O
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: d.cor, marginTop: 4 }}>
                {d.rotulo}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
                {d.explicacao}
              </p>
            </div>

            {/* Irmão, e não filho, do bloco acima: o texto contém a palavra
                "esforço", e dentro de `mec-drive` ele passaria a satisfazer
                sozinho asserções que existem para conferir a leitura do drive. */}
            <p data-testid="mec-drive-ressalva" style={textoRessalva}>
              A sensibilidade e a especificidade do corte superior do P0.1 foram medidas contra
              esforço inspiratório aferido por manometria esofágica, e não contra desfecho clínico.
              O número prevê o esforço do paciente, não o que vai acontecer com ele. O piso da faixa
              é prática do mentor.
            </p>
          </>
        )}

        {esforco && e && (
          <>
            <div data-testid="mec-esforco" style={caixa(e.cor)}>
              <div style={rotuloAviso}>ESFORÇO INSPIRATÓRIO (Pmus ESTIMADO)</div>
              <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.7 }}>
                Pmus estimado{" "}
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                  {fmt(esforco.pmus, 1)}
                </strong>{" "}
                cmH₂O
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: e.cor, marginTop: 4 }}>
                {e.rotulo}
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.txt, lineHeight: 1.6 }}>
                {e.explicacao}
              </p>
            </div>

            {/* Também irmão, e pela mesma razão: a frase abaixo carrega o
                número 15, e dentro de `mec-esforco` ela satisfaria sozinha a
                asserção que confere o Pmus calculado — o teste passaria com
                qualquer conta errada. Aqui fora, quem prova o 15 na tela é o
                valor, não a cópia. */}
            <p data-testid="mec-esforco-ressalva" style={textoRessalva}>
              O Pmus não é medido: é estimado a partir do ΔPocc pela conversão de Bertoni, validada
              em coorte pequena. As faixas de leitura são prática do mentor.
              {esforco.faixa === "elevado" &&
                " Nesta faixa, a preocupação com sobrecarga muscular e com P-SILI fica mais forte acima de 15 cmH₂O; isso é ênfase dentro da mesma faixa, não uma fronteira a mais."}
            </p>

            {/* SEM FAIXA, SEM COR DE STATUS, SEM ADJETIVO: o mentor não foi
                perguntado sobre limiar de ΔP_L,dyn, e a literatura ter algum
                não autoriza este app a exibi-lo. É decisão de não exibir. */}
            {esforco.dpLDinamica != null ? (
              <div data-testid="mec-dpl" style={caixa(T.dim)}>
                <div style={rotuloAviso}>ΔP_L,dyn ESTIMADA</div>
                <div style={{ fontSize: 12.5, color: T.txt, lineHeight: 1.7 }}>
                  <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(esforco.dpLDinamica, 1)}
                  </strong>{" "}
                  cmH₂O
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: T.dim, lineHeight: 1.5 }}>
                  Estimativa de estresse pulmonar derivada do ΔPocc, do pico e da PEEP. Não é medida
                  e o app não a classifica: não há faixa de leitura aprovada pelo mentor para este
                  número, e inventar uma diria mais do que a fonte sustenta.
                </p>
              </div>
            ) : (
              <p data-testid="mec-dpl-ausente" style={textoRessalva}>
                Sem P_pico e PEEP registrados nesta evolução, o app não estima a ΔP_L,dyn.
              </p>
            )}
          </>
        )}

        {!esforco && (
          <p data-testid="mec-esforco-ausente" style={textoRessalva}>
            Sem ΔPocc registrado, não há estimativa de esforço inspiratório nesta evolução.
          </p>
        )}

        {!drive && (
          <p data-testid="mec-drive-ausente" style={textoRessalva}>
            Sem P0.1 registrado, não há leitura de drive nesta evolução.
          </p>
        )}
      </div>

      {/* As chaves saem do que foi de fato calculado, nunca de lista escrita à
          mão: rodapé fixo já citou três vezes fonte que não cobria o painel. */}
      <div data-testid="mec-fonte">
        <SourceFooter sourceKeys={chaves(drive, esforco)} />
      </div>
    </Panel>
  );
}

/** Uma chave por leitura exibida: sem P0.1 não há "drive", sem ΔPocc não há "esforco". */
function chaves(drive: FaixaDrive | null, esforco: Esforco | null): SourceKey[] {
  const ks: SourceKey[] = [];
  if (drive) ks.push("drive");
  if (esforco) ks.push("esforco");
  return ks;
}
