import { describe, it, expect } from "vitest";
import { ventilationCorrelations } from "./clinical";
import type { DailyEvolution } from "../types";

// Evolução mínima: só os campos que o motor lê importam.
function ev(partial: Partial<DailyEvolution>): DailyEvolution {
  return { imaging: {}, iv_meds: {}, feeding: {}, ...partial } as DailyEvolution;
}

describe("ventilationCorrelations", () => {
  it("não gera correlação quando não há dados", () => {
    expect(ventilationCorrelations(ev({}))).toEqual([]);
  });

  it("BNM ativo gera aviso de drive zerado", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: true } } }));
    expect(r.some((c) => c.source === "nmb" && c.level === "warn")).toBe(true);
  });

  it("sedação ativa gera info sobre trigger", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { sedation: { on: true } } }));
    expect(r.some((c) => c.source === "sedation" && c.level === "info")).toBe(true);
  });

  it("broncodilatador gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { bronchodilator: { on: true } } }));
    expect(r.some((c) => c.source === "bronchodilator" && c.level === "warn")).toBe(true);
  });

  it("hiperinsuflação na imagem gera aviso de auto-PEEP", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["hiperinsuflacao"] } }));
    expect(r.some((c) => c.source === "imaging_hiperinsuflacao" && c.level === "warn")).toBe(true);
  });

  it("vasopressor gera info sobre PEEP e retorno venoso", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { vasopressor: { on: true } } }));
    expect(r.some((c) => c.source === "vasopressor")).toBe(true);
  });

  it("infiltrado bilateral sugere padrão SDRA", () => {
    const r = ventilationCorrelations(ev({ imaging: { ct: ["infiltrado_bilateral"] } }));
    expect(r.some((c) => c.source === "imaging_sdra" && c.level === "info")).toBe(true);
  });

  it("pneumotórax gera aviso de pressões", () => {
    const r = ventilationCorrelations(ev({ imaging: { xray: ["pneumotorax"] } }));
    expect(r.some((c) => c.source === "imaging_pneumotorax" && c.level === "warn")).toBe(true);
  });

  it("med desligado (on:false) não gera correlação", () => {
    const r = ventilationCorrelations(ev({ iv_meds: { nmb: { on: false } } }));
    expect(r).toEqual([]);
  });
});
