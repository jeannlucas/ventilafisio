import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard, textoPeep } from "./Dashboard";
import { PatientHeader } from "./PatientHeader";
import type { Patient, DailyEvolution } from "../../types";
import type { Alvo, AlvoPeepFio2 } from "../../lib/alvos";

// ---------- Fixtures ----------
// Paciente e evolução inventados (repositório público), sem nenhum dado real.
const PACIENTE: Patient = {
  id: "p-1",
  owner_id: "user-1",
  hospital_id: "h-1",
  name: "Paciente Teste",
  age: 60,
  sex: "M",
  diagnosis: "SDRA",
  comorbidities: [],
  intubation_date: null,
  airway: null,
  height_cm: 170,
  weight_kg: 70,
  ventilator_id: null,
  current_mode: "VCV",
  status: "active",
  discharge_reason: null,
  discharge_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// Sem alerta e sem correlação: dp=14 (não > 15), pplat=24 (< 30),
// vcKg ~4,5 (dentro da faixa 4–6), mp ~8,9 (< 17). Sem iv_meds e sem imaging,
// então `ventilationCorrelations` não devolve nada.
const EVOLUCAO_ESTAVEL: DailyEvolution = {
  id: "e-1",
  patient_id: "p-1",
  owner_id: "user-1",
  recorded_at: "2026-01-02T00:00:00Z",
  mode: "VCV",
  fr: 16,
  vc: 300,
  peep: 10,
  auto_peep: null,
  fio2: 30,
  ppico: 26,
  pplat: 24,
  flow: null,
  p01: null,
  pocc: null,
  ph: null,
  pao2: 90,
  paco2: null,
  spo2: 97,
  hco3: null,
  be: null,
  na: null,
  cl: null,
  albumina: null,
  pimax: null,
  peak_cough_flow: null,
  glasgow: null,
  rass: null,
  ims: null,
  mrc: {},
  tre_result: null,
  hr: null,
  sbp: null,
  dbp: null,
  lactate: null,
  vasopressor: null,
  notes: null,
  imaging: {},
  iv_meds: {},
  feeding: {},
};

// Mesma base, mas com Pplat/PEEP que empurram a Driving Pressure para 16,
// acima de 15: dispara alerta "danger" e faz o painel "Leitura do caso" aparecer.
const EVOLUCAO_COM_ALERTA: DailyEvolution = {
  ...EVOLUCAO_ESTAVEL,
  pplat: 24,
  peep: 8,
};

// Os dois lados variam por sobreposição sobre as fixtures: comorbidade e
// IMC no paciente, gasometria e auto-PEEP na evolução. A ordem é
// (paciente, evolução) porque a Fase 8 pergunta primeiro quem é o paciente —
// é a patologia dele que decide qual alvo o motor devolve.
function renderDashboard(
  patientOver: Partial<Patient> = {},
  evOver: Partial<DailyEvolution> = {}
) {
  const patient: Patient = { ...PACIENTE, ...patientOver };
  const ev: DailyEvolution = { ...EVOLUCAO_ESTAVEL, ...evOver };
  return render(
    <MemoryRouter>
      <Dashboard patient={patient} ev={ev} />
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  // Este caso é o que prova o rodapé incondicional dos HeroCards: sem alerta
  // e sem correlação, o painel "Leitura do caso" (condicional) nem renderiza,
  // então o único jeito de "Amato, 2015" aparecer na tela é o SourceFooter
  // fixo logo abaixo dos quatro HeroCards.
  it("mostra o embasamento dos HeroCards mesmo sem nenhum alerta", () => {
    renderDashboard();

    expect(screen.getByText(/Amato, 2015/)).toBeInTheDocument();
    // Sem alerta e sem correlação, o painel condicional não deve existir.
    expect(screen.queryByText("Leitura do caso")).not.toBeInTheDocument();
  });

  it("mostra o embasamento dos HeroCards e o do painel 'Leitura do caso' quando há alerta", () => {
    renderDashboard({}, EVOLUCAO_COM_ALERTA);

    expect(screen.getByText("Leitura do caso")).toBeInTheDocument();
    // Um rodapé para os HeroCards, outro para o painel de leitura do caso.
    expect(screen.getAllByText(/Amato, 2015/).length).toBeGreaterThanOrEqual(2);
    // "Gattinoni" só entra pela fonte do Mechanical Power, citada no
    // rodapé do painel "Leitura do caso" — confirma que é um segundo rodapé,
    // não o mesmo texto duplicado.
    expect(screen.getByText(/Gattinoni, 2016/)).toBeInTheDocument();
  });

  // Item 2 da onda de fechamento: a tabela ARDSnet do painel "Sugestão
  // inicial" também precisa de rodapé — antes desta mudança não tinha nenhum.
  it("cita a tabela ARDSnet no painel 'Sugestão inicial'", () => {
    renderDashboard();

    expect(screen.getByText(/Sugestão inicial/)).toBeInTheDocument();
    // "ARDSnet, 2000" já aparece no rodapé incondicional dos HeroCards
    // (via pf/pplat/vcKg); o painel de sugestão precisa do seu próprio.
    expect(screen.getAllByText(/ARDSnet, 2000/).length).toBeGreaterThanOrEqual(2);
  });

  // A tela precisa mostrar quando `Alvo<T>` trouxe modulação: sem isso o
  // tipo é encanamento morto (Fase 4, Tarefa 5).
  it("mostra o alvo padrão quando a obesidade deslocou a faixa", () => {
    // 95 kg e 1,70 m dão IMC ~32,9 (95 / 1,70²): obeso.
    renderDashboard({ height_cm: 170, weight_kg: 95 });

    // O "6–8" também aparece no `sub` do Panel (texto fixo, independente de
    // modulação); escopar em `alvo-modulacao` é o que garante que é a linha
    // de modulação que mostra o valor ajustado, não qualquer "6–8" da tela.
    const linha = screen.getByTestId("alvo-modulacao");
    expect(linha).toHaveTextContent(/6–8/);
    // A faixa padrão (sem modulação) tem de aparecer explicitamente, para o
    // avaliador poder julgar o tamanho do ajuste.
    expect(screen.getByText(/padrão.*4–6/i)).toBeInTheDocument();
  });

  it("não mostra alvo padrão quando não houve modulação", () => {
    // 70 kg e 1,70 m dão IMC ~24,2: não obeso, sem modulação.
    renderDashboard({ height_cm: 170, weight_kg: 70 });

    expect(screen.queryByText(/padrão/i)).not.toBeInTheDocument();
  });

  // Item 3 da onda de fechamento: o rodapé do painel de sugestão precisa
  // citar a fonte da própria modulação que ele exibe, não só vcTarget/
  // peepFio2. A chave da modulação da obesidade é `vcKgObeso`, que resolve
  // para o parecer do mentor e não aparece via vcTarget nem peepFio2 (os dois
  // só citam ardsnet_2000) — por isso é a citação certa para provar que o
  // rodapé deriva das modulações do alvo, e não de uma lista decorada à mão.
  it("cita a fonte da modulação no rodapé do painel de sugestão inicial", () => {
    renderDashboard({ height_cm: 170, weight_kg: 95 });

    const painel = screen.getByText(/Sugestão inicial/).closest("section")!;
    expect(within(painel).getByText(/Parecer clínico \(VC no obeso\)/)).toBeInTheDocument();
  });

  // O outro lado do mesmo par, e o defeito do item 5: enquanto o parecer
  // estava em `vcKg`, ele era citado nos rodapés escritos à mão dos HeroCards
  // — ou seja, na tela de TODO paciente, embaixo de um card mostrando a faixa
  // 4–6 do não obeso, que o parecer não sustenta.
  it("não cita o parecer do VC no obeso na tela de quem não é obeso", () => {
    renderDashboard({ height_cm: 170, weight_kg: 70 });

    expect(screen.queryByText(/Parecer clínico \(VC no obeso\)/)).not.toBeInTheDocument();
  });

  // ---------- Fase 8: as modulações por patologia na tela ----------

  it("mostra a modulação de PEEP na asma", () => {
    renderDashboard({ comorbidities: ["asma"] }, { pao2: 150, fio2: 100, spo2: 95 });
    expect(screen.getByTestId("peep-modulacao")).toHaveTextContent(/asma/i);
  });

  // Sem auto-PEEP o aplicativo não tem número de PEEP para o DPOC, e a tela
  // precisa dizer isso em vez de mostrar o da tabela como se valesse.
  it("DPOC sem auto-PEEP não mostra número de PEEP", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95, auto_peep: null });
    expect(screen.getByTestId("peep-modulacao")).toHaveTextContent(/não foi medido/i);
    expect(screen.getByTestId("sug-peep")).not.toHaveTextContent(/\d/);
  });

  it("DPOC com auto-PEEP mostra a faixa", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95, auto_peep: 10 });
    expect(screen.getByTestId("sug-peep")).toHaveTextContent("8");
  });

  // Auto-PEEP ZERO: a caixa mostrava "0.0–0.0 cmH₂O · fração do auto-PEEP
  // medido" para um paciente com P/F 150 — prescrição de ZEEP nascida de
  // multiplicar um achado favorável por 0,8. Agora não sai dígito nenhum, e a
  // linha diz por quê.
  it("DPOC com auto-PEEP zero não mostra dígito nenhum na caixa da PEEP", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95, auto_peep: 0 });
    expect(screen.getByTestId("sug-peep")).not.toHaveTextContent(/\d/);
    const linha = screen.getByTestId("peep-modulacao");
    expect(linha).toHaveTextContent(/zero/i);
    expect(linha).toHaveTextContent(/aprisionamento/i);
    // O texto do zero não é o do não medido: são recusas diferentes.
    expect(linha).not.toHaveTextContent(/não foi medido/i);
  });

  // Dia sem gasometria e sem oximetria, com o auto-PEEP registrado: o portão
  // do preset vinha antes do da patologia e descartava a medida em silêncio,
  // mostrando "5 cmH₂O · tabela ARDSnet" — a tabela que não se aplica ao DPOC.
  //
  // As duas caixas na mesma asserção de propósito: o auto-PEEP medido abre a
  // regra da PEEP e NÃO diz nada sobre oxigenação, então a FiO₂ continua sendo
  // a do preset. Uma FiO₂ de 40% aqui seria número afirmativo nascido de dado
  // nenhum, e ainda por cima baixo.
  it("DPOC sem oxigenação e com auto-PEEP: faixa de PEEP medida, FiO₂ ainda do preset", () => {
    renderDashboard(
      { comorbidities: ["dpoc"] },
      { pao2: null, fio2: null, spo2: null, auto_peep: 10 }
    );
    const caixa = screen.getByTestId("sug-peep");
    expect(caixa).toHaveTextContent("8");
    expect(caixa).not.toHaveTextContent(/ARDSnet/i);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.queryByText("40%")).not.toBeInTheDocument();
  });

  // Sem auto-PEEP o 5 continua, porque é ponto de partida para montar o
  // ventilador. O que ele deixa de fazer é sair calado e rotulado de ARDSnet.
  it("obstrutivo sem gasometria e sem auto-PEEP mostra o preset com modulação, e sem dizer ARDSnet", () => {
    renderDashboard(
      { comorbidities: ["dpoc"] },
      { pao2: null, fio2: null, spo2: null, auto_peep: null }
    );
    const caixa = screen.getByTestId("sug-peep");
    expect(caixa).toHaveTextContent("5");
    expect(caixa).not.toHaveTextContent(/ARDSnet/i);
    expect(screen.getByTestId("peep-modulacao")).toHaveTextContent(/ponto de partida/i);
  });

  // A linha da modulação de frequência não era referenciada por teste nenhum,
  // e era justamente ela que afirmava um rebaixamento inexistente.
  it("a linha de modulação da frequência informa a relação I:E e não afirma rebaixamento", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95 });
    const linha = screen.getByTestId("ventilacao-modulacao");
    expect(linha).toHaveTextContent(/1:4 a 1:6/);
    expect(linha).not.toHaveTextContent(/baixad|piso/i);
  });

  it("sem patologia obstrutiva não há linha de modulação da frequência", () => {
    renderDashboard({}, { pao2: 150, fio2: 100, spo2: 95 });
    expect(screen.queryByTestId("ventilacao-modulacao")).not.toBeInTheDocument();
  });

  // A frequência mostrada ao obstrutivo é a mesma do não obstrutivo: a
  // modulação informa, não muda número.
  it("a frequência exibida ao obstrutivo é a mesma do não obstrutivo", () => {
    const { unmount } = renderDashboard({}, { pao2: 150, fio2: 100, spo2: 95 });
    const semPatologia = screen.getByText(/^\d+ \/min$/).textContent;
    unmount();
    renderDashboard({ comorbidities: ["dpoc"] }, { pao2: 150, fio2: 100, spo2: 95 });
    expect(screen.getByText(/^\d+ \/min$/).textContent).toBe(semPatologia);
  });

  // A obesidade não ganha número de PEEP: o PROBESE é intraoperatório e
  // negativo, e não sustenta piso nenhum. Ganha o aviso, que é a recusa de um
  // alvo — e o teste garante que ninguém "complete" isso com um número.
  it("no obeso mostra o aviso de recrutamento, e nenhum número de PEEP novo", () => {
    renderDashboard({ weight_kg: 120, height_cm: 170 }, {});
    const aviso = screen.getByTestId("obeso-recrutamento");
    expect(aviso).toHaveTextContent(/recrutamento/i);
    expect(aviso).not.toHaveTextContent(/\d/);
  });

  it("sem obesidade não mostra o aviso", () => {
    renderDashboard({ weight_kg: 70, height_cm: 170 }, {});
    expect(screen.queryByTestId("obeso-recrutamento")).not.toBeInTheDocument();
  });

  it("o alvo de PaCO₂ só aparece na lesão cerebral aguda", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, {});
    expect(screen.queryByTestId("alvo-paco2")).not.toBeInTheDocument();
  });

  it("na lesão cerebral aguda mostra o alvo e a ressalva", () => {
    renderDashboard({ comorbidities: ["lesao_cerebral_aguda"] }, {});
    const alvo = screen.getByTestId("alvo-paco2");
    expect(alvo).toHaveTextContent("35");
    expect(alvo).toHaveTextContent("45");
    expect(screen.getByTestId("alvo-paco2-ressalva")).toHaveTextContent(/intracraniana/i);
  });

  // O rodapé cita o que foi CALCULADO, nunca uma lista escrita à mão. Este
  // par é o que separa as duas coisas: uma lista fixa contendo
  // "lesaoCerebral" passaria no teste de cima e reprovaria neste, porque
  // citaria o consenso de lesão cerebral na tela de um paciente que não a
  // tem. Este projeto já embarcou três vezes um rodapé citando fonte que o
  // painel não exibia.
  it("cita a fonte do alvo de PaCO₂ quando ele aparece", () => {
    renderDashboard({ comorbidities: ["lesao_cerebral_aguda"] }, {});
    expect(screen.getByText(/ESICM, 2020/)).toBeInTheDocument();
  });

  it("não cita a fonte da lesão cerebral em quem não a tem", () => {
    renderDashboard({ comorbidities: ["dpoc"] }, {});
    expect(screen.queryByText(/ESICM, 2020/)).not.toBeInTheDocument();
  });

  // Mesma prova para o aviso do obeso: a fonte dele (PROBESE) não pode
  // aparecer na tela de quem não recebeu o aviso.
  it("cita a fonte do aviso do obeso só quando o aviso aparece", () => {
    renderDashboard({ weight_kg: 120, height_cm: 170 }, {});
    expect(screen.getByText(/PROBESE, 2019/)).toBeInTheDocument();
  });

  it("não cita a fonte do aviso do obeso em quem não é obeso", () => {
    renderDashboard({ weight_kg: 70, height_cm: 170 }, {});
    expect(screen.queryByText(/PROBESE, 2019/)).not.toBeInTheDocument();
  });
});

// ============================================================
// `textoPeep` é a formatação compartilhada pelas DUAS telas que exibem este
// alvo: o Dashboard e o card de admissão do PatientDetail. O caso sem número
// só é alcançável pelo Dashboard (o card de admissão chama o motor sem P/F e
// sem SpO₂, e o preset de admissão sai antes do portão da patologia), então é
// aqui, na função, que ele fica coberto para os dois consumidores.
// ============================================================
describe("textoPeep", () => {
  const alvoPeep = (
    valor: AlvoPeepFio2,
    base: AlvoPeepFio2 = valor,
    modulacoes: Alvo<AlvoPeepFio2>["modulacoes"] = []
  ): Alvo<AlvoPeepFio2> => ({ valor, base, modulacoes });

  it("mostra o número quando o motor deu número", () => {
    const t = textoPeep(alvoPeep({ fio2: 50, peep: 8, faixaPeep: null, presetAdmissao: false }));
    expect(t.big).toContain("8");
  });

  // O preset de admissão NÃO vem da tabela: o motor devolve 5 sem consultá-la,
  // porque não há gasometria nem oximetria para escolher a linha. Rotulá-lo de
  // "tabela ARDSnet" afirmava a tabela onde ela não foi usada — e no
  // obstrutivo, a tabela que a fase declara não se aplicar.
  it("não diz 'tabela ARDSnet' quando o número é o preset de admissão", () => {
    const t = textoPeep(alvoPeep({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true }));
    expect(t.big).toContain("5");
    expect(t.sub).not.toMatch(/ARDSnet/i);
    expect(t.sub).toMatch(/preset/i);
  });

  it("remete à modulação quando o preset vem acompanhado de uma", () => {
    const t = textoPeep(
      alvoPeep({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true }, undefined, [
        { motivo: "Obstrutivo: ponto de partida inicial.", sourceKey: "obstrutivo" },
      ])
    );
    expect(t.sub).not.toMatch(/ARDSnet/i);
    expect(t.sub).toMatch(/abaixo/i);
  });

  it("só diz 'tabela ARDSnet' quando o número veio mesmo da tabela", () => {
    const t = textoPeep(alvoPeep({ fio2: 50, peep: 8, faixaPeep: null, presetAdmissao: false }));
    expect(t.sub).toMatch(/ARDSnet/i);
  });

  it("mostra a faixa quando o motor deu faixa", () => {
    const t = textoPeep(
      alvoPeep({ fio2: 60, peep: null, faixaPeep: { min: 8, max: 8.5 }, presetAdmissao: false })
    );
    expect(t.big).toContain("8.0");
    expect(t.big).toContain("8.5");
  });

  // O que este caso impede: cair no `base`, que é justamente o número da
  // tabela do ARDSnet que o motor RECUSOU dar. `sub` entra na asserção
  // porque as duas telas o imprimem dentro da mesma caixa do valor: um
  // número ali seria lido como a PEEP sugerida.
  it("não mostra dígito nenhum quando o motor não tem número a dar", () => {
    const t = textoPeep(
      alvoPeep(
        { fio2: 60, peep: null, faixaPeep: null, presetAdmissao: false },
        { fio2: 60, peep: 10, faixaPeep: null, presetAdmissao: false },
        [{ motivo: "DPOC: auto-PEEP não medido.", sourceKey: "obstrutivo" }]
      )
    );
    expect(t.big).not.toMatch(/\d/);
    expect(t.sub).not.toMatch(/\d/);
  });
});

// Smoke test barato: PatientHeader também era exportado e sem teste próprio.
// Não usa Supabase (renderização inicial não é `editing`) nem router, então
// não pede o mock de banco que PatientDetail.test.tsx precisa.
describe("PatientHeader", () => {
  it("renderiza nome, sexo/diagnóstico e modo sem quebrar", () => {
    render(
      <PatientHeader
        patient={PACIENTE}
        vent={undefined}
        ventilators={[]}
        onUpdate={vi.fn()}
        rassAtual={null}
      />
    );

    expect(screen.getByText("Paciente Teste")).toBeInTheDocument();
    expect(screen.getByText(/Masculino/)).toBeInTheDocument();
    expect(screen.getByText("VCV")).toBeInTheDocument();
  });
});
