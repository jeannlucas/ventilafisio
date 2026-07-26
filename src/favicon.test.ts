import { describe, it, expect } from "vitest";
// `?raw` em vez de node:fs: o tsconfig deste projeto não inclui os tipos de
// Node, e usar fs aqui quebrava `tsc --noEmit`, ou seja, quebrava o build.
// Ler pelo Vite também tem a vantagem de a resolução do caminho ser a mesma
// que a do app: se o arquivo sumir, o import falha e o teste acusa.
import html from "../index.html?raw";
import svg from "../public/favicon.svg?raw";
import ico from "../public/favicon.ico?url";
import applePng from "../public/apple-touch-icon.png?url";
import vercelConfig from "../vercel.json";
import { T } from "./lib/theme";

// A auditoria não pegou nada disto: o projeto não tinha ícone nenhum nem
// configuração de host, e o site publicado aparecia com o ícone genérico do
// navegador. Os testes leem o HTML cru, não o DOM: o navegador conserta
// marcação inválida ao montar a árvore, e href quebrado não aparece
// renderizado.
function links(rel: string): string[] {
  return html.match(new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, "gi")) ?? [];
}

function hrefsDe(rel: string): string[] {
  return links(rel)
    .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => !!h);
}

describe("ícones do app", () => {
  // O Safari ignora o favicon SVG e cai no .ico. Sem os três, o ícone some
  // em parte dos navegadores, que foi exatamente o sintoma relatado.
  it("declara o SVG, o .ico e o apple-touch-icon", () => {
    expect(hrefsDe("icon")).toEqual(
      expect.arrayContaining(["/favicon.svg", "/favicon.ico"])
    );
    expect(hrefsDe("apple-touch-icon")).toEqual(["/apple-touch-icon.png"]);
  });

  it("marca o SVG com o type correto, senão o navegador não o prefere", () => {
    const svgTag = links("icon").find((t) => t.includes("favicon.svg")) ?? "";
    expect(svgTag).toMatch(/type=["']image\/svg\+xml["']/i);
  });

  it("os três arquivos existem em public/", () => {
    // Se algum sumir, o import acima nem resolve e o teste inteiro falha.
    expect(svg.length).toBeGreaterThan(0);
    expect(ico).toMatch(/favicon.*\.ico$/);
    expect(applePng).toMatch(/apple-touch-icon.*\.png$/);
  });

  it("o SVG é válido e tem viewBox, para escalar em qualquer tamanho", () => {
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

// Sem isto, abrir /compartilhar/:token ou /paciente/:id direto na URL devolve
// 404 na Vercel: o arquivo não existe no disco e o roteamento é do cliente.
// Quebrava justamente o link de passagem de plantão, que só é usado assim.
describe("configuração da Vercel", () => {
  it("manda qualquer rota para o index.html", () => {
    expect(vercelConfig.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
  });

  it("cobre as rotas de cliente que o app declara", () => {
    const padrao = new RegExp(vercelConfig.rewrites[0].source);
    for (const rota of [
      "/",
      "/admitir",
      "/arquivados",
      "/biblioteca",
      "/paciente/abc-123",
      "/compartilhar/token-de-plantao",
    ]) {
      expect(padrao.test(rota)).toBe(true);
    }
  });
});
