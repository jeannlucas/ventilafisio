import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  fio2: 30,
  ppico: 26,
  pplat: 24,
  flow: null,
  ph: null,
  pao2: 90,
  paco2: null,
  spo2: 97,
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

// `overrides.patient` permite variar altura/peso (IMC) sem duplicar o
// fixture inteiro. Toda chamada existente, com um único argumento, continua
// funcionando: o parâmetro é opcional.
function renderDashboard(ev: DailyEvolution, overrides: { patient?: Partial<Patient> } = {}) {
  const patient: Patient = { ...PACIENTE, ...overrides.patient };
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
    renderDashboard(EVOLUCAO_ESTAVEL);

    expect(screen.getByText(/Amato, 2015/)).toBeInTheDocument();
    // Sem alerta e sem correlação, o painel condicional não deve existir.
    expect(screen.queryByText("Leitura do caso")).not.toBeInTheDocument();
  });

  it("mostra o embasamento dos HeroCards e o do painel 'Leitura do caso' quando há alerta", () => {
    renderDashboard(EVOLUCAO_COM_ALERTA);

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
    renderDashboard(EVOLUCAO_ESTAVEL);

    expect(screen.getByText(/Sugestão inicial/)).toBeInTheDocument();
    // "ARDSnet, 2000" já aparece no rodapé incondicional dos HeroCards
    // (via pf/pplat/vcKg); o painel de sugestão precisa do seu próprio.
    expect(screen.getAllByText(/ARDSnet, 2000/).length).toBeGreaterThanOrEqual(2);
  });

  // A tela precisa mostrar quando `Alvo<T>` trouxe modulação: sem isso o
  // tipo é encanamento morto (Fase 4, Tarefa 5).
  it("mostra o alvo padrão quando a obesidade deslocou a faixa", () => {
    // 95 kg e 1,70 m dão IMC ~32,9 (95 / 1,70²): obeso.
    renderDashboard(EVOLUCAO_ESTAVEL, { patient: { height_cm: 170, weight_kg: 95 } });

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
    renderDashboard(EVOLUCAO_ESTAVEL, { patient: { height_cm: 170, weight_kg: 70 } });

    expect(screen.queryByText(/padrão/i)).not.toBeInTheDocument();
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
