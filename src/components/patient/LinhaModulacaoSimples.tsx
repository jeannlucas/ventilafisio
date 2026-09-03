import { T } from "../../lib/theme";
import type { Modulacao } from "../../lib/alvos";

/**
 * Linha que mostra as razões de uma modulação, sem a faixa base.
 *
 * Irmã de `LinhaModulacao`, que é específica do volume corrente e imprime a
 * faixa que o alvo teria sem a modulação. Aqui não há faixa a comparar: no
 * DPOC sem auto-PEEP não existe número nenhum, e a comparação com o padrão,
 * quando faz sentido, já vem escrita no próprio `motivo` — que é montado em
 * `alvos.ts`, onde os dois valores estão.
 *
 * É ela, e não a `LinhaModulacao`, que serve ao alvo de PaCO₂: ali o `base` é
 * igual ao `valor` de propósito (sem lesão cerebral aguda o aplicativo não dá
 * alvo de PaCO₂ nenhum), e imprimir "Padrão sem essa modulação: 35 a 45"
 * afirmaria um alvo padrão que não existe.
 */
export function LinhaModulacaoSimples({
  modulacoes,
  testid,
}: {
  modulacoes: Modulacao[];
  testid: string;
}) {
  if (modulacoes.length === 0) return null;
  return (
    <p data-testid={testid} style={{ margin: "8px 0 0", fontSize: 11, color: T.dim }}>
      {modulacoes.map((m) => m.motivo).join(" ")}
    </p>
  );
}
