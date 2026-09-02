import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { MRC_GROUPS } from "../data/scores";

// ---------- Estado controlável do banco falso ----------
const db = {
  patient: null as Record<string, unknown> | null,
  patientError: null as { message: string } | null,
  ventilators: [] as Record<string, unknown>[],
  evolutions: [] as Record<string, unknown>[],
  asynchronies: [] as Record<string, unknown>[],
  treSessions: [] as Record<string, unknown>[],
  treSessionsError: null as { message: string } | null,
  recruitmentManeuvers: [] as Record<string, unknown>[],
  recruitmentManeuversError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  insertError: null as { message: string } | null,
  deleteError: null as { message: string } | null,
  lastUpdate: null as Record<string, unknown> | null,
  lastInsert: null as Record<string, unknown> | null,
  deletedFrom: [] as string[],
};

function rowsOf(table: string) {
  if (table === "ventilators") return { data: db.ventilators, error: null };
  if (table === "daily_evolutions") return { data: db.evolutions, error: null };
  if (table === "asynchronies") return { data: db.asynchronies, error: null };
  if (table === "tre_sessions")
    return db.treSessionsError
      ? { data: null, error: db.treSessionsError }
      : { data: db.treSessions, error: null };
  if (table === "recruitment_maneuvers")
    return db.recruitmentManeuversError
      ? { data: null, error: db.recruitmentManeuversError }
      : { data: db.recruitmentManeuvers, error: null };
  return { data: [], error: null };
}

vi.mock("../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from(table: string) {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        single: () =>
          Promise.resolve(
            table === "patients"
              ? { data: db.patient, error: db.patientError }
              : { data: null, error: null }
          ),
        update: (values: Record<string, unknown>) => {
          db.lastUpdate = values;
          return { eq: () => Promise.resolve({ error: db.updateError }) };
        },
        insert: (values: Record<string, unknown>) => {
          db.lastInsert = values;
          return Promise.resolve({ error: db.insertError });
        },
        delete: () => ({
          eq: () => {
            db.deletedFrom.push(table);
            return Promise.resolve({ error: db.deleteError });
          },
        }),
        then: (resolve: (v: unknown) => unknown) => resolve(rowsOf(table)),
      };
      return chain;
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  },
}));

vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    session: { user: { id: "user-1" } },
    profile: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import PatientDetail from "./PatientDetail";

const PACIENTE_BASE = {
  id: "p-1",
  owner_id: "user-1",
  hospital_id: "h-1",
  name: "Paciente Teste",
  age: 60,
  sex: "M",
  diagnosis: "SDRA",
  height_cm: 170,
  weight_kg: 70,
  comorbidities: [],
  ventilator_id: null,
  current_mode: "VCV",
  active: true,
  status: "active",
  discharge_reason: null,
  discharge_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

// O resultado do TRE vale 24 h (VALIDADE_TRE_HORAS). A página não injeta
// "agora" — quem decide é o relógio do navegador —, então toda data de TRE
// usada aqui nasce como deslocamento de `Date.now()`, e nunca como string
// escrita à mão. Data fixa no passado envelhece: a mesma fixture passaria hoje
// e reprovaria amanhã, provando o oposto do que o teste diz provar.
const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/paciente/p-1"]}>
      <Routes>
        <Route path="/paciente/:id" element={<PatientDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  db.patient = { ...PACIENTE_BASE };
  db.patientError = null;
  db.ventilators = [];
  db.evolutions = [];
  db.asynchronies = [];
  db.treSessions = [];
  db.treSessionsError = null;
  db.recruitmentManeuvers = [];
  db.recruitmentManeuversError = null;
  db.updateError = null;
  db.insertError = null;
  db.deleteError = null;
  db.lastUpdate = null;
  db.lastInsert = null;
  db.deletedFrom = [];
  // jsdom não implementa a área de transferência.
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

// ============================================================
// C2: paciente inacessível travava em "Carregando…" para sempre
// ============================================================
describe("carga do paciente", () => {
  it("mostra o paciente quando a carga funciona", async () => {
    renderDetail();
    expect(await screen.findByText("Paciente Teste")).toBeInTheDocument();
  });

  it("informa a falha em vez de ficar carregando para sempre", async () => {
    db.patient = null;
    db.patientError = { message: "row not found" };
    renderDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /não foi possível abrir este paciente/i
    );
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
  });

  it("trata paciente inexistente sem erro explícito do banco", async () => {
    db.patient = null;
    db.patientError = null;
    renderDetail();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
  });
});

// ============================================================
// Contexto do paciente no cabeçalho: comorbidade, via aérea e dia de
// VM. Ausência de dado não pode virar placeholder na tela — foi a
// origem dos defeitos mais graves já achados neste projeto (FiO₂
// zero virando P/F "Normal", vasopressor nunca avaliado contando
// como critério atendido).
// ============================================================
describe("contexto do paciente no cabeçalho", () => {
  it("não mostra linha de contexto quando não há o que mostrar", async () => {
    db.patient = { ...PACIENTE_BASE, comorbidities: [], intubation_date: null, airway: null };
    renderDetail();
    await screen.findByText("Paciente Teste");

    expect(screen.queryByText(/dia de VM/i)).not.toBeInTheDocument();
    expect(screen.queryByText("TOT")).not.toBeInTheDocument();
    expect(screen.queryByText("TQT")).not.toBeInTheDocument();
  });

  it("mostra comorbidade, via aérea e dia de VM quando há dado", async () => {
    db.patient = {
      ...PACIENTE_BASE,
      comorbidities: ["dpoc"],
      airway: "tot",
      intubation_date: "2020-01-01",
    };
    renderDetail();
    await screen.findByText("Paciente Teste");

    expect(screen.getByText("DPOC")).toBeInTheDocument();
    expect(screen.getByText("TOT")).toBeInTheDocument();
    expect(screen.getByText(/\d+º dia de VM/)).toBeInTheDocument();
  });
});

// ============================================================
// C1: altura e peso só podiam ser informados na admissão, e a tela
// pedia para informá-los depois
// ============================================================
describe("edição dos dados do paciente", () => {
  it("oferece campos de altura e peso na edição", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));

    expect(screen.getByLabelText(/altura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/peso/i)).toBeInTheDocument();
  });

  it("grava a altura corrigida", async () => {
    db.patient = { ...PACIENTE_BASE, height_cm: null };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.type(screen.getByLabelText(/altura/i), "180");
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate).toMatchObject({ height_cm: 180 });
  });

  it("recusa altura impossível e não grava", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    const altura = screen.getByLabelText(/altura/i);
    await userEvent.clear(altura);
    await userEvent.type(altura, "0");
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/altura/i);
    expect(db.lastUpdate).toBeNull();
  });
});

// ============================================================
// C3: erro de escrita era descartado, o botão simplesmente não fazia nada
// ============================================================
describe("erro de escrita", () => {
  it("mostra a falha ao salvar os dados do paciente", async () => {
    db.updateError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });

  it("mostra a falha ao arquivar o paciente", async () => {
    db.updateError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /dar alta/i }));
    await userEvent.click(screen.getByRole("button", { name: /extubação/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });
});

// ============================================================
// A2: link de plantão era permanente e não havia como revogar
// ============================================================
describe("compartilhamento", () => {
  it("avisa o prazo de validade ao gerar o link", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /compartilhar/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(await screen.findByText(/7 dias/i)).toBeInTheDocument();
  });

  it("revoga links pendentes e acessos já concedidos", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar revoga/i }));

    await waitFor(() => expect(db.deletedFrom).toContain("patient_shares"));
    expect(db.deletedFrom).toContain("patient_access");
  });

  it("mostra a falha quando o banco recusa a revogação", async () => {
    db.deleteError = { message: "permission denied" };
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirmar revoga/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/permission denied/i);
  });

  it("não revoga nada sem a confirmação", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("button", { name: /revogar acessos/i }));
    expect(db.deletedFrom).toEqual([]);
  });
});

// ============================================================
// C5: o formulário aceitava qualquer número, inclusive o impossível
// ============================================================
describe("validação da evolução", () => {
  it("bloqueia FiO2 impossível e não grava", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/FiO₂/), "500");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/FiO₂/);
    expect(db.lastInsert).toBeNull();
  });

  it("bloqueia platô abaixo da PEEP, que produzia driving pressure negativa", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/P\. platô/), "10");
    await userEvent.type(screen.getByLabelText(/PEEP/), "18");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/platô/i);
    expect(db.lastInsert).toBeNull();
  });

  it("grava quando os valores são plausíveis", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/FiO₂/), "40");
    await userEvent.type(screen.getByLabelText(/PEEP/), "8");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert).toMatchObject({ fio2: 40, peep: 8 });
  });

  it("não marca vasopressor como avaliado quando ninguém tocou no chip", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert!.vasopressor).toBeNull();
  });

  // RASS 0 (alerta e calmo) e IMS 0 (nada, deitado) são medidas clínicas
  // reais, não ausência de dado. `Number(v) || null` transformaria as duas
  // em null, apagando o registro de que a avaliação aconteceu.
  it("grava RASS 0 e IMS 0 como medidas reais, não como ausência de dado", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.selectOptions(screen.getByLabelText("RASS"), "0");
    await userEvent.selectOptions(screen.getByLabelText("IMS"), "0");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    expect(db.lastInsert!.rass).toBe(0);
    expect(db.lastInsert!.ims).toBe(0);
  });
});

// ============================================================
// Embasamento clínico
// ============================================================
describe("embasamento clínico", () => {
  it("mostra embasamento dos indicadores na admissão", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [];
    renderDetail();
    await screen.findByText("Paciente Teste");

    // AdmissionCard está visível por padrão (tab admissão)
    expect(screen.getAllByText(/ver embasamento/i).length).toBeGreaterThanOrEqual(1);
  });

  it("mostra embasamento dos indicadores na evolução", async () => {
    const EVOLUCAO_BASE = {
      id: "e-1",
      patient_id: "p-1",
      recorded_at: "2026-01-02T00:00:00Z",
      fr: 16,
      vc: 400,
      peep: 8,
      fio2: 40,
      pao2: 120,
      pplat: 24,
      ppico: 30,
      paw: 18,
      glasgow: 10,
      rass: -1,
      ims: 0,
      vasopressor: true,
      peak_cough_flow: 60,
      tre_result: "pass",
      pimax: 50,
    };
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    renderDetail();
    await screen.findByText("Paciente Teste");

    // Clicar na tab "Evolução" para renderizar Dashboard
    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));

    // Dashboard exibe embasamento
    const footers = screen.getAllByText(/ver embasamento/i);
    expect(footers.length).toBeGreaterThanOrEqual(1);
  });

  it("mostra embasamento da prontidão para extubação", async () => {
    const EVOLUCAO_BASE = {
      id: "e-1",
      patient_id: "p-1",
      recorded_at: "2026-01-02T00:00:00Z",
      fr: 16,
      vc: 400,
      peep: 8,
      fio2: 40,
      pao2: 120,
      pplat: 24,
      ppico: 30,
      paw: 18,
      glasgow: 10,
      rass: -1,
      ims: 0,
      vasopressor: true,
      peak_cough_flow: 60,
      tre_result: "pass",
      pimax: 50,
    };
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    renderDetail();
    await screen.findByText("Paciente Teste");

    // Clicar na tab "Desmame" para renderizar ExtubationCard
    await userEvent.click(screen.getByRole("tab", { name: /desmame/i }));

    // ExtubationCard exibe embasamento
    const footers = screen.getAllByText(/ver embasamento/i);
    expect(footers.length).toBeGreaterThanOrEqual(1);
  });

  // O critério "RASS entre −2 e +1" apareceu na triagem (Fase 4) sem que o
  // rodapé do próprio painel citasse a fonte do RASS (Sessler, 2002). A
  // busca é restrita ao <section> do painel de extubação porque o painel de
  // escores (ScoresPanel, aba "Evolução") também cita Sessler para o RASS —
  // uma busca na página inteira passaria mesmo se a fonte estivesse só lá.
  it("cita a fonte do RASS no rodapé da prontidão para extubação", async () => {
    const EVOLUCAO_BASE = {
      id: "e-1",
      patient_id: "p-1",
      recorded_at: "2026-01-02T00:00:00Z",
      fr: 16,
      vc: 400,
      peep: 8,
      fio2: 40,
      pao2: 120,
      pplat: 24,
      ppico: 30,
      paw: 18,
      glasgow: 10,
      rass: -1,
      ims: 0,
      vasopressor: true,
      peak_cough_flow: 60,
      tre_result: "pass",
      pimax: 50,
    };
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    renderDetail();
    await screen.findByText("Paciente Teste");

    await userEvent.click(screen.getByRole("tab", { name: /desmame/i }));

    const painel = screen.getByText("Prontidão para extubação").closest("section")!;
    expect(within(painel).getByText(/Sessler, 2002/)).toBeInTheDocument();
  });
});

// ============================================================
// Fase 5, Task 4: a triagem de extubação passa a ler `tre_sessions`, não só
// o campo legado `daily_evolutions.tre_result`. Um TRE interrompido (por
// exame, transporte etc.) não é um TRE reprovado — resultadoTreParaTriagem()
// devolve null nesse caso, e "TRE aprovado" nulo entra como "não medido" na
// triagem. Reprovar por causa de um teste que não aconteceu é o defeito que
// esta fase inteira existe para fechar; ver src/lib/tre.ts.
// ============================================================
describe("triagem de extubação lê sessão de TRE", () => {
  it("não reprova a triagem quando o TRE foi interrompido", async () => {
    const EVOLUCAO_BASE = {
      id: "e-1",
      patient_id: "p-1",
      // Dentro da janela de 24 h, como a sessão abaixo: o que este teste mede
      // é a prevalência da sessão interrompida sobre o legado, não a
      // expiração. Com as duas datas velhas ele passaria por expiração e
      // deixaria de provar a prevalência.
      recorded_at: horasAtras(3),
      fr: 16,
      vc: 400,
      peep: 8,
      fio2: 40,
      pao2: 120,
      pplat: 24,
      ppico: 30,
      paw: 18,
      glasgow: 10,
      rass: -1,
      ims: 0,
      vasopressor: true,
      peak_cough_flow: 60,
      // Campo legado de uma evolução anterior à Fase 5, registrando que o
      // TRE daquele dia falhou. A sessão abaixo é posterior e foi
      // interrompida: ela precisa prevalecer sobre o legado, não o
      // contrário — é exatamente essa prevalência que este teste prova.
      tre_result: "fail",
      pimax: 50,
    };
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    db.treSessions = [
      {
        id: "s-1",
        patient_id: "p-1",
        owner_id: "user-1",
        iniciado_em: horasAtras(2),
        encerrado_em: horasAtras(1.7),
        modo_antes: "PCV",
        modo_durante: "psv",
        desfecho: "interrompido",
        motivo_interrupcao: "tomografia",
        criterios: {},
      },
    ];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    const cartao = screen.getByText("Prontidão para extubação").closest("section")!;
    expect(within(cartao).getByText(/TRE aprovado/)).toBeInTheDocument();
    // Está em "não medido", e não entre os reprovados.
    expect(within(cartao).queryByText(/Critérios desfavoráveis/)).not.toBeInTheDocument();
  });
});

// ============================================================
// Item 2 da onda de fechamento: o AdmissionCard (aba Admissão) mostrava um
// alvo modulado (obesidade) sem nenhum sinal na tela — o mesmo defeito que
// o Dashboard já havia corrigido.
// ============================================================
describe("sugestão de admissão", () => {
  it("mostra o alvo padrão quando a obesidade deslocou a faixa de VC", async () => {
    // 95 kg e 1,70 m dão IMC ~32,9 (95 / 1,70²): obeso.
    db.patient = { ...PACIENTE_BASE, height_cm: 170, weight_kg: 95 };
    renderDetail();
    await screen.findByText("Paciente Teste");

    // O "6–8" também aparece em texto fixo de apoio na tela; escopar em
    // `alvo-modulacao` é o que garante que é a linha de modulação que
    // mostra o valor ajustado, não qualquer "6–8" da tela.
    const linha = screen.getByTestId("alvo-modulacao");
    expect(linha).toHaveTextContent(/6–8/);
    expect(screen.getByText(/padrão.*4–6/i)).toBeInTheDocument();
  });

  it("não mostra alvo padrão quando não houve modulação", async () => {
    // 70 kg e 1,70 m dão IMC ~24,2: não obeso, sem modulação.
    db.patient = { ...PACIENTE_BASE, height_cm: 170, weight_kg: 70 };
    renderDetail();
    await screen.findByText("Paciente Teste");

    expect(screen.queryByText(/padrão/i)).not.toBeInTheDocument();
  });

  // Item 3 da onda de fechamento: o rodapé do painel também precisa citar
  // a fonte da própria modulação, não só vcTarget/peepFio2.
  it("cita a fonte da modulação no rodapé da sugestão de admissão", async () => {
    // THRESHOLD_SOURCES.vcKg inclui "amib_sbpt_2024", que não aparece via
    // vcTarget nem peepFio2 (os dois só citam ardsnet_2000) — por isso é a
    // citação certa para provar que o rodapé deriva das modulações do
    // alvo, e não uma lista de chaves decorada à mão.
    db.patient = { ...PACIENTE_BASE, height_cm: 170, weight_kg: 95 };
    renderDetail();
    await screen.findByText("Paciente Teste");

    const painel = screen.getByText(/Sugestão de admissão/).closest("section")!;
    expect(within(painel).getByText(/AMIB\/SBPT, 2024/)).toBeInTheDocument();
  });
});

// ============================================================
// Aba padrão conforme o estado do paciente: antes, `tab` nascia fixo em
// "admissao", então um paciente no oitavo dia de VM abria mostrando como
// colocá-lo no ventilador, e não o estado atual dele.
// ============================================================
describe("aba padrão ao abrir o paciente", () => {
  const EVOLUCAO_BASE = {
    id: "e-1",
    patient_id: "p-1",
    recorded_at: "2026-01-02T00:00:00Z",
    fr: 16,
    vc: 400,
    peep: 8,
    fio2: 40,
    pao2: 120,
    pplat: 24,
    ppico: 30,
    paw: 18,
    glasgow: 10,
    rass: -1,
    ims: 0,
    vasopressor: true,
    peak_cough_flow: 60,
    tre_result: "pass",
    pimax: 50,
  };

  it("abre em Evolução quando o paciente já tem evolução registrada", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /evolução/i })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByRole("tab", { name: /admissão/i })).toHaveAttribute("aria-selected", "false");
  });

  it("abre em Admissão quando não há evolução nenhuma", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [];
    renderDetail();

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /admissão/i })).toHaveAttribute("aria-selected", "true");
    });
  });

  it("não troca a aba de quem já navegou quando a carga termina depois", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    renderDetail();
    await screen.findByText("Paciente Teste");

    // Usuário navega deliberadamente para Admissão, mesmo havendo evolução.
    await userEvent.click(screen.getByRole("tab", { name: /admissão/i }));
    expect(screen.getByRole("tab", { name: /admissão/i })).toHaveAttribute("aria-selected", "true");

    // Recarrega (salvar o cabeçalho dispara load() de novo) sem que a aba
    // escolhida pelo usuário seja trocada por baixo dele.
    await userEvent.click(screen.getByRole("button", { name: /editar/i }));
    await userEvent.click(screen.getByRole("button", { name: /^salvar$/i }));

    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(screen.getByRole("tab", { name: /admissão/i })).toHaveAttribute("aria-selected", "true");
  });
});

// ============================================================
// MotorPanel é montado na aba Evolução, mas testado sozinho em
// MotorPanel.test.tsx: nenhum teste acima passa uma avaliação MRC completa,
// então nenhum deles exercita o ponto de montagem em PatientDetail. Sem este
// teste, apagar `<MotorPanel evolutions={evolutions} />` da página não
// derrubaria nenhum teste da suíte.
// ============================================================
describe("painel de avaliação motora na página", () => {
  it("mostra o painel de avaliação motora quando há avaliação completa", async () => {
    const mrcCompleto = Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [
      {
        id: "e-1",
        patient_id: "p-1",
        recorded_at: "2026-01-02T00:00:00Z",
        fr: 16,
        vc: 400,
        peep: 8,
        fio2: 40,
        pao2: 120,
        pplat: 24,
        ppico: 30,
        paw: 18,
        glasgow: 10,
        rass: -1,
        ims: 0,
        vasopressor: true,
        peak_cough_flow: 60,
        tre_result: "pass",
        pimax: 50,
        mrc: mrcCompleto,
      },
    ];
    renderDetail();
    await screen.findByText("Paciente Teste");

    // Evolução já é a aba padrão quando há evolução (ver bloco acima), mas
    // confere antes de clicar em vez de assumir.
    const abaEvolucao = screen.getByRole("tab", { name: /evolução/i });
    if (abaEvolucao.getAttribute("aria-selected") !== "true") {
      await userEvent.click(abaEvolucao);
    }

    // "Avaliação motora" é o título do Panel do MotorPanel. ScoresPanel, que
    // também trata de MRC na mesma aba, usa o título "Escores" — os dois
    // nunca colidem.
    expect(await screen.findByText("Avaliação motora")).toBeInTheDocument();
  });
});

// ============================================================
// Fase 5, Task 6: o painel de TRE é montado na aba Desmame. O painel tem
// teste próprio em TrePanel.test.tsx, e funcionar isolado não prova que ele
// está na tela: sem este bloco, apagar `<TrePanel/>` de PatientDetail.tsx
// não derrubaria nenhum teste da suíte — foi exatamente o defeito que a
// Fase 2 embarcou e teve que corrigir depois.
//
// "Teste de respiração espontânea" é o título do Panel do TrePanel e é
// inequívoco: o único outro painel da aba é o de prontidão, cujo título é
// "Prontidão para extubação". Nenhum outro texto renderizado por esta
// página contém a frase (as demais ocorrências no repositório são
// comentário em lib/tre.ts e data/tre.ts, e o catálogo de fontes em
// Sources.tsx, que é outra rota).
// ============================================================
describe("painel de TRE na página do paciente", () => {
  const EVOLUCAO_BASE = {
    id: "e-1",
    patient_id: "p-1",
    recorded_at: "2026-01-02T00:00:00Z",
    fr: 16,
    vc: 400,
    peep: 8,
    fio2: 40,
    pao2: 120,
    pplat: 24,
    ppico: 30,
    paw: 18,
    glasgow: 10,
    rass: -1,
    ims: 0,
    // Vasopressor em uso reprova "Sem vasopressor elevado" na triagem, e é
    // isso que o segundo teste usa para provar a fiação das pendências.
    vasopressor: true,
    peak_cough_flow: 60,
    tre_result: "pass",
    pimax: 50,
  };

  it("mostra o painel de TRE na aba Desmame", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    db.treSessions = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(await screen.findByText("Teste de respiração espontânea")).toBeInTheDocument();
    // O botão vive dentro do <section> do próprio painel: prova que o que
    // apareceu é o painel inteiro, não uma string solta com o mesmo texto.
    const painel = screen.getByText("Teste de respiração espontânea").closest("section")!;
    expect(within(painel).getByRole("button", { name: /iniciar teste/i })).toBeInTheDocument();
  });

  // O plano trava um ponto de projeto: TrePanel e ExtubationCard leem o MESMO
  // objeto de triagem, calculado uma vez no corpo da página. Este teste é o
  // que amarra o `pendencias` do painel a essa triagem — sem ele, passar uma
  // lista vazia constante satisfaria o teste de montagem acima.
  it("lista na pendência do TRE o mesmo critério que a triagem reprova", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    db.treSessions = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(await screen.findByTestId("tre-pendencias")).toHaveTextContent("Sem vasopressor elevado");

    // E o mesmo critério aparece reprovado no cartão de prontidão: um único
    // cálculo alimentando os dois painéis.
    const cartao = screen.getByText("Prontidão para extubação").closest("section")!;
    expect(within(cartao).getByText(/✗ Sem vasopressor elevado/)).toBeInTheDocument();
  });
});

// ============================================================
// Onda de fechamento da Fase 5, item 1: o seletor legado de TRE saiu do
// formulário de evolução diária.
//
// Ele oferecia só "Aprovado" e "Falhou": um teste interrompido por tomografia
// ou transporte não tinha como ser registrado e acabava gravado como falha —
// bloqueador ABSOLUTO da triagem de extubação, pela superfície de entrada
// principal do app. O defeito que a fase inteira existe para fechar continuava
// alcançável por aqui. `daily_evolutions.tre_result` continua sendo LIDO como
// legado; só a escrita e o campo saíram.
// ============================================================
describe("o formulário de evolução não registra mais TRE", () => {
  it("não oferece o seletor de TRE", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");
    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));

    expect(screen.queryByLabelText("TRE")).not.toBeInTheDocument();
    // E nenhum seletor da tela oferece o par de opções do campo antigo.
    expect(screen.queryByRole("option", { name: "Aprovado" })).not.toBeInTheDocument();
  });

  it("não escreve tre_result ao salvar a evolução", async () => {
    renderDetail();
    await screen.findByText("Paciente Teste");
    await userEvent.click(screen.getByRole("tab", { name: /evolução/i }));
    await userEvent.type(screen.getByLabelText(/FiO₂/), "40");
    await userEvent.click(screen.getByRole("button", { name: /salvar evolução/i }));

    await waitFor(() => expect(db.lastInsert).not.toBeNull());
    // `toHaveProperty` em vez de comparar com null: gravar `tre_result: null`
    // ainda seria escrever a coluna, e o combinado é não escrevê-la mais.
    expect(db.lastInsert).not.toHaveProperty("tre_result");
  });
});

// ============================================================
// Onda de fechamento da Fase 5, item 2: erro na busca de sessões de TRE não é
// licença para usar o campo legado.
//
// A busca descartava o `error`. Com ela falhando, `data` vem null, a lista
// vira [] e `resultadoTreParaTriagem` interpretava isso como "não há sessão
// nenhuma" — caindo no `tre_result` da evolução antiga. Um paciente cuja
// última sessão falhou aparecia com "✓ TRE aprovado" e sem o bloqueador
// absoluto, por causa de um erro de rede. Ausência de dado não é resultado.
// ============================================================
describe("falha ao buscar as sessões de TRE", () => {
  const EVOLUCAO_LEGADO_APROVADO = {
    id: "e-1",
    patient_id: "p-1",
    // Dentro da janela de 24 h: aqui a pergunta é se o erro de rede derruba o
    // legado, e para isso o legado precisa estar valendo. A expiração é
    // testada logo abaixo, no bloco da validade.
    recorded_at: horasAtras(2),
    fr: 16,
    vc: 400,
    peep: 8,
    fio2: 40,
    pao2: 120,
    pplat: 24,
    ppico: 30,
    paw: 18,
    glasgow: 10,
    rass: -1,
    ims: 0,
    vasopressor: false,
    peak_cough_flow: 60,
    // Registro anterior à Fase 5, dizendo que o TRE daquele dia foi aprovado.
    tre_result: "pass",
    pimax: -30,
  };

  it("lê como não medido, não como o TRE aprovado do campo legado", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_LEGADO_APROVADO }];
    db.treSessionsError = { message: "falha de rede" };
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(screen.getByTestId("extubacao-nao-medidos")).toHaveTextContent("TRE aprovado");
    expect(screen.getByTestId("extubacao-atendidos")).not.toHaveTextContent("TRE aprovado");
  });

  it("com a busca funcionando, o campo legado continua valendo", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_LEGADO_APROVADO }];
    db.treSessions = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(screen.getByTestId("extubacao-atendidos")).toHaveTextContent("TRE aprovado");
  });
});

// ============================================================
// Validade de 24 h do TRE, na fiação da página.
//
// A janela mora em `resultadoTreParaTriagem`, e os testes de unidade dela
// estão em src/lib/tre.test.ts. O que SÓ a página pode provar é que ela passa
// a data do valor legado: sem esse argumento a função trata o legado como
// "sem data" e não expira nada, e um `tre_result: "pass"` de cinco dias atrás
// volta a contar como critério atendido na triagem de hoje — com a suíte de
// unidade inteira verde.
// ============================================================
describe("validade de 24 h do TRE na triagem da página", () => {
  const EVOLUCAO = (recordedAt: string) => ({
    id: "e-1",
    patient_id: "p-1",
    recorded_at: recordedAt,
    fr: 16,
    vc: 400,
    peep: 8,
    fio2: 40,
    pao2: 120,
    pplat: 24,
    ppico: 30,
    paw: 18,
    glasgow: 10,
    rass: -1,
    ims: 0,
    vasopressor: false,
    peak_cough_flow: 60,
    // Registro anterior à Fase 5: é o único TRE que este paciente tem.
    tre_result: "pass",
    pimax: -30,
  });

  it("um TRE legado de 30 horas atrás entra como não medido, não como atendido", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [EVOLUCAO(horasAtras(30))];
    db.treSessions = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(screen.getByTestId("extubacao-nao-medidos")).toHaveTextContent("TRE aprovado");
    expect(screen.getByTestId("extubacao-atendidos")).not.toHaveTextContent("TRE aprovado");
  });

  // O par do teste acima: com a mesma fixture dentro da janela o critério é
  // atendido. Sem este, apagar a leitura do campo legado inteiro também
  // deixaria o primeiro verde.
  it("o mesmo TRE legado, de 2 horas atrás, continua atendendo o critério", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [EVOLUCAO(horasAtras(2))];
    db.treSessions = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    expect(screen.getByTestId("extubacao-atendidos")).toHaveTextContent("TRE aprovado");
  });
});

// ============================================================
// Onda de fechamento da Fase 5, item 4: o subtítulo da triagem prometia uma
// atualidade que ela não tem mais.
//
// Ele dizia "Triagem objetiva a partir da última evolução". Desde que o
// critério de TRE passou a ler o histórico de sessões, ele deixou de expirar
// junto com a evolução do dia. A pergunta clínica que faltava — por quanto
// tempo um TRE vale — foi respondida pelo mentor em 01/09/2026, e são 24 h:
// agora o subtítulo diz de onde vem cada número E qual o recorte de tempo.
// ============================================================
describe("subtítulo da prontidão para extubação", () => {
  it("diz que o TRE vem do histórico de testes das últimas 24 h", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [
      {
        id: "e-1",
        patient_id: "p-1",
        recorded_at: horasAtras(2),
        fr: 16,
        vc: 400,
        peep: 8,
        fio2: 40,
        glasgow: 10,
        rass: -1,
        vasopressor: false,
        peak_cough_flow: 60,
        tre_result: null,
        pimax: -30,
      },
    ];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    const painel = screen.getByText("Prontidão para extubação").closest("section")!;
    expect(painel).toHaveTextContent(/última evolução/i);
    expect(painel).toHaveTextContent(/histórico de testes/i);
    // A janela precisa estar na tela: é o que separa "TRE de algum dia" de
    // "TRE que ainda vale". Quem lê isso está à beira do leito.
    expect(painel).toHaveTextContent(/24\s?h/i);
  });
});

// ============================================================
// Fase 6, Task 8: o GasometriaPanel foi construído na Task 7 e passou a
// existir isolado, mas nada garantia que ele estivesse montado na aba
// Evolução. Sem este teste, apagar a linha `<GasometriaPanel/>` não quebraria
// nada — foi exatamente o defeito que a Fase 2 embarcou e teve que corrigir
// depois.
// ============================================================
describe("painel de gasometria na aba Evolução", () => {
  it("mostra o painel de gasometria na aba Evolução", async () => {
    const EVOLUCAO_BASE = {
      id: "e-1",
      patient_id: "p-1",
      recorded_at: "2026-01-02T00:00:00Z",
      fr: 16,
      vc: 400,
      peep: 8,
      fio2: 40,
      pao2: 120,
      pplat: 24,
      ppico: 30,
      paw: 18,
      glasgow: 10,
      rass: -1,
      ims: 0,
      vasopressor: true,
      peak_cough_flow: 60,
      tre_result: "pass",
      pimax: 50,
    };
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE, ph: 7.38, paco2: 60, hco3: 34 }];
    renderDetail();
    const painel = (await screen.findByText(/Gasometria interpretada/i)).closest("section")!;
    expect(within(painel).getByTestId("gaso-disturbio")).toHaveTextContent(/acidose respiratória/i);
  });
});

// ============================================================
// Fase 7, Task 8: MecanicaPanel (Task 6) e RecrutabilidadePanel (Task 7)
// existiam isolados, mas nada garantia que estivessem montados na página do
// paciente. Sem estes testes, apagar `<MecanicaPanel/>` da aba Evolução ou
// `<RecrutabilidadePanel/>` da aba Desmame não quebraria nada — foi
// exatamente o defeito que a Fase 2 embarcou e teve que corrigir depois.
// ============================================================
describe("painéis de mecânica e recrutabilidade na página", () => {
  const EVOLUCAO_BASE = {
    id: "e-1",
    patient_id: "p-1",
    recorded_at: "2026-01-02T00:00:00Z",
    fr: 16,
    vc: 400,
    peep: 8,
    fio2: 40,
    pao2: 120,
    pplat: 24,
    ppico: 30,
    paw: 18,
    glasgow: 10,
    rass: -1,
    ims: 0,
    vasopressor: true,
    peak_cough_flow: 60,
    tre_result: "pass",
    pimax: 50,
  };

  it("mostra o painel de mecânica na aba Evolução", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE, p01: 5, pocc: -20 }];
    renderDetail();
    const painel = (await screen.findByText(/Mecânica/i)).closest("section")!;
    expect(within(painel).getByTestId("mec-drive")).toHaveTextContent(/elevado/i);
  });

  it("mostra o painel de recrutabilidade na aba Desmame", async () => {
    db.patient = { ...PACIENTE_BASE };
    db.evolutions = [{ ...EVOLUCAO_BASE }];
    db.recruitmentManeuvers = [];
    renderDetail();
    await userEvent.click(await screen.findByRole("tab", { name: /desmame/i }));

    // `RecrutabilidadePanel` devolve vários <Panel> irmãos (um por estado da
    // manobra) mais um rodapé de fonte fora de qualquer um deles — não um
    // único <section> que os envolva. `.closest("section")` a partir do
    // título, como o TrePanel faz, pegaria só o primeiro Panel e nunca
    // alcançaria `rec-fonte`, que fica de fora. `rec-fonte` só existe dentro
    // deste componente em toda a árvore (conferido em RecrutabilidadePanel.tsx),
    // então achá-lo na tela depois de navegar para Desmame já prova que o
    // painel está montado ali — não é asserção que outro elemento satisfaça.
    expect(await screen.findByText(/Manobra de recrutabilidade/i)).toBeInTheDocument();
    expect(screen.getByTestId("rec-fonte")).toBeInTheDocument();
  });
});
