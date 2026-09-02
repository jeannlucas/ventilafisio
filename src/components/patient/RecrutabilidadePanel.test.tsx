import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { RecrutabilidadePanel } from "./RecrutabilidadePanel";
import type { ManobraDesfecho, RecruitmentManeuver } from "../../types";

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

const renderPanel = (
  manobras: RecruitmentManeuver[] = [],
  onChange: () => void = vi.fn()
) =>
  render(
    <MemoryRouter>
      <RecrutabilidadePanel
        patientId="p-1"
        ownerId="u-1"
        manobras={manobras}
        onChange={onChange}
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
      .not.toMatch(/recrut[áa]vel|respondedor|\bresponde\b/i);
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
    // Ancorado no que só existe no caso negativo: /medida/i era satisfeito por
    // "razão medida e não a classifica", que o bloco imprime sempre.
    expect(ri).toHaveTextContent(/negativa/i);
    expect(ri).toHaveTextContent(/volume expirado extra ficou abaixo/i);
  });

  it("manobra abortada não mostra razão e diz por quê", () => {
    renderPanel([manobra({ desfecho: "abortada", passivo: false, motivo: "paciente disparando" })]);
    expect(screen.queryByTestId("rec-ri")).not.toBeInTheDocument();
    const desfecho = screen.getByTestId("rec-desfecho");
    expect(desfecho).toHaveTextContent(/abortada/i);
    // O porquê vem do que foi registrado, não de um motivo cravado no rótulo:
    // abortar por instabilidade ou por dessaturação também cai aqui.
    expect(desfecho).toHaveTextContent(/paciente disparando/i);
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

/**
 * Manobras anteriores: a segunda encerrada em diante, que caem na lista do
 * histórico. Era o único ramo do painel sem teste nenhum, e foi por ali que
 * passou uma razão impressa sem a ressalva ao lado.
 */
describe("RecrutabilidadePanel — histórico de manobras anteriores", () => {
  // A mais recente é inconclusiva (não tem número); a antiga é concluída (tem).
  // Sem a correção, a tela mostrava "R/I 0.5" no histórico e NENHUMA ressalva:
  // número sem a única proteção que este painel oferece.
  it("razão no histórico nunca aparece sem a ressalva", () => {
    renderPanel([
      manobra({ id: "m-1", desfecho: "inconclusiva" }),
      manobra({ id: "m-2", realizada_em: "2026-09-01T10:00:00Z" }),
    ]);
    expect(screen.getByTestId("rec-historico-m-2")).toHaveTextContent("0.5");
    expect(screen.getByTestId("rec-ressalva")).toHaveTextContent(/mediana/i);
  });

  it("a linha traz desfecho e data, e razão só quando existe", () => {
    renderPanel([
      manobra(),
      manobra({ id: "m-2", realizada_em: "2026-08-30T10:00:00Z", desfecho: "inconclusiva" }),
      manobra({ id: "m-3", realizada_em: "2026-08-29T10:00:00Z" }),
    ]);
    const semNumero = screen.getByTestId("rec-historico-m-2");
    expect(semNumero).toHaveTextContent(/inconclusiva/i);
    expect(semNumero).toHaveTextContent("30/08");
    expect(semNumero).not.toHaveTextContent("R/I");
    expect(screen.getByTestId("rec-historico-m-3")).toHaveTextContent("R/I 0.5");
  });

  // A razão negativa é artefato de medida, e a linha do histórico é o único
  // canto do painel onde ela aparecia nua: "R/I -0.3" ao lado de uma ressalva
  // que fala da mediana da coorte e não diz nada sobre sinal negativo se lê
  // como recrutabilidade pífia, que é o contrário do que o número significa.
  // Fixture: a antiga tem volume expirado extra abaixo do insuflado (300).
  it("razão negativa no histórico vem com o problema de medida dito", () => {
    renderPanel([
      manobra(),
      manobra({
        id: "m-2",
        realizada_em: "2026-08-30T10:00:00Z",
        volume_expirado_extra: 200,
      }),
    ]);
    const linha = screen.getByTestId("rec-historico-m-2");
    expect(linha).toHaveTextContent("R/I -0.3");
    expect(linha).toHaveTextContent(/negativa/i);
    expect(linha).toHaveTextContent(/volume expirado extra ficou abaixo/i);
  });

  // O contrário do teste acima: razão que não é negativa não pode carregar o
  // aviso de artefato, ou ele viraria decoração de toda linha e pararia de
  // avisar coisa nenhuma.
  it("razão não negativa no histórico não recebe o aviso de artefato", () => {
    renderPanel([
      manobra(),
      manobra({ id: "m-2", realizada_em: "2026-08-30T10:00:00Z" }),
    ]);
    const linha = screen.getByTestId("rec-historico-m-2");
    expect(linha).toHaveTextContent("R/I 0.5");
    expect(linha).not.toHaveTextContent(/negativa/i);
  });

  it("desfecho fora do domínio não vira 'undefined' na tela", () => {
    renderPanel([
      manobra(),
      manobra({
        id: "m-9",
        realizada_em: "2026-08-28T10:00:00Z",
        desfecho: "coisa_nova" as ManobraDesfecho,
      }),
    ]);
    const linha = screen.getByTestId("rec-historico-m-9");
    expect(linha).toHaveTextContent(/não reconhecido/i);
    expect(linha).not.toHaveTextContent(/undefined/i);
  });
});

/**
 * Gravação. Nenhum caminho pode alegar sucesso numa escrita que falhou: o erro
 * aparece em `Alert` e o `onChange` só é chamado quando o banco aceitou.
 */
describe("RecrutabilidadePanel — gravação", () => {
  const registrarAbortada = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.selectOptions(screen.getByLabelText(/paciente passivo/i), "nao");
    await user.type(screen.getByLabelText("Motivo"), "paciente disparando");
    await user.click(screen.getByRole("button", { name: /registrar manobra/i }));
  };

  // Paciente não passivo: a manobra não pôde ser feita, e nasce abortada. Nunca
  // "em andamento", que afirmaria uma manobra que ninguém começou.
  it("registra como abortada a manobra que não pôde ser feita", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([], onChange);
    await registrarAbortada(user);
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p-1",
        owner_id: "u-1",
        passivo: false,
        desfecho: "abortada",
        motivo: "paciente disparando",
      });
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("insert recusado mostra o erro e não alega sucesso", async () => {
    db.erro = { message: "row-level security" };
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([], onChange);
    await registrarAbortada(user);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/row-level security/i);
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("concluir a manobra em andamento grava o desfecho", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([manobra({ desfecho: null })], onChange);
    await user.click(screen.getByRole("button", { name: /concluir manobra/i }));
    await waitFor(() => {
      expect(db.lastUpdate).toMatchObject({ desfecho: "concluida", motivo: null });
    });
    expect(onChange).toHaveBeenCalled();
  });

  /**
   * Preenche a manobra inteira, com o volume corrente em PEEP baixa por
   * parâmetro: é o campo que os dois testes de plausibilidade variam.
   */
  const preencher = async (
    user: ReturnType<typeof userEvent.setup>,
    vcBaixa: string
  ) => {
    await user.selectOptions(screen.getByLabelText("1. Paciente passivo?"), "sim");
    await user.selectOptions(screen.getByLabelText("2. Fechamento de via aérea?"), "nao");
    await user.type(screen.getByLabelText(/4\. PEEP alta/), "15");
    await user.type(screen.getByLabelText(/5\. PEEP baixa/), "5");
    await user.type(screen.getByLabelText(/6\. Volume expirado extra/), "450");
    await user.type(screen.getByLabelText(/7\. Platô em PEEP baixa/), "20");
    await user.type(screen.getByLabelText(/8\. Volume corrente em PEEP baixa/), vcBaixa);
    await user.click(screen.getByRole("button", { name: /registrar manobra/i }));
  };

  // Volume corrente zero em paciente ventilado não existe: a mesma cerca de
  // plausibilidade que o resto do app usa recusa o valor. Sem ela, o número
  // atravessava a tela e voltava formatado com uma casa decimal, como se fosse
  // medida — a forma de defeito mais antiga deste projeto.
  it("valor implausível não é gravado e o problema aparece na tela", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([], onChange);
    await preencher(user, "0");
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/volume corrente em peep baixa/i);
    });
    // O rótulo da manobra é o que diz QUAL campo corrigir: a cerca fala em
    // "VC", e dois campos da manobra caem nela.
    expect(screen.getByRole("alert")).toHaveTextContent(/maior que zero/i);
    expect(db.lastInsert).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a manobra plausível continua sendo gravada", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([], onChange);
    await preencher(user, "450");
    await waitFor(() => {
      expect(db.lastInsert).toMatchObject({
        patient_id: "p-1",
        passivo: true,
        fechamento_via_aerea: false,
        peep_alta: 15,
        peep_baixa: 5,
        volume_expirado_extra: 450,
        pplat_baixa: 20,
        vc_baixa: 450,
        desfecho: null,
      });
    });
    expect(onChange).toHaveBeenCalled();
  });

  it("update recusado mostra o erro e não alega sucesso", async () => {
    db.erro = { message: "update recusado" };
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPanel([manobra({ desfecho: null })], onChange);
    await user.click(screen.getByRole("button", { name: /concluir manobra/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/update recusado/i);
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
