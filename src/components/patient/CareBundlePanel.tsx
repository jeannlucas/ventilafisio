import { useState } from "react";
import { Panel, Alert } from "../ui";
import { CARE_BUNDLE } from "../../data/care-bundle";
import { supabase } from "../../lib/supabase";
import { T } from "../../lib/theme";
import type { CareAction } from "../../types";

const LABEL = new Map(CARE_BUNDLE.map((i) => [i.key, i.label]));

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function CareBundlePanel({
  patientId, ownerId, actions, authors, onChange,
}: {
  patientId: string;
  ownerId: string;
  actions: CareAction[];
  authors: Record<string, string>;
  onChange: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  // Um toque registra a chave do catálogo com hora e autor. Nunca o rótulo:
  // texto livre no banco tornaria a contagem por ação impossível e quebraria
  // no dia em que o texto do rótulo mudasse.
  const registrar = async (key: string) => {
    setErro(null);
    setSalvando(key);
    const { error } = await supabase
      .from("care_actions")
      .insert({ patient_id: patientId, owner_id: ownerId, action: key });
    setSalvando(null);
    if (error) {
      // Falha de escrita tem que aparecer: silenciar aqui faz o fisio
      // acreditar que o cuidado foi registrado quando não foi.
      setErro(error.message);
      return;
    }
    onChange();
  };

  const contagem = actions.reduce<Record<string, number>>((acc, a) => {
    acc[a.action] = (acc[a.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel title="Registrar cuidado" sub="Um toque registra a ação com hora e autor" accent={T.ok}>
        {erro && <Alert>{erro}</Alert>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CARE_BUNDLE.map((i) => (
            <button
              key={i.key}
              type="button"
              disabled={salvando === i.key}
              onClick={() => registrar(i.key)}
              style={{
                fontSize: 13,
                padding: "10px 15px",
                borderRadius: 10,
                cursor: salvando === i.key ? "wait" : "pointer",
                fontFamily: "inherit",
                background: T.panel2,
                border: `1px solid ${T.line}`,
                color: T.txt,
                fontWeight: 600,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              {i.label}
              {/* Mostra desde a primeira execução: "feito uma vez" e "nunca feito"
                  são os dois estados que a equipe precisa distinguir num bundle de
                  cuidados. O botão e a linha do histórico compartilham o rótulo por
                  design; a ambiguidade em teste se resolve escopando a consulta
                  (data-testid="cuidados-historico" abaixo), não escondendo o "1×". */}
              {contagem[i.key] > 0 && (
                <span style={{ color: T.ok, fontWeight: 800 }}>{contagem[i.key]}×</span>
              )}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Cuidados registrados" sub="Do mais recente para o mais antigo">
        {actions.length === 0 ? (
          <p style={{ color: T.dim, fontSize: 13, margin: 0 }}>
            Nenhum cuidado registrado ainda.
          </p>
        ) : (
          // data-testid deliberado: escopa a busca de teste ao histórico, sem
          // depender da marcação interna do Panel (um <section> compartilhado
          // que pode mudar sem aviso).
          <div data-testid="cuidados-historico" style={{ display: "grid", gap: 6 }}>
            {actions.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "baseline",
                  padding: "8px 12px",
                  background: T.panel2,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ color: T.dim, fontVariantNumeric: "tabular-nums" }}>{hora(a.at)}</span>
                <span style={{ color: T.txt, flex: 1 }}>{LABEL.get(a.action) ?? a.action}</span>
                {a.note && <span style={{ color: T.dim }}>{a.note}</span>}
                {/* `authors` só cobre quem escreveu evolução (RPC evolution_authors).
                    Quem só registrou cuidado cai no fallback "—", nunca num nome errado. */}
                <span style={{ color: T.dim, fontSize: 12 }}>{authors[a.owner_id] ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
