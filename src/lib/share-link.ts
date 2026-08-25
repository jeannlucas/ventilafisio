/**
 * Filtro do link de plantão guardado entre o login e o retorno.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * Quando alguém abre `/compartilhar/<token>` deslogado, o App guarda o caminho
 * no localStorage e, depois do login, chama `navigate(caminho)`. O valor
 * guardado vinha de `window.location.pathname` sem filtro nenhum: era a URL que
 * o visitante digitou indo direto para o roteador.
 *
 * A guarda anterior era `pathname.startsWith("/compartilhar")`, que aceita
 * qualquer coisa que apenas COMECE com o prefixo. O React Router 6.30.4, que é
 * a versão em uso, tem dois avisos abertos sobre exatamente esse caminho:
 * GHSA-jjmj-jmhj-qwj2 (open redirect levando a XSS, SEM correção publicada) e
 * GHSA-wrjc-x8rr-h8h6 (open redirect via barra invertida em `<Link>` e
 * `useNavigate`, corrigido só na linha 7). O primeiro é explícito: "applications
 * with open redirects could permit attacker crafted links".
 *
 * Ou seja, o pré-requisito da falha era um open redirect na aplicação. Este
 * módulo remove o pré-requisito, e com isso a aplicação deixa de depender da
 * versão do roteador para não redirecionar para fora.
 *
 * VALIDA POR FORMATO, NÃO POR LISTA DE PROIBIDOS
 * ---------------------------------------------
 * O token é `crypto.randomUUID()` (ver a criação do compartilhamento em
 * `PatientDetail`), então o caminho legítimo tem forma exata e fechada. Aceitar
 * só ela é mais seguro do que tentar listar o que barrar: lista de proibidos
 * sempre tem um caso a mais, e foi assim que a correção do CVE-2025-68470
 * precisou de uma segunda rodada.
 */

export const PENDING_SHARE_KEY = "ventila.pendingShare";

/** `/compartilhar/` seguido de um uuid, e nada além disso. */
const CAMINHO_DE_COMPARTILHAMENTO =
  /^\/compartilhar\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Devolve o caminho quando ele é um link de plantão legítimo, e `null` em
 * qualquer outro caso. O retorno `null` é o sinal de "não navegue".
 */
export function safePendingSharePath(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  return CAMINHO_DE_COMPARTILHAMENTO.test(caminho) ? caminho : null;
}
