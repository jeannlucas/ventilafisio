import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendCharts } from "./TrendCharts";
import { MRC_GROUPS } from "../../data/scores";
import type { Patient, DailyEvolution } from "../../types";

// Recharts não desenha em jsdom sem dimensões: ResponsiveContainer resolve
// para 0x0 e o gráfico não renderiza. Fixa-se o tamanho do elemento pai.
// jsdom também não implementa ResizeObserver, que o ResponsiveContainer usa
// para saber quando recalcular o tamanho: sem o mock, o efeito lança antes
// mesmo de a asserção sobre offsetWidth/offsetHeight entrar em jogo.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, value: 600 });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, value: 300 });
  // @ts-expect-error -- jsdom não declara ResizeObserver; o mock cobre o suficiente para o Recharts.
  global.ResizeObserver = ResizeObserverMock;
  // O ResponsiveContainer do Recharts lê getBoundingClientRect(), não
  // offsetWidth/offsetHeight, para o tamanho inicial (antes do primeiro
  // callback do ResizeObserver, que o mock acima nunca dispara).
  Element.prototype.getBoundingClientRect = () =>
    ({ width: 600, height: 300, top: 0, left: 0, right: 600, bottom: 300, x: 0, y: 0, toJSON() {} }) as DOMRect;
});

const paciente = { id: "p1", sex: "M", height_cm: 170 } as unknown as Patient;

const completa = () => Object.fromEntries(MRC_GROUPS.map((g) => [g.key, { d: 4, e: 4 }]));

const evo = (over: Partial<DailyEvolution>): DailyEvolution =>
  ({ recorded_at: "2026-08-30T12:00:00Z", mrc: {}, rass: null, ims: null, ...over } as unknown as DailyEvolution);

describe("TrendCharts — séries de escores", () => {
  it("mostra os gráficos de MRC, IMS e RASS", () => {
    render(
      <TrendCharts
        patient={paciente}
        evolutions={[
          evo({ recorded_at: "2026-08-29T12:00:00Z", mrc: completa(), rass: -2, ims: 3 }),
          evo({ recorded_at: "2026-08-30T12:00:00Z", mrc: completa(), rass: 0, ims: 4 }),
        ]}
      />
    );
    expect(screen.getByText(/força muscular/i)).toBeInTheDocument();
    expect(screen.getByText(/mobilidade/i)).toBeInTheDocument();
    expect(screen.getByText(/sedação/i)).toBeInTheDocument();
  });

  // Dia sem avaliação completa não vira ponto interpolado: o MRC é null de
  // propósito, e ligar os nulos desenharia uma recuperação que ninguém mediu.
  it("não liga os nulos na série de MRC", () => {
    render(
      <TrendCharts
        patient={paciente}
        evolutions={[
          evo({ recorded_at: "2026-08-28T12:00:00Z", mrc: completa() }),
          evo({ recorded_at: "2026-08-29T12:00:00Z", mrc: {} }),
          evo({ recorded_at: "2026-08-30T12:00:00Z", mrc: completa() }),
        ]}
      />
    );
    // O Recharts desenha CADA <Line> como um único elemento <path>, mesmo
    // quando há lacuna: contar quantos elementos <path> existem não distingue
    // ligado de não ligado (é sempre 1 por linha). Quem distingue é o "d":
    // o gerador de curva do d3 reinicia com um novo comando "M" (moveto) a
    // cada ponto indefinido quando connectNulls é falso, e usa um único "M"
    // quando é verdadeiro (os nulos são filtrados antes de desenhar). Com 3
    // pontos e o do meio nulo: sem ligar, 2 segmentos (2 "M"); ligando, 1
    // segmento contínuo (1 "M").
    const tituloMrc = screen.getByText(/força muscular/i);
    const painelMrc = tituloMrc.parentElement as HTMLElement;
    const curva = painelMrc.querySelector("path.recharts-curve") as SVGPathElement | null;
    expect(curva).not.toBeNull();
    const comandosMoveto = (curva!.getAttribute("d") ?? "").match(/M/g) ?? [];
    expect(comandosMoveto.length).toBe(2);
  });
});
