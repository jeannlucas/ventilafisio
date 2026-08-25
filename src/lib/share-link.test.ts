import { describe, it, expect } from "vitest";
import { PENDING_SHARE_KEY, safePendingSharePath } from "./share-link";

const UUID_FIXO = "3f8a1c22-9d47-4e6b-8b0a-5c1e2d7f9a10";
const VALIDO = `/compartilhar/${UUID_FIXO}`;

// O link de plantão é guardado no localStorage quando o usuário abre um
// compartilhamento deslogado, e retomado depois do login. O valor guardado vem
// de `window.location.pathname`, ou seja, do que o atacante escreveu na URL,
// e ia direto para `navigate()`. Este módulo é o filtro entre as duas coisas.
describe("safePendingSharePath", () => {
  it("aceita o caminho legítimo, que é /compartilhar/<uuid>", () => {
    expect(safePendingSharePath(VALIDO)).toBe(VALIDO);
  });

  it("aceita o uuid em maiúsculas, porque a URL preserva o caso", () => {
    const alto = `/compartilhar/${UUID_FIXO.toUpperCase()}`;
    expect(safePendingSharePath(alto)).toBe(alto);
  });

  // O vetor do GHSA-jjmj-jmhj-qwj2 e do GHSA-wrjc-x8rr-h8h6: caminho que o
  // roteador acaba tratando como endereço externo. Nenhum deles passa pelo
  // formato de uuid, e é por isso que a validação é por formato e não por lista
  // de coisas proibidas: lista de proibidos sempre tem um caso a mais.
  it.each([
    ["//exemplo-malicioso.test", "protocolo-relativo"],
    ["/\\exemplo-malicioso.test", "barra invertida"],
    ["/compartilhar/../\\exemplo-malicioso.test", "subida de diretório com barra invertida"],
    ["/compartilhar//exemplo-malicioso.test", "barra dupla depois do prefixo"],
    ["https://exemplo-malicioso.test/compartilhar/x", "URL absoluta"],
    ["/compartilhar/" + UUID_FIXO + "/../../admin", "subida depois do token"],
    ["/compartilhar/" + UUID_FIXO + "?next=//fora", "query string"],
    ["/compartilhar/" + UUID_FIXO + "#//fora", "fragmento"],
    ["javascript:alert(1)", "esquema javascript"],
  ])("recusa %s (%s)", (entrada) => {
    expect(safePendingSharePath(entrada)).toBeNull();
  });

  // `startsWith("/compartilhar")` era a guarda antiga, e ela deixava passar
  // qualquer coisa que apenas COMECE com o prefixo, inclusive outra rota.
  it("recusa caminho que só começa com o prefixo, sem ser a rota", () => {
    expect(safePendingSharePath("/compartilharXYZ")).toBeNull();
    expect(safePendingSharePath("/compartilhar")).toBeNull();
    expect(safePendingSharePath("/compartilhar/")).toBeNull();
  });

  it("recusa token que não é uuid", () => {
    expect(safePendingSharePath("/compartilhar/abc")).toBeNull();
    expect(safePendingSharePath("/compartilhar/" + "x".repeat(36))).toBeNull();
  });

  it("recusa entrada ausente ou vazia", () => {
    expect(safePendingSharePath(null)).toBeNull();
    expect(safePendingSharePath("")).toBeNull();
  });

  it("expõe a chave do localStorage, para o App não redeclarar", () => {
    expect(PENDING_SHARE_KEY).toBe("ventila.pendingShare");
  });
});
