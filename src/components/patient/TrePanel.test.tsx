import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TrePanel } from "./TrePanel";
import { CRITERIOS_FALHA } from "../../data/tre";
import type { TreSession } from "../../types";

const db = {
  lastInsert: null as Record<string, unknown> | null,
  lastUpdate: null as Record<string, unknown> | null,
  erro: null as { message: string } | null,
};

vi.mock("../../lib/supabase", () => ({
  supabaseConfigured: true,
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      insert: (v: Record<string, unknown>) => {
        db.lastInsert = v;
        return Promise.resolve({ error: db.erro });
      },
      update: (v: Record<string, unknown>) => {
        db.lastUpdate = v;
        return { eq: () => Promise.resolve({ error: db.erro }) };
      },
    }),
  },
}));

beforeEach(() => {
  db.lastInsert = null;
  db.lastUpdate = null;
  db.erro = null;
});

const sessao = (over: Partial<TreSession> = {}): TreSession =>
  ({
    id: "s1", patient_id: "p1", owner_id: "u1",
    iniciado_em: "2026-09-01T10:00:00Z", encerrado_em: null,
    modo_antes: "PCV", modo_durante: "psv",
    desfecho: null, motivo_interrupcao: null, criterios: {},
    ...over,
  } as TreSession);

const renderPanel = (
  sessoes: TreSession[] = [],
  over: { pendencias?: string[] } = {}
) =>
  render(
    <MemoryRouter>
      <TrePanel
        patientId="p1"
        ownerId="u1"
        modoAtual="PCV"
        sessoes={sessoes}
        pendencias={over.pendencias ?? []}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("TrePanel — sem sessão aberta", () => {
  it("oferece iniciar o teste", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /iniciar/i })).toBeInTheDocument();
  });

  it("grava a sessão com o modo anterior e a modalidade", async () => {
    const user = userEvent.setup();
    renderPanel();
    // Escolhe uma modalidade diferente da primeira da lista: se o valor
    // gravado fosse um default fixo, esta troca não apareceria no insert.
    await user.selectOptions(screen.getByLabelText(/modalidade do teste/i), "tubo_t");
    await user.click(screen.getByRole("button", { name: /iniciar/i }));
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p1", owner_id: "u1", modo_antes: "PCV", modo_durante: "tubo_t",
      });
    });
  });

  it("avisa quando a gravação falha, em vez de fingir que iniciou", async () => {
    const user = userEvent.setup();
    db.erro = { message: "sem permissão" };
    renderPanel();
    await user.click(screen.getByRole("button", { name: /iniciar/i }));
    await waitFor(() => {
      expect(screen.getByText(/sem permiss/i)).toBeInTheDocument();
    });
  });
});

describe("TrePanel — em andamento", () => {
  it("mostra os sete critérios de falha", () => {
    renderPanel([sessao()]);
    for (const c of CRITERIOS_FALHA) {
      expect(screen.getByText(c.label)).toBeInTheDocument();
    }
  });

  // O app não mede os 5 minutos de persistência de cada sinal: quem julga é o
  // terapeuta. Isso precisa estar dito na tela, não só no spec.
  it("diz que a persistência de 5 minutos é julgada pelo terapeuta", () => {
    renderPanel([sessao()]);
    // "5 min" sozinho passaria também com uma contagem regressiva por
    // critério — que é exatamente o que este app nunca deve mostrar. O que
    // prova a garantia é a frase que diz quem julga e o que é cronometrado.
    expect(screen.getByText(/cronometra a sessão, não cada critério/i)).toBeInTheDocument();
  });

  it("mostra o que ainda reprova na triagem sem bloquear o início", () => {
    // A prop `pendencias` vem da página, que já calcula a triagem.
    renderPanel([], { pendencias: ["PEEP ≤ 8"] });
    expect(screen.getByText(/PEEP ≤ 8/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /iniciar/i })).toBeEnabled();
  });
});

describe("TrePanel — em andamento", () => {
  it("oferece as três formas de encerrar", () => {
    renderPanel([sessao()]);
    expect(screen.getByRole("button", { name: /aprovado/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /falhou/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /interromper/i })).toBeInTheDocument();
  });

  it("encerra gravando o desfecho", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /aprovado/i }));
    await waitFor(() => {
      expect(db.lastUpdate).toMatchObject({ desfecho: "aprovado" });
      expect(db.lastUpdate).toHaveProperty("encerrado_em");
    });
  });

  // O app nunca encerra sozinho: um "aprovado" automático entraria na triagem
  // de extubação como critério atendido.
  it("mostra o tempo decorrido de uma sessão esquecida sem encerrá-la", () => {
    const ontem = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
    renderPanel([sessao({ iniciado_em: ontem })]);
    expect(screen.getByText(/840 min|14 h/i)).toBeInTheDocument();
    expect(db.lastUpdate).toBeNull();
  });
});

describe("TrePanel — histórico", () => {
  it("mostra o desfecho de uma sessão encerrada", () => {
    renderPanel([
      sessao({ desfecho: "interrompido", motivo_interrupcao: "tomografia",
               encerrado_em: "2026-09-01T10:20:00Z" }),
    ]);
    expect(screen.getByText(/interrompido/i)).toBeInTheDocument();
    expect(screen.getByText(/tomografia/i)).toBeInTheDocument();
  });
});

// ============================================================
// Daqui para baixo: o que a Task 5 existe para proteger.
// ============================================================

describe("TrePanel — interromper não é falhar", () => {
  const interromper = async (
    user: ReturnType<typeof userEvent.setup>,
    motivo: string
  ) => {
    await user.click(screen.getByRole("button", { name: /interromper/i }));
    await user.type(screen.getByLabelText(/motivo/i), motivo);
    await user.click(screen.getByRole("button", { name: /confirmar/i }));
  };

  // O defeito que esta fase existe para fechar: um teste parado por exame
  // gravado como 'falhou' vira bloqueador absoluto da triagem de extubação
  // por um paciente que nunca reprovou nada.
  it("grava 'interrompido', nunca 'falhou'", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await interromper(user, "tomografia");
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate).toMatchObject({
      desfecho: "interrompido",
      motivo_interrupcao: "tomografia",
    });
    expect(db.lastUpdate!.desfecho).not.toBe("falhou");
  });

  it("exige o motivo antes de confirmar a interrupção", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /interromper/i }));
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
    // Nada foi gravado enquanto o motivo está vazio.
    expect(db.lastUpdate).toBeNull();
  });

  it("diz na tela, ao lado dos botões, que interromper não é falha", () => {
    renderPanel([sessao()]);
    expect(screen.getByTestId("tre-aviso-interrupcao")).toHaveTextContent(
      /não é falha/i
    );
  });

  it("separa no histórico o teste reprovado do interrompido", () => {
    renderPanel([
      sessao({ id: "s1", desfecho: "falhou", encerrado_em: "2026-09-01T10:30:00Z" }),
      sessao({ id: "s2", desfecho: "interrompido", motivo_interrupcao: "tomografia",
               iniciado_em: "2026-09-01T12:00:00Z", encerrado_em: "2026-09-01T12:20:00Z" }),
    ]);
    expect(screen.getByTestId("tre-historico-s1")).toHaveTextContent(/bloqueia a extuba/i);
    expect(screen.getByTestId("tre-historico-s2")).toHaveTextContent(/não conta como falha/i);
    expect(screen.getByTestId("tre-historico-s2")).not.toHaveTextContent(/bloqueia a extuba/i);
  });
});

describe("TrePanel — critérios de falha", () => {
  it("grava a chave do critério marcado", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /taquipneia/i }));
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate!.criterios).toEqual({ taquipneia: { atingido: true } });
  });

  // Chave ausente é "não avaliado". Gravar `false` para os seis critérios que
  // ninguém olhou afirmaria uma avaliação que não houve.
  it("não grava os critérios que o terapeuta não tocou", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /taquipneia/i }));
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(Object.keys(db.lastUpdate!.criterios as object)).toEqual(["taquipneia"]);
  });

  it("desmarcar remove a chave em vez de gravar false", async () => {
    const user = userEvent.setup();
    renderPanel([sessao()]);
    const botao = screen.getByRole("button", { name: /taquipneia/i });
    await user.click(botao);
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    db.lastUpdate = null;
    await user.click(botao);
    await waitFor(() => expect(db.lastUpdate).not.toBeNull());
    expect(db.lastUpdate!.criterios).toEqual({});
  });

  it("reverte a marcação e avisa quando a gravação falha", async () => {
    const user = userEvent.setup();
    db.erro = { message: "sem permissão" };
    renderPanel([sessao()]);
    await user.click(screen.getByRole("button", { name: /taquipneia/i }));
    await waitFor(() => {
      expect(screen.getByText(/sem permiss/i)).toBeInTheDocument();
    });
    // A tela não pode ficar mostrando marcado o que o banco recusou.
    expect(screen.getByRole("button", { name: /taquipneia/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("já mostra marcado o critério que a sessão trouxe do banco", () => {
    renderPanel([sessao({ criterios: { acidose: { atingido: true } } })]);
    expect(screen.getByRole("button", { name: /acidose/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /taquicardia/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

describe("TrePanel — o que o painel mostra", () => {
  it("mostra a duração da sessão encerrada e só os critérios atingidos", () => {
    renderPanel([
      sessao({
        desfecho: "falhou",
        encerrado_em: "2026-09-01T10:20:00Z",
        criterios: { taquipneia: { atingido: true }, acidose: { atingido: false } },
      }),
    ]);
    const linha = screen.getByTestId("tre-historico-s1");
    expect(linha).toHaveTextContent("20 min");
    expect(within(linha).getByText("Taquipneia")).toBeInTheDocument();
    expect(linha).not.toHaveTextContent("Acidose");
  });

  // O relógio grande da sessão, separado do aviso de sessão esquecida. Ele
  // usa deslocamento a partir de Date.now() pelo mesmo motivo do teste das
  // 14 h: uma data fixa dependeria do relógio da máquina.
  it("mostra o tempo decorrido da sessão aberta", () => {
    const inicio = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    renderPanel([sessao({ iniciado_em: inicio })]);
    // O número e a unidade são elementos separados (o espaçamento é do flex),
    // então o texto normalizado do bloco vem sem espaço entre os dois.
    expect(screen.getByTestId("tre-duracao")).toHaveTextContent(/^45\s*min de teste$/);
  });

  it("cita a fonte dos critérios que exibe", () => {
    renderPanel([sessao()]);
    expect(screen.getByTestId("tre-fonte")).toHaveTextContent(/Boles, 2007/);
    expect(screen.getByTestId("tre-fonte")).toHaveTextContent(/AMIB\/SBPT, 2024/);
  });

  it("não mostra o painel de iniciar enquanto houver teste em andamento", () => {
    renderPanel([sessao()]);
    expect(screen.queryByRole("button", { name: /iniciar/i })).not.toBeInTheDocument();
  });
});
