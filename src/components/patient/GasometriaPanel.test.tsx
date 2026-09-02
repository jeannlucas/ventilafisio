import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GasometriaPanel } from "./GasometriaPanel";
import type { DailyEvolution } from "../../types";

const ev = (over: Partial<DailyEvolution> = {}): DailyEvolution =>
  ({
    id: "e1", patient_id: "p1", owner_id: "u1", recorded_at: "2026-09-01T10:00:00Z",
    mode: null, fr: null, vc: null, peep: null, fio2: null, ppico: null, pplat: null,
    flow: null, ph: 7.4, pao2: null, paco2: 40, spo2: null, hco3: 24, be: 0,
    na: null, cl: null, albumina: null, pimax: null, peak_cough_flow: null,
    glasgow: null, rass: null, ims: null, mrc: {}, tre_result: null, hr: null,
    sbp: null, dbp: null, lactate: null, vasopressor: null, notes: null,
    imaging: {}, iv_meds: {}, feeding: {},
    ...over,
  }) as DailyEvolution;

// O painel termina em SourceFooter, que usa <Link>. Fora de um Router o
// react-router-dom lança, então todo render passa pelo MemoryRouter — mesma
// convenção de ScoresPanel.test.tsx e TrePanel.test.tsx. As asserções são as
// do brief, sem alteração.
const renderPanel = (e: DailyEvolution) =>
  render(
    <MemoryRouter>
      <GasometriaPanel ev={e} />
    </MemoryRouter>
  );

describe("GasometriaPanel", () => {
  it("sem os três parâmetros, avisa em vez de interpretar", () => {
    renderPanel(ev({ hco3: null }));
    expect(screen.queryByTestId("gaso-disturbio")).not.toBeInTheDocument();
    // A ausência sozinha não prova nada: apagar o parágrafo de aviso deixava
    // este teste verde, apesar do nome prometer que o app AVISA. A asserção
    // positiva abaixo é a metade que faltava, e cita quais valores o app pede.
    const aviso = screen.getByTestId("gaso-incompleto");
    expect(aviso).toHaveTextContent(/faltam dados/i);
    expect(aviso).toHaveTextContent(/pH/);
    expect(aviso).toHaveTextContent(/PaCO₂/);
    expect(aviso).toHaveTextContent(/HCO₃⁻/);
  });

  it("nomeia o distúrbio do retentor crônico", () => {
    renderPanel(ev({ ph: 7.38, paco2: 60, hco3: 34 }));
    expect(screen.getByTestId("gaso-disturbio")).toHaveTextContent(/acidose respiratória/i);
  });

  // "Compatível com", nunca "é": a distinção aguda x crônica é temporal e
  // depende da história do paciente, que o app não tem.
  it("diz compatível com, não afirma", () => {
    renderPanel(ev({ ph: 7.38, paco2: 60, hco3: 34 }));
    expect(screen.getByTestId("gaso-temporalidade")).toHaveTextContent(/compatível com/i);
  });

  // DECISÃO DO MENTOR: na alcalose metabólica não aparece número de PaCO₂
  // esperada. Este teste falha se alguém "consertar" a ausência.
  it("alcalose metabólica não mostra PaCO₂ esperada", () => {
    renderPanel(ev({ ph: 7.5, paco2: 45, hco3: 34 }));
    expect(screen.queryByTestId("gaso-compensacao")).not.toBeInTheDocument();
    expect(screen.getByTestId("gaso-alcalose-aviso")).toHaveTextContent(/pouco confiável/i);
  });

  // HCO₃⁻ 12 tem esperada de Winters 26; a medida é 34, valor distinto do
  // esperado. Assim o teste prova que o painel mostra os DOIS números — a
  // previsão e a medida — e não passaria se o componente só ecoasse a
  // entrada. Com 8 mmHg de desvio (margem é 2), a compensação não é mais
  // adequada, e a asserção de texto reflete esse estado.
  it("acidose metabólica mostra a PaCO₂ esperada de Winters e a medida", () => {
    renderPanel(ev({ ph: 7.25, paco2: 34, hco3: 12 }));
    const bloco = screen.getByTestId("gaso-compensacao");
    expect(bloco).toHaveTextContent("26");
    expect(bloco).toHaveTextContent("34");
    expect(bloco).toHaveTextContent(/fora do previsto/i);
  });

  it("mostra o ânion gap bruto e o corrigido", () => {
    renderPanel(ev({ na: 140, cl: 105, hco3: 20, albumina: 2 }));
    const ag = screen.getByTestId("gaso-anion-gap");
    expect(ag).toHaveTextContent("15");
    expect(ag).toHaveTextContent("20");
  });

  it("sem albumina não inventa valor corrigido", () => {
    renderPanel(ev({ na: 140, cl: 105, hco3: 20 }));
    expect(screen.getByTestId("gaso-anion-gap")).not.toHaveTextContent(/corrigido/i);
  });

  it("sem sódio e cloro não mostra ânion gap nenhum", () => {
    renderPanel(ev());
    expect(screen.queryByTestId("gaso-anion-gap")).not.toBeInTheDocument();
  });

  // O rodapé cita o parecer que sustenta o 5,0, e não só as publicações.
  it("cita as fontes do que exibe", () => {
    renderPanel(ev({ ph: 7.38, paco2: 60, hco3: 34 }));
    const fonte = screen.getByTestId("gaso-fonte");
    expect(fonte).toHaveTextContent(/Berend, 2014/);
    expect(fonte).toHaveTextContent(/Parecer clínico \(compensação crônica\), 2026/);
    expect(fonte).toHaveTextContent(/Austin, 2010/);
  });

  it("sem hipercapnia crônica não cita o DPOC", () => {
    renderPanel(ev({ ph: 7.25, paco2: 60, hco3: 26 }));
    const fonte = screen.getByTestId("gaso-fonte");
    // Positiva primeiro: o rodapé continua existindo e cita a fonte de
    // acidoBase (Berend, 2014), que está em TODA interpretação — sem ela, a
    // ausência de Austin abaixo seria satisfeita também por rodapé nenhum.
    expect(fonte).toHaveTextContent(/Berend, 2014/);
    expect(fonte).not.toHaveTextContent(/Austin, 2010/);
  });

  // Leitura auxiliar do pH por 10 mmHg: convenção de livro-texto sem estudo
  // primário, que não decide nada aqui. Os coeficientes (0,08 agudo e 0,03
  // crônico) são deliberadamente omitidos porque `lib/gasometria.ts` não os
  // devolve, e o componente não pode calcular número clínico por conta própria.
  it("leitura do pH por 10 mmHg não inventa coeficiente", () => {
    renderPanel(ev({ ph: 7.38, paco2: 60, hco3: 34 }));
    const bloco = screen.getByTestId("gaso-temporalidade");
    expect(bloco).toHaveTextContent(/convenção de livro-texto, sem estudo primário rastreável/i);
    // Guarda contra um commit futuro que "complete" a feature digitando os
    // coeficientes 0,08 (agudo) ou 0,03 (crônico) que o módulo não fornece.
    expect(bloco).not.toHaveTextContent(/0[.,]0[83]/);
  });

  // ----------------------------------------------------------------
  // O selo de alçada médica é asserido pelos dois testes abaixo, que separam o
  // SELO do texto da conduta. Havia aqui um terceiro teste que só procurava
  // "equipe médica" dentro de `gaso-condutas`: ele passava com o selo removido,
  // porque essa expressão vem do próprio texto que `lib/gasometria.ts` emite.
  // Foi apagado em 02/09/2026 — cobertura que não existia.
  // ----------------------------------------------------------------
  it("marca a conduta de alçada médica com selo próprio", () => {
    renderPanel(ev({ ph: 7.15, paco2: 26, hco3: 10 }));
    const selos = screen.getAllByTestId("gaso-selo-medica");
    expect(selos).toHaveLength(1);
    expect(selos[0]).toHaveTextContent(/quem decide é a equipe médica/i);
  });

  it("conduta de fisio não recebe o selo de alçada médica", () => {
    // Alcalose respiratória com pH acima de 7,20: só a conduta do fisio.
    renderPanel(ev({ ph: 7.55, paco2: 25, hco3: 22 }));
    expect(screen.getByTestId("gaso-condutas")).toHaveTextContent(/hiperventilação/i);
    expect(screen.queryByTestId("gaso-selo-medica")).not.toBeInTheDocument();
  });

  // Armadilha 5 do CLAUDE.md: ausência de dado não é resultado normal.
  // "indeterminado" é desacordo entre os números, não paciente sem problema.
  it("indeterminado não é apresentado como sem distúrbio", () => {
    renderPanel(ev({ ph: 7.3, paco2: 40, hco3: 24 }));
    const d = screen.getByTestId("gaso-disturbio");
    expect(d).toHaveTextContent(/não fecham|indetermina/i);
    expect(d).not.toHaveTextContent(/sem distúrbio/i);
  });

  // Alcalose metabólica de diurético ou de sonda nasogástrica, com PaCO₂ acima
  // de 45 por hipoventilação compensatória. Não é retentor crônico: nem o bloco
  // de hipercapnia de longa data nem o alvo restritivo de SpO₂ podem aparecer.
  it("gasometria alcalêmica não anuncia hipercapnia de longa data", () => {
    const { container } = renderPanel(ev({ ph: 7.48, paco2: 48, hco3: 35 }));
    // Positiva primeiro: o painel de fato interpretou esta gasometria, então as
    // ausências abaixo são ausência do bloco e do alvo, e não de painel nenhum.
    expect(screen.getByTestId("gaso-disturbio")).toHaveTextContent(/alcalose metabólica/i);
    expect(screen.queryByTestId("gaso-hipercapnia-cronica")).not.toBeInTheDocument();
    // Em lugar nenhum da tela: o alvo restritivo de SpO₂ não é para este
    // paciente. `container` cobre o painel inteiro, e não só o bloco de conduta,
    // que aqui nem chega a existir.
    expect(container).not.toHaveTextContent(/88 a 92/);
  });

  // Na alcalose respiratória o bicarbonato CAI: falar de retenção aqui
  // contradiz a própria aritmética que o módulo usou para datar o quadro.
  it("alcalose respiratória não fala de retenção na temporalidade", () => {
    renderPanel(ev({ ph: 7.52, paco2: 28, hco3: 22 }));
    const bloco = screen.getByTestId("gaso-temporalidade");
    expect(bloco).toHaveTextContent(/compatível com/i);
    expect(bloco).not.toHaveTextContent(/reten/i);
  });
});
