import { describe, it, expect } from "vitest";
import { isSupabaseConfigured } from "./supabase";

describe("isSupabaseConfigured", () => {
  it("aceita url e chave preenchidas", () => {
    expect(isSupabaseConfigured("https://x.supabase.co", "chave")).toBe(true);
  });

  it("recusa quando falta a url", () => {
    expect(isSupabaseConfigured(undefined, "chave")).toBe(false);
  });

  it("recusa quando falta a chave", () => {
    expect(isSupabaseConfigured("https://x.supabase.co", undefined)).toBe(false);
  });

  // O defeito original: import.meta.env devolvia undefined, o `?? ""` do
  // createClient transformava em string vazia, e o supabase-js derrubava o app
  // com "supabaseUrl is required" antes de qualquer coisa renderizar.
  it("recusa string vazia em vez de deixar o cliente estourar", () => {
    expect(isSupabaseConfigured("", "")).toBe(false);
    expect(isSupabaseConfigured("https://x.supabase.co", "")).toBe(false);
  });

  it("recusa string só de espaço", () => {
    expect(isSupabaseConfigured("   ", "  ")).toBe(false);
  });
});
