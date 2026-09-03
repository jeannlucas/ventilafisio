import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { PatientHeader } from "./PatientHeader";
import type { Patient, DailyEvolution } from "../../types";

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
  // peepFio2. THRESHOLD_SOURCES.vcKg inclui "amib_sbpt_2024", que não
  // aparece via vcTarget nem peepFio2 (os dois só citam ardsnet_2000) —
  // por isso é a citação certa para provar que o rodapé deriva das
  // modulações do alvo, e não uma lista de chaves decorada à mão.
  it("cita a fonte da modulação no rodapé do painel de sugestão inicial", () => {
    renderDashboard({ height_cm: 170, weight_kg: 95 });

    const painel = screen.getByText(/Sugestão inicial/).closest("section")!;
    expect(within(painel).getByText(/AMIB\/SBPT, 2024/)).toBeInTheDocument();
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
