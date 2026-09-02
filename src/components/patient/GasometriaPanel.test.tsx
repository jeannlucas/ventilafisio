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

  it("acidose metabólica mostra a PaCO₂ esperada de Winters", () => {
    renderPanel(ev({ ph: 7.25, paco2: 26, hco3: 12 }));
    expect(screen.getByTestId("gaso-compensacao")).toHaveTextContent("26");
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

  it("conduta de alçada médica avisa de quem é a decisão", () => {
    renderPanel(ev({ ph: 7.15, paco2: 26, hco3: 10 }));
    expect(screen.getByTestId("gaso-condutas")).toHaveTextContent(/equipe médica/i);
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
    expect(screen.getByTestId("gaso-fonte")).not.toHaveTextContent(/Austin, 2010/);
  });

  // ----------------------------------------------------------------
  // Testes acrescentados: o do brief para a alçada médica passa mesmo sem
  // selo nenhum, porque o TEXTO da conduta de bicarbonato já contém "equipe
  // médica". Os dois abaixo separam o selo do texto, e falham se ele sumir.
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
});
