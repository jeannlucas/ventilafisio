import { T } from "../../lib/theme";
import type { Alvo, AlvoVc } from "../../lib/alvos";

/**
 * Linha que aparece só quando alguma modulação deslocou o alvo de volume
 * corrente (hoje, só obesidade). Sem esta linha o `Alvo<T>` é encanamento
 * morto: o avaliador precisa ver o motivo e o valor padrão para poder
 * discordar da sugestão. Usada tanto pelo Dashboard (evolução) quanto pelo
 * AdmissionCard (admissão) — o mesmo alvo pode ser exibido nos dois pontos
 * da tela, e os dois precisam da mesma transparência.
 *
 * data-testid deliberado: o "6–8" desta linha também aparece em texto fixo
 * de apoio na tela (formula/sub, independente de modulação), então escopar
 * por aqui é o que garante que o teste verifica esta linha, não qualquer
 * "6–8" da tela.
 */
export function LinhaModulacao({ alvo }: { alvo: Alvo<AlvoVc> }) {
  if (alvo.modulacoes.length === 0) return null;
  return (
    <p data-testid="alvo-modulacao" style={{ margin: "8px 0 0", fontSize: 11, color: T.dim }}>
      {alvo.modulacoes.map((m) => m.motivo).join(" ")} Padrão sem essa modulação:{" "}
      {alvo.base.low}–{alvo.base.high} mL ({alvo.base.lowKg}–{alvo.base.highKg} ml/kg de peso predito).
    </p>
  );
}
