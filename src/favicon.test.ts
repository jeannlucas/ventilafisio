import { describe, it, expect } from "vitest";
// `?raw` em vez de node:fs: o tsconfig deste projeto não inclui os tipos de
// Node, e usar fs aqui quebrava `tsc --noEmit`, ou seja, quebrava o build.
// Ler pelo Vite também tem a vantagem de a resolução do caminho ser a mesma
// que a do app: se o arquivo sumir, o import falha e o teste acusa.
import html from "../index.html?raw";
import svg from "../public/favicon.svg?raw";
import { T } from "./lib/theme";

// A auditoria não pegou isto: o projeto não tinha ícone nenhum, e o site
// publicado aparecia com o ícone genérico do navegador na aba.
// Os testes leem o HTML cru, não o DOM: o navegador conserta marcação
// inválida ao montar a árvore, e href quebrado não aparece renderizado.
function hrefDoIcone(): string | null {
  const tag = html.match(/<link[^>]+rel=["']icon["'][^>]*>/i)?.[0];
  if (!tag) return null;
  return tag.match(/href=["']([^"']+)["']/i)?.[1] ?? null;
}

describe("favicon", () => {
  it("está declarado no index.html", () => {
    expect(hrefDoIcone()).not.toBeNull();
  });

  it("aponta para o arquivo que o projeto realmente tem", () => {
    // O Vite serve public/ na raiz da URL: public/favicon.svg vira /favicon.svg.
    expect(hrefDoIcone()).toBe("/favicon.svg");
    expect(svg.length).toBeGreaterThan(0);
  });

  it("é declarado como SVG, que escala em qualquer tamanho de aba", () => {
    const tag = html.match(/<link[^>]+rel=["']icon["'][^>]*>/i)?.[0] ?? "";
    expect(tag).toMatch(/type=["']image\/svg\+xml["']/i);
  });

  it("é um SVG válido com viewBox", () => {
    expect(svg).toMatch(/<svg[^>]+viewBox=/i);
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
  });

  it("usa as cores do tema em vez de cor solta", () => {
    expect(svg).toContain(T.bg);
    expect(svg).toContain(T.accent);
  });

  it("declara theme-color igual ao fundo do app", () => {
    const conteudo = html
      .match(/<meta[^>]+name=["']theme-color["'][^>]*>/i)?.[0]
      .match(/content=["']([^"']+)["']/i)?.[1];
    expect(conteudo?.toUpperCase()).toBe(T.bg.toUpperCase());
  });
});
