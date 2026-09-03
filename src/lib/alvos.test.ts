import { describe, it, expect } from "vitest";
import { sugerirVc, sugerirPeepFio2, sugerirVentilacao, alvoPaco2, sugestaoAdmissao } from "./alvos";
import { derivarPerfil } from "./perfil";
import type { PerfilClinico, PatologiaKey } from "./perfil";
import type { Patient } from "../types";

const perfil = (over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias: [], ...over,
});

const perfilCom = (patologias: PatologiaKey[], over: Partial<PerfilClinico> = {}): PerfilClinico => ({
  pbw: 70, pbwEstimado: false, obeso: false, obesoIndeterminado: false,
  patologias, ...over,
});

// Mesma fixture mínima de perfil.test.ts: só os campos que derivarPerfil lê
// importam para estes testes.
const paciente = (over: Partial<Patient> = {}): Patient =>
  ({
    id: "p1", owner_id: "u1", hospital_id: null, name: "Paciente Teste",
    age: 60, sex: "M", diagnosis: null, comorbidities: [], intubation_date: null,
    airway: null, height_cm: 170, weight_kg: 70, ventilator_id: null,
    current_mode: "VCV", status: "active", discharge_reason: null,
    discharge_date: null, created_at: "", updated_at: "", ...over,
  } as Patient);

describe("sugerirVc", () => {
  it("mantém a faixa de 4 a 6 ml/kg no paciente não obeso", () => {
    const a = sugerirVc(perfil())!;
    expect(a.valor.lowKg).toBe(4);
    expect(a.valor.highKg).toBe(6);
  });

  // Sem modulação, `base` é igual a `valor` e a lista fica vazia.
  it("não declara modulação quando não modulou", () => {
    const a = sugerirVc(perfil())!;
    expect(a.modulacoes).toEqual([]);
    expect(a.base).toEqual(a.valor);
  });

  it("desloca a faixa para 6 a 8 ml/kg no paciente obeso", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.valor.lowKg).toBe(6);
    expect(a.valor.highKg).toBe(8);
  });

  // O ponto da fase: o número que mudou carrega quem mandou mudar.
  it("declara a modulação da obesidade, com razão e fonte", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes[0].motivo).toMatch(/obes/i);
    // Chave própria: o parecer do mentor sustenta a faixa 6-8 DO OBESO. Sob
    // `vcKg` ele passaria a ser citado no rodapé de todo paciente, embaixo da
    // faixa 4-6, que ele não sustenta.
    expect(a.modulacoes[0].sourceKey).toBe("vcKgObeso");
  });

  // `base` guarda o que seria sem modulação: é isso que a tela mostra como
  // "padrão seria", e sem ele o avaliador não vê que houve ajuste.
  it("preserva em base o alvo que valeria sem a modulação", () => {
    const a = sugerirVc(perfil({ obeso: true }))!;
    expect(a.base.lowKg).toBe(4);
    expect(a.base.highKg).toBe(6);
  });

  // Não há teste de retorno nulo: PerfilClinico.pbw é sempre número, porque
  // pbwOrEstimate estima pela média populacional quando falta altura. Um
  // teste com pbw: 0 passaria pelo `num()` da implementação antiga (zero é
  // finito) e não provaria nada.

  it("usa a faixa protetora 4 a 6 com alvo 6 para o não obeso (migrado de clinical.test.ts)", () => {
    const a = sugerirVc(perfil({ pbw: 70, obeso: false }));
    expect(a.valor).toMatchObject({ lowKg: 4, highKg: 6, targetKg: 6 });
    expect(a.valor.low).toBe(280);
    expect(a.valor.high).toBe(420);
    expect(a.valor.target).toBe(420);
    expect(a.valor.ml6).toBe(420);
    expect(a.valor.ml8).toBe(560);
  });

  it("usa a faixa 6 a 8 com alvo 7 para o obeso (migrado de clinical.test.ts)", () => {
    const a = sugerirVc(perfil({ pbw: 70, obeso: true }));
    expect(a.valor).toMatchObject({ lowKg: 6, highKg: 8, targetKg: 7 });
    expect(a.valor.low).toBe(420);
    expect(a.valor.high).toBe(560);
    expect(a.valor.target).toBe(490);
  });
});

// ============================================================
// Migrado de clinical.test.ts — sem modulação nesta fase.
// ============================================================
describe("sugerirPeepFio2", () => {
  it("sem gasometria e sem oximetria devolve o preset de admissão", () => {
    const a = sugerirPeepFio2(null, null, perfil(), null);
    expect(a.valor).toEqual({ fio2: 100, peep: 5, faixaPeep: null, presetAdmissao: true });
    expect(a.modulacoes).toEqual([]);
  });

  it("desce na tabela ARDSnet conforme a relação P/F", () => {
    expect(sugerirPeepFio2(350, null, perfil(), null).valor).toMatchObject({ fio2: 30, peep: 5 });
    expect(sugerirPeepFio2(250, null, perfil(), null).valor).toMatchObject({ fio2: 40, peep: 5 });
    expect(sugerirPeepFio2(150, null, perfil(), null).valor).toMatchObject({ fio2: 60, peep: 10 });
    expect(sugerirPeepFio2(50, null, perfil(), null).valor).toMatchObject({ fio2: 80, peep: 14 });
  });

  it("sobe a FiO2 um degrau quando a saturação está abaixo de 90", () => {
    expect(sugerirPeepFio2(350, 85, perfil(), null).valor).toMatchObject({ fio2: 40, peep: 5 });
  });

  it("sem gasometria mas com oximetria parte de FiO2 40", () => {
    expect(sugerirPeepFio2(null, 95, perfil(), null).valor).toMatchObject({
      fio2: 40,
      peep: 5,
      presetAdmissao: false,
    });
  });
});

describe("sugerirVentilacao", () => {
  it("deriva a frequência do volume-minuto de 100 ml por kg de peso predito", () => {
    const p = perfilCom([]);
    const a = sugerirVentilacao(p.pbw, sugerirVc(p).valor.target, p)!;
    expect(a.valor.veL).toBeCloseTo(7, 6);
    expect(a.valor.fr).toBe(17);
  });

  // Os dois casos abaixo exercitam o CLAMP, e só ele: o peso predito se cancela
  // na conta, então nenhum alvo que `sugerirVc` produz chega perto de 12 ou de
  // 35. Por isso o volume alvo aqui é digitado à mão, ao contrário do teste
  // acima, e por isso estes dois não provam nada sobre paciente nenhum.
  it("limita a frequência ao piso de 12", () => {
    expect(sugerirVentilacao(70, 1000, perfilCom([]))!.valor.fr).toBe(12);
  });

  it("limita a frequência ao teto de 35", () => {
    expect(sugerirVentilacao(70, 100, perfilCom([]))!.valor.fr).toBe(35);
  });

  it("devolve null sem peso predito ou sem volume alvo", () => {
    expect(sugerirVentilacao(null, 420, perfilCom([]))).toBeNull();
    expect(sugerirVentilacao(70, null, perfilCom([]))).toBeNull();
  });
});

describe("sugerirVentilacao por patologia", () => {
  // Fixture ALCANÇÁVEL: o alvo de volume vem de `sugerirVc`, e não de um número
  // digitado à mão. Um volume que a aplicação nunca produz exercita um ramo que
  // nenhum paciente alcança, e foi assim que o piso obstrutivo de 10 ficou
  // "testado" enquanto na tela ele nunca entrava em vigor.
  const frDe = (patologias: PatologiaKey[], over: Partial<PerfilClinico> = {}) => {
    const p = perfilCom(patologias, over);
    return sugerirVentilacao(p.pbw, sugerirVc(p).valor.target, p)!;
  };

  it("sem patologia, não há modulação de frequência", () => {
    const a = frDe([]);
    expect(a.modulacoes).toEqual([]);
    expect(a.valor.fr).toBe(a.base.fr);
  });

  // O ponto do item 1: o aplicativo NÃO rebaixa a frequência do obstrutivo. O
  // peso predito se cancela em `bruto = veL / vcTarget`, então o piso jamais
  // entrava em vigor e a tela afirmava um rebaixamento que nunca acontecia.
  it("a frequência do obstrutivo é idêntica à do não obstrutivo, mesmo peso e mesmo alvo de volume", () => {
    const semPatologia = frDe([]);
    for (const patologia of ["dpoc", "asma"] as const) {
      const a = frDe([patologia]);
      expect(a.valor.fr).toBe(semPatologia.valor.fr);
      expect(a.valor.fr).toBe(a.base.fr);
    }
  });

  // Vale também no obeso, cujo alvo de volume é outro (7 ml/kg, não 6): a
  // igualdade é entre obstrutivo e não obstrutivo COM O MESMO alvo, não uma
  // frequência fixa.
  it("a igualdade vale no obeso, cujo alvo de volume é outro", () => {
    expect(frDe(["dpoc"], { obeso: true }).valor.fr).toBe(frDe([], { obeso: true }).valor.fr);
    expect(frDe(["dpoc"], { obeso: true }).valor.fr).not.toBe(frDe(["dpoc"]).valor.fr);
  });

  // A modulação continua existindo (Demoule 2020 é real e publicado), mas
  // passa a dizer só o que é verdade. Se alguém reintroduzir a afirmação de
  // rebaixamento, é aqui que fica vermelho. A varredura é sobre TODAS as
  // modulações, e não sobre a primeira: desde 03/09/2026 são duas, e um piso
  // reintroduzido na segunda passaria por um `modulacoes[0]`.
  it("a modulação do obstrutivo não afirma rebaixamento nem piso de frequência", () => {
    for (const patologia of ["dpoc", "asma"] as const) {
      const a = frDe([patologia]);
      for (const m of a.modulacoes) expect(m.motivo).not.toMatch(/baixad|piso/i);
      expect(a.modulacoes.some((m) => /1:4 a 1:6/.test(m.motivo))).toBe(true);
      expect(a.modulacoes.some((m) => /terapeuta/i.test(m.motivo))).toBe(true);
      expect(a.modulacoes.some((m) => m.sourceKey === "obstrutivo")).toBe(true);
    }
  });

  // A1 (parecer de 03/09/2026): "Frequência sempre decidida na beira do leito."
  // A ausência do piso deixou de valer por falta de fonte e passou a valer por
  // decisão registrada. A chave é PRÓPRIA: sob `obstrutivo` o parecer passaria
  // a ser citado também no rodapé do ramo da PEEP, que ele não sustenta.
  it("o obstrutivo cita o parecer da frequência, em chave própria e além de Demoule", () => {
    for (const patologia of ["dpoc", "asma"] as const) {
      const a = frDe([patologia]);
      const chaves = a.modulacoes.map((m) => m.sourceKey);
      expect(chaves).toContain("obstrutivo");
      expect(chaves).toContain("frObstrutivo");
      const parecer = a.modulacoes.find((m) => m.sourceKey === "frObstrutivo")!;
      expect(parecer.motivo).toMatch(/beira do leito/i);
      // Nenhum número entrou junto com o parecer.
      expect(parecer.motivo).not.toMatch(/\d/);
    }
  });

  // O não obstrutivo não recebe nem uma nem outra: o parecer é sobre o
  // obstrutivo, e citá-lo em todo paciente seria o mesmo defeito de sempre.
  it("o não obstrutivo não cita o parecer da frequência", () => {
    expect(frDe([]).modulacoes).toEqual([]);
  });

  // Lesão cerebral aguda não mexe na frequência: o alvo dela é de PaCO₂, e
  // vem por outra função.
  it("lesão cerebral aguda não modula a frequência", () => {
    expect(frDe(["lesao_cerebral_aguda"]).modulacoes).toEqual([]);
  });

  it("continua devolvendo null sem peso predito ou volume alvo", () => {
    expect(sugerirVentilacao(null, 420, perfilCom([]))).toBeNull();
    expect(sugerirVentilacao(70, null, perfilCom([]))).toBeNull();
  });
});

describe("alvoPaco2", () => {
  it("sem lesão cerebral aguda, não há alvo", () => {
    expect(alvoPaco2(perfilCom([]))).toBeNull();
    expect(alvoPaco2(perfilCom(["dpoc"]))).toBeNull();
  });

  it("com lesão cerebral aguda, devolve 35 a 45", () => {
    const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda"]))!;
    expect(a.valor).toEqual({ min: 35, max: 45 });
    expect(a.modulacoes[0].sourceKey).toBe("lesaoCerebral");
  });

  // A recomendação vale para o paciente SEM hipertensão intracraniana
  // significativa, e o aplicativo não conhece a pressão intracraniana.
  it("a modulação declara a condição da hipertensão intracraniana", () => {
    const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda"]))!;
    expect(a.modulacoes[0].motivo).toMatch(/intracraniana/i);
  });

  // ---------- A4: no TCE com obstrutivo, o TCE manda ----------
  // Parecer de 03/09/2026: "não pode haver retenção de CO2". A hipercapnia
  // permissiva usual do obstrutivo deixa de ser opção.
  it("com lesão cerebral aguda E obstrutivo, recusa a hipercapnia permissiva", () => {
    for (const obstrutiva of ["dpoc", "asma"] as const) {
      const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda", obstrutiva]))!;
      // O alvo NÃO muda de número: o que entra é a recusa da exceção.
      expect(a.valor).toEqual({ min: 35, max: 45 });
      const m = a.modulacoes.find((x) => x.sourceKey === "paco2Obstrutivo");
      expect(m).toBeDefined();
      expect(m!.motivo).toMatch(/hipercapnia permissiva/i);
      expect(m!.motivo).toMatch(/retenção de CO₂/i);
    }
  });

  // ESTE é o teste que impede a modulação de virar incondicional. Ela é do
  // PAR: citada em todo TCE, o rodapé passaria a trazer um parecer sobre
  // obstrutivo embaixo da tela de quem não tem obstrutivo nenhum — o mesmo
  // defeito que a chave própria existe para evitar.
  it("o TCE sem obstrutivo não recebe a modulação do obstrutivo", () => {
    const a = alvoPaco2(perfilCom(["lesao_cerebral_aguda"]))!;
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes.map((m) => m.sourceKey)).not.toContain("paco2Obstrutivo");
    expect(a.modulacoes[0].motivo).not.toMatch(/hipercapnia permissiva/i);
  });

  // E o obstrutivo sem lesão cerebral continua sem alvo de PaCO₂ nenhum: a
  // modulação nova não pode abrir a porta que `alvoPaco2` mantém fechada.
  it("o obstrutivo sem lesão cerebral aguda continua sem alvo de PaCO₂", () => {
    expect(alvoPaco2(perfilCom(["dpoc"]))).toBeNull();
    expect(alvoPaco2(perfilCom(["asma"]))).toBeNull();
    expect(alvoPaco2(perfilCom(["dpoc", "asma"]))).toBeNull();
  });
});

describe("sugestaoAdmissao", () => {
  it("com altura e peso completos não sinaliza estimativa", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: 70 }));
    const s = sugestaoAdmissao(p, null, null, "PCV");
    expect(s.pbwEstimado).toBe(false);
    expect(s.obesoIndeterminado).toBe(false);
    expect(s.obeso).toBe(false);
    expect(s.modo).toBe("PCV");
  });

  it("sem altura estima o peso predito e sinaliza", () => {
    const p = derivarPerfil(paciente({ sex: "F", height_cm: null, weight_kg: null }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.pbwEstimado).toBe(true);
    expect(s.obesoIndeterminado).toBe(true);
    expect(s.modo).toBe("VCV");
  });

  it("assume a faixa protetora quando não há IMC", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: null }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obesoIndeterminado).toBe(true);
    expect(s.obeso).toBe(false);
    expect(s.vc.valor).toMatchObject({ lowKg: 4, highKg: 6 });
  });

  it("reconhece o obeso pelo IMC e estende a faixa de volume", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 170, weight_kg: 95 }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obeso).toBe(true);
    expect(s.vc.valor).toMatchObject({ lowKg: 6, highKg: 8 });
  });

  // Defeito B2 (histórico): altura zero produzia IMC infinito e classificava
  // como obeso, estendendo o alvo de volume corrente para 6 a 8 ml/kg.
  it("altura impossível não classifica o paciente como obeso", () => {
    const p = derivarPerfil(paciente({ sex: "M", height_cm: 0, weight_kg: 70 }));
    const s = sugestaoAdmissao(p, null, null, null);
    expect(s.obeso).toBe(false);
    expect(s.obesoIndeterminado).toBe(true);
  });
});

describe("sugerirPeepFio2 por patologia", () => {
  it("sem patologia, devolve a tabela ARDSnet e nenhuma modulação", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom([]), null);
    expect(a.valor.peep).toBe(10);
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes).toEqual([]);
  });

  // A tabela daria 10; a asma limita a 5. Direção OPOSTA à do DPOC.
  it("asma limita a PEEP a 5", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["asma"]), null);
    expect(a.valor.peep).toBe(5);
    expect(a.base.peep).toBe(10);
    expect(a.modulacoes.length).toBe(1);
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  it("asma não eleva a PEEP quando a tabela já dá menos de 5", () => {
    const a = sugerirPeepFio2(400, 98, perfilCom(["asma"]), null);
    expect(a.valor.peep).toBe(5);
  });

  // Sem auto-PEEP medido o aplicativo NÃO tem número de PEEP para o DPOC.
  // Devolver o da tabela seria afirmar que ela se aplica, e ela não se aplica.
  it("DPOC sem auto-PEEP não produz número de PEEP", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), null);
    expect(a.valor.peep).toBeNull();
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes.length).toBe(1);
  });

  // 80 a 85% de 10 = 8 a 8,5. A FAIXA, não um número: Ranieri diz 85% e
  // Demoule diz 80%, e fundir os dois esconderia a divergência.
  it("DPOC com auto-PEEP produz a faixa de 80 a 85% dele", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 10);
    expect(a.valor.peep).toBeNull();
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
  });

  // Auto-PEEP ZERO é medida, e boa: ausência de aprisionamento aéreo. A faixa
  // de 80 a 85% perde o referente ali, e o aplicativo recusa número — antes
  // disso ele multiplicava o zero por 0,8 e prescrevia "0,0 a 0,0 cmH₂O" a um
  // paciente que podia estar com P/F 150.
  //
  // Recusar por zero NÃO é confundir zero com ausência: os dois caminhos
  // recusam, por razões diferentes, e o par de testes abaixo é o que separa os
  // dois textos. Se alguém fundir os dois ramos, um deles fica vermelho.
  it("auto-PEEP zero é lido como medida e recusa faixa, com motivo próprio", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 0);
    expect(a.valor.peep).toBeNull();
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes[0].motivo).toMatch(/zero/i);
    expect(a.modulacoes[0].motivo).toMatch(/aprisionamento/i);
    // O motivo do zero NÃO é o do não medido.
    expect(a.modulacoes[0].motivo).not.toMatch(/não foi medido/i);
  });

  it("o motivo do auto-PEEP não medido não é o do auto-PEEP zero", () => {
    const ausente = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), null).modulacoes[0].motivo;
    const zero = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 0).modulacoes[0].motivo;
    expect(ausente).toMatch(/não foi medido/i);
    expect(ausente).not.toBe(zero);
  });

  // O corte é em zero EXATO, e só nele: zero é a ausência do fenômeno, não um
  // limiar. Um piso do tipo "abaixo de 2 também recusa" seria número clínico
  // sem fonte.
  it("auto-PEEP pequeno mas diferente de zero continua produzindo faixa", () => {
    expect(sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 1).valor.faixaPeep).toEqual({
      min: 0.8,
      max: 0.85,
    });
  });

  // ---------- A2: o auto-PEEP baixo é RESSALVA, nunca supressão ----------
  // O mentor recusou o limiar com todas as letras em 03/09/2026: "não existe um
  // valor mágico de auto-PEEP a partir do qual a regra passa a ser
  // obrigatória". O 3 do parecer decide se aparece um texto A MAIS, e nada
  // mais: nenhum valor muda em 3.
  //
  // Este é o teste que fica vermelho se alguém transformar o 3 em corte. Ele
  // varre a vizinhança inteira da fronteira, inclusive o 3 exato, porque um
  // `<`, um `<=` ou um `return null` mudariam o resultado em pontos
  // diferentes.
  it("a faixa do DPOC sobrevive a qualquer auto-PEEP acima de zero, inclusive abaixo de 3", () => {
    for (const autoPeep of [0.5, 1, 2, 2.9, 3, 3.5, 4, 10]) {
      const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), autoPeep);
      expect(a.valor.faixaPeep).toEqual({
        min: autoPeep * 0.8,
        max: autoPeep * 0.85,
      });
    }
  });

  // Ressalva (a): vale SEMPRE que há faixa, inclusive com auto-PEEP alto. Sem
  // ela a tela sugeria que a PEEP externa existe para corrigir o número do
  // auto-PEEP, que é justamente o que o mentor disse não ser o objetivo.
  it("toda faixa de PEEP carrega o objetivo real da PEEP externa, com fonte própria", () => {
    for (const autoPeep of [1, 4, 10]) {
      const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), autoPeep);
      const r = a.modulacoes.find((m) => m.sourceKey === "autoPeepAplicacao" && /limiar de disparo/i.test(m.motivo));
      expect(r).toBeDefined();
      expect(r!.motivo).toMatch(/hiperinsuflação/i);
      expect(r!.motivo).toMatch(/não corrigir o número do auto-PEEP/i);
    }
  });

  // Ressalva (b): só abaixo de 3, e é texto A MAIS — a faixa continua exibida
  // (o teste acima é quem prova isso). O ponto que o mentor destacou como o
  // mais importante é que auto-PEEP baixo NÃO exclui hiperinsuflação.
  it("abaixo de 3, o auto-PEEP ganha a ressalva a mais, sem perder a faixa", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 2);
    expect(a.valor.faixaPeep).toEqual({ min: 1.6, max: 1.7 });
    const extra = a.modulacoes.find((m) => /não exclui hiperinsuflação/i.test(m.motivo));
    expect(extra).toBeDefined();
    expect(extra!.sourceKey).toBe("autoPeepAplicacao");
    expect(extra!.motivo).toMatch(/pausa expiratória/i);
    expect(extra!.motivo).toMatch(/fluxo expiratório retorna a zero/i);
  });

  // A fronteira é `< 3`, mesma convenção de inclusividade das faixas de
  // esforço. Em 3 exato a ressalva a mais NÃO aparece, e a faixa continua.
  it("em 3 e acima, a ressalva a mais não aparece", () => {
    for (const autoPeep of [3, 4, 10]) {
      const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), autoPeep);
      expect(a.modulacoes.some((m) => /não exclui hiperinsuflação/i.test(m.motivo))).toBe(false);
      expect(a.valor.faixaPeep).not.toBeNull();
    }
  });

  // Sem faixa não há ressalva de aplicação: fonte sem afirmação acima dela é
  // ruído, e os dois caminhos que recusam número não têm regra a ressalvar.
  it("os caminhos que recusam a faixa não citam a ressalva da aplicação", () => {
    for (const autoPeep of [null, 0]) {
      const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), autoPeep);
      expect(a.valor.faixaPeep).toBeNull();
      expect(a.modulacoes.map((m) => m.sourceKey)).not.toContain("autoPeepAplicacao");
    }
  });

  // ---------- A3: asma e DPOC mostram os DOIS limites ----------
  // Parecer de 03/09/2026: o mentor não tinha resposta e pediu minúcia nos dois
  // casos. O aplicativo deixou de escolher e passou a exibir os dois lado a
  // lado, como já faz com os 80% e os 85%.
  it("asma e DPOC com auto-PEEP medido mostram os DOIS limites", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), 10);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
    expect(a.modulacoes.some((m) => m.sourceKey === "asmaDpoc")).toBe(true);
    const decisao = a.modulacoes.find((m) => m.sourceKey === "asmaDpoc")!;
    expect(decisao.motivo).toMatch(/ninguém decidiu/i);
  });

  // O que o texto NÃO pode fazer é comparar os dois por conta própria: eleger
  // um deles é decisão do mentor, e ele não a tomou. A varredura é sobre todas
  // as modulações, porque o defeito caberia em qualquer uma delas.
  it("com os dois limites na tela, nenhum texto diz qual é o mais restritivo", () => {
    for (const autoPeep of [1, 4, 10]) {
      const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), autoPeep);
      expect(a.valor.peep).toBe(5);
      expect(a.valor.faixaPeep).not.toBeNull();
      for (const m of a.modulacoes) {
        expect(m.motivo).not.toMatch(/conservador|mais restritiv|vale o menor|prefira|use o/i);
      }
    }
  });

  // Com auto-PEEP baixo, 80% dele fica ABAIXO de 5 — e agora os dois números
  // aparecem juntos na tela, então quem compara é o terapeuta, com os dois à
  // vista. Antes o aplicativo escondia o do DPOC e mostrava só o 5.
  it("com auto-PEEP baixo, os dois limites continuam aparecendo, e as ressalvas junto", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), 2);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.faixaPeep).toEqual({ min: 1.6, max: 1.7 });
    expect(a.modulacoes.some((m) => /não exclui hiperinsuflação/i.test(m.motivo))).toBe(true);
  });

  // Zero é MEDIDA, e boa: a regra do DPOC perde o referente e só o teto da asma
  // sobra. Distinto do não medido, e o par de testes abaixo é o que separa os
  // dois textos — a mesma garantia que já existe no DPOC puro.
  it("asma e DPOC com auto-PEEP zero mostram só o teto da asma, com motivo próprio", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), 0);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.faixaPeep).toBeNull();
    const m = a.modulacoes.map((x) => x.motivo).join(" ");
    expect(m).toMatch(/zero/i);
    expect(m).toMatch(/aprisionamento/i);
    expect(m).not.toMatch(/não foi medido/i);
    expect(m).not.toMatch(/registre o auto-PEEP/i);
  });

  it("asma e DPOC sem auto-PEEP medido pedem a medida, e o texto não é o do zero", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), null);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.faixaPeep).toBeNull();
    const m = a.modulacoes.map((x) => x.motivo).join(" ");
    expect(m).toMatch(/não foi medido/i);
    expect(m).toMatch(/registre o auto-PEEP/i);
    expect(m).not.toMatch(/aprisionamento/i);
  });

  // O teto da asma sobrevive nos três casos: o que varia é só o limite do
  // DPOC, que só existe com auto-PEEP acima de zero.
  it("o teto da asma vale nos três estados do auto-PEEP", () => {
    for (const autoPeep of [null, 0, 10]) {
      expect(sugerirPeepFio2(150, 95, perfilCom(["dpoc", "asma"]), autoPeep).valor.peep).toBe(5);
    }
  });

  it("o preset de admissão continua valendo sem gasometria nem oximetria", () => {
    const a = sugerirPeepFio2(null, null, perfilCom([]), null);
    expect(a.valor.presetAdmissao).toBe(true);
  });

  // ---------- O preset não passa na frente do obstrutivo com auto-PEEP ----------
  // Cenário corriqueiro: dia sem gasometria, com os parâmetros do ventilador e
  // o auto-PEEP registrados. O portão do preset vinha ANTES do da patologia,
  // então o auto-PEEP recém-digitado era descartado em silêncio e a caixa
  // mostrava "5 cmH₂O · tabela ARDSnet" — a tabela que não se aplica ao DPOC.
  it("obstrutivo sem gasometria mas com auto-PEEP recebe a faixa de PEEP", () => {
    const a = sugerirPeepFio2(null, null, perfilCom(["dpoc"]), 10);
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  // A OUTRA METADE, e é o que separa as duas perguntas: o auto-PEEP medido abre
  // a regra da PEEP e não diz nada sobre oxigenação. Sem P/F e sem SpO₂ a FiO₂
  // continua sendo a do preset (100%), com `presetAdmissao` verdadeiro para a
  // tela poder dizer de onde ela veio.
  //
  // Sem esta asserção o paciente caía na tabela por causa do auto-PEEP e o
  // `if (!num(pf)) fio2 = 40` devolvia FiO₂ 40% — número afirmativo nascido de
  // dado nenhum, com `presetAdmissao` falso, e ainda por cima BAIXO, onde o
  // padrão seguro sem informação é 100%. É a armadilha nº 5 do projeto: a
  // ausência de dado virando resultado.
  it("obstrutivo sem oxigenação não ganha FiO₂ da tabela por causa do auto-PEEP", () => {
    const a = sugerirPeepFio2(null, null, perfilCom(["dpoc"]), 10);
    expect(a.valor.fio2).toBe(100);
    expect(a.valor.presetAdmissao).toBe(true);
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
  });

  it("asma sem gasometria mas com auto-PEEP recebe o teto da asma sobre a base do preset", () => {
    const a = sugerirPeepFio2(null, null, perfilCom(["asma"]), 10);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.fio2).toBe(100);
    expect(a.valor.presetAdmissao).toBe(true);
    expect(a.modulacoes[0].motivo).toMatch(/asma/i);
  });

  // Com oxigenação medida, nada disso muda: a base volta a ser a tabela.
  it("com oxigenação medida o obstrutivo continua saindo da tabela", () => {
    const a = sugerirPeepFio2(150, 95, perfilCom(["dpoc"]), 10);
    expect(a.valor.fio2).toBe(60);
    expect(a.valor.presetAdmissao).toBe(false);
    expect(a.valor.faixaPeep).toEqual({ min: 8, max: 8.5 });
  });

  // Sem auto-PEEP o preset continua devolvendo 5 — não se tira do terapeuta o
  // ponto de partida na hora de montar o ventilador. O que ele deixa de fazer é
  // sair calado.
  it("DPOC sem gasometria e sem auto-PEEP recebe o preset COM modulação", () => {
    const a = sugerirPeepFio2(null, null, perfilCom(["dpoc"]), null);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.presetAdmissao).toBe(true);
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes[0].motivo).toMatch(/ponto de partida/i);
    expect(a.modulacoes[0].motivo).toMatch(/auto-PEEP/i);
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  // A asma NÃO cai no ramo do ponto de partida, e é por isso que ele mora
  // abaixo do teto da asma. O teto dela é 5 fixo: com auto-PEEP 10 o mesmo
  // paciente continua recebendo 5, então mandá-lo registrar o auto-PEEP pede
  // uma medida que a regra não usa. E como o AdmissionCard sempre chama com
  // `autoPeep` nulo, era TODA admissão de asmático mostrando o pedido inútil.
  it("asma sem gasometria e sem auto-PEEP recebe o teto da asma, não o pedido de auto-PEEP", () => {
    const a = sugerirPeepFio2(null, null, perfilCom(["asma"]), null);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.presetAdmissao).toBe(true);
    expect(a.modulacoes).toHaveLength(1);
    expect(a.modulacoes[0].motivo).toMatch(/asma/i);
    expect(a.modulacoes[0].motivo).not.toMatch(/registre o auto-PEEP/i);
    expect(a.modulacoes[0].sourceKey).toBe("obstrutivo");
  });

  // O texto que pede o auto-PEEP não alcança a ASMA PURA, em caminho nenhum,
  // com ou sem auto-PEEP, com ou sem oxigenação: o teto dela é 5 fixo, e com
  // auto-PEEP 10 o mesmo paciente continua recebendo 5. Pedir uma medida que a
  // regra não usa é o defeito de ORDEM de ramo que este teste guarda — o
  // pedido nascia acima do teto da asma e alcançava todo asmático.
  //
  // ESTREITADO em 03/09/2026, de propósito. Antes ele varria também a dupla
  // asma + DPOC, e varria com razão: enquanto o ramo da dupla ignorava o
  // auto-PEEP, pedi-lo ali era tão inútil quanto na asma pura. Com A3 a dupla
  // passou a USAR a medida — os dois limites saem lado a lado —, então pedi-la
  // virou correto, e o teste oposto está logo acima ("asma e DPOC sem
  // auto-PEEP medido pedem a medida"). A variante da asma pura fica, porque é
  // ela que guarda o defeito original.
  it("nenhum caminho com asma pura pede o auto-PEEP", () => {
    for (const autoPeep of [null, 0, 10]) {
      for (const pf of [null, 150]) {
        const a = sugerirPeepFio2(pf, null, perfilCom(["asma"]), autoPeep);
        expect(a.valor.peep).toBe(5);
        expect(a.valor.faixaPeep).toBeNull();
        for (const m of a.modulacoes) {
          expect(m.motivo).not.toMatch(/registre o auto-PEEP/i);
          expect(m.motivo).toMatch(/asma/i);
        }
      }
    }
  });

  it("sem patologia obstrutiva o preset continua sem modulação nenhuma", () => {
    expect(sugerirPeepFio2(null, null, perfilCom([]), null).modulacoes).toEqual([]);
    // Auto-PEEP medido em quem não é obstrutivo não abre o portão: a regra dos
    // 80 a 85% é da patologia, não do campo.
    expect(sugerirPeepFio2(null, null, perfilCom([]), 10).valor.presetAdmissao).toBe(true);
  });

  // ---------- A recusa de piso de PEEP na obesidade ----------
  // A review provou por mutação que esta recusa não tinha guarda nenhuma:
  // injetando `if (perfil.obeso) peep = Math.max(peep, 10)` mais a modulação
  // correspondente, a suíte inteira ficava verde. O único teste que a
  // mencionava escopava o `not.toHaveTextContent(/\d/)` no elemento do aviso,
  // que é texto constante.
  //
  // A P/F de 350 é o que dá tração: a tabela devolve PEEP 5, então um piso de
  // 10 MUDA o número. Com P/F 150 a tabela já dá 10 e a mutação passaria
  // despercebida.
  it("no obeso sem patologia obstrutiva, a PEEP não ganha piso nem modulação", () => {
    const a = sugerirPeepFio2(350, 98, perfil({ obeso: true }), null);
    expect(a.valor.peep).toBe(5);
    expect(a.valor.peep).toBe(a.base.peep);
    expect(a.valor.faixaPeep).toBeNull();
    expect(a.modulacoes).toEqual([]);
  });

  it("o obeso recebe exatamente a mesma PEEP do não obeso, em toda a tabela", () => {
    for (const pf of [350, 250, 150, 50]) {
      expect(sugerirPeepFio2(pf, 98, perfil({ obeso: true }), null).valor.peep).toBe(
        sugerirPeepFio2(pf, 98, perfil({ obeso: false }), null).valor.peep
      );
    }
  });
});
