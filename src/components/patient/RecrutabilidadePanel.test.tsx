import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecrutabilidadePanel } from "./RecrutabilidadePanel";
import type { RecruitmentManeuver } from "../../types";

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

const manobra = (over: Partial<RecruitmentManeuver> = {}): RecruitmentManeuver =>
  ({
    id: "m-1", patient_id: "p-1", owner_id: "u-1",
    realizada_em: "2026-09-02T10:00:00Z",
    passivo: true, fechamento_via_aerea: false, pressao_abertura: null,
    peep_alta: 15, peep_baixa: 5, volume_expirado_extra: 450,
    pplat_baixa: 20, vc_baixa: 450,
    desfecho: "concluida", motivo: null,
    ...over,
  } as RecruitmentManeuver);

const renderPanel = (manobras: RecruitmentManeuver[] = []) =>
  render(
    <MemoryRouter>
      <RecrutabilidadePanel
        patientId="p-1"
        ownerId="u-1"
        manobras={manobras}
        onChange={vi.fn()}
      />
    </MemoryRouter>
  );

describe("RecrutabilidadePanel", () => {
  it("sem manobra nenhuma, oferece registrar", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /registrar manobra/i }))
      .toBeInTheDocument();
  });

  // Fixture: C_baixa = 450/(20-5) = 30; V_inflado = 300; V_recrutado = 150;
  // R/I = 0,5.
  it("mostra a razão calculada da manobra concluída", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ri")).toHaveTextContent("0.5");
  });

  // O APLICATIVO NÃO DIZ SE O PACIENTE É RECRUTÁVEL. Nem em 0,5, que é
  // justamente a mediana que circula como corte, nem em nenhum outro valor.
  it("não emite veredito de recrutabilidade", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ri"))
      .not.toHaveTextContent(/recrut[áa]vel|responde|respondedor/i);
  });

  // O teste acima olha só o bloco do número. Um veredito escrito em qualquer
  // outro canto do painel passaria por ele — e a promessa do projeto é sobre o
  // painel inteiro, não sobre um elemento. Esta asserção é a promessa inteira.
  it("nenhum canto do painel classifica o paciente", () => {
    const { container } = renderPanel([manobra()]);
    expect(container.textContent ?? "")
      .not.toMatch(/recrut[áa]vel|respondedor|n[ãa]o responde/i);
  });

  it("diz que o 0,5 é mediana de coorte e não ponto de corte", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-ressalva")).toHaveTextContent(/mediana/i);
  });

  // R/I zero é RESULTADO: não recrutou nada. Diferente de manobra sem número.
  it("R/I zero aparece como resultado, não como manobra sem número", () => {
    renderPanel([manobra({ volume_expirado_extra: 300 })]);
    const ri = screen.getByTestId("rec-ri");
    expect(ri).toHaveTextContent("0");
    // "0" sozinho é satisfeito por qualquer número que contenha o dígito zero,
    // "0.5" inclusive: é a asserção do brief passando pelo motivo errado. Quem
    // distingue zero de qualquer outro resultado é a linha abaixo.
    expect(ri).toHaveTextContent("0.0");
  });

  // R/I negativo sai quando o volume expirado extra fica abaixo do insuflado:
  // é artefato de medida, e `calcularRi` não o recorta de propósito. Esconder o
  // valor na tela desfaria essa decisão e apagaria o sinal de que a medida saiu
  // errada. Fixture: V_inflado = 300 e volume expirado extra = 200.
  it("razão negativa aparece, com o problema de medida dito", () => {
    renderPanel([manobra({ volume_expirado_extra: 200 })]);
    const ri = screen.getByTestId("rec-ri");
    expect(ri).toHaveTextContent("-0.3");
    expect(ri).toHaveTextContent(/medida/i);
  });

  it("manobra abortada não mostra razão e diz por quê", () => {
    renderPanel([manobra({ desfecho: "abortada", passivo: false, motivo: "paciente disparando" })]);
    expect(screen.queryByTestId("rec-ri")).not.toBeInTheDocument();
    expect(screen.getByTestId("rec-desfecho")).toHaveTextContent(/abortada/i);
  });

  // Abortada e inconclusiva são coisas diferentes: uma não pôde ser feita, a
  // outra foi feita e não produziu número.
  it("manobra inconclusiva é distinta de abortada", () => {
    renderPanel([manobra({ desfecho: "inconclusiva" })]);
    const texto = screen.getByTestId("rec-desfecho");
    expect(texto).toHaveTextContent(/inconclusiva/i);
    expect(texto).not.toHaveTextContent(/abortada/i);
  });

  // Com fechamento, a PEEP baixa efetiva é a pressão de abertura: R/I = 5/7,
  // e não os 0,5 que sairiam sem a substituição.
  it("com fechamento de via aérea, usa a pressão de abertura", () => {
    renderPanel([manobra({ fechamento_via_aerea: true, pressao_abertura: 8 })]);
    const ri = screen.getByTestId("rec-ri");
    expect(ri).toHaveTextContent("0.7");
    expect(ri).not.toHaveTextContent("0.5");
  });

  it("cita a fonte do que exibe", () => {
    renderPanel([manobra()]);
    expect(screen.getByTestId("rec-fonte")).toHaveTextContent(/Chen, 2020/);
  });
});
