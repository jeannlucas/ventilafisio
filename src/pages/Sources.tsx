import { Panel } from "../components/ui";
import { REFERENCES, ehParecer, type Publicacao } from "../data/references";
import { THRESHOLD_SOURCES, type SourceKey } from "../lib/references";
import { T } from "../lib/theme";

// Rótulo legível de cada limiar. As chaves são as de THRESHOLD_SOURCES.
const LABELS: Record<SourceKey, string> = {
  pf: "Relação P/F",
  vcKg: "Volume corrente por peso predito",
  vcKgObeso: "Volume corrente por peso predito no paciente obeso",
  pplat: "Pressão de platô",
  dp: "Driving Pressure",
  mp: "Mechanical Power",
  tobin: "Índice de Tobin",
  pimax: "PImax",
  peepFio2: "Tabela PEEP/FiO₂",
  vcTarget: "Volume corrente alvo",
  extubation: "Triagem de prontidão para extubação",
  mrc: "Escore MRC de força muscular",
  rass: "RASS",
  ims: "IMS",
  treFalha: "Critérios de falha do teste de respiração espontânea",
  acidoBase: "Distúrbios ácido-base e compensação",
  anionGap: "Ânion gap e correção pela albumina",
  dpocOxigenio: "Oxigenoterapia e hipercapnia crônica no DPOC",
  drive: "Drive respiratório pelo P0.1",
  esforco: "Esforço inspiratório e pressão transpulmonar dinâmica",
  recrutabilidade: "Recrutabilidade pela razão R/I",
  obstrutivo: "Ventilação em DPOC e asma",
  obesidadeVentilacao: "Ventilação no paciente obeso",
  lesaoCerebral: "Alvo de PaCO₂ em lesão cerebral aguda",
};

export default function Sources() {
  // Para cada referência, quais limiares ela sustenta.
  const usos = (id: string) =>
    (Object.keys(THRESHOLD_SOURCES) as SourceKey[])
      .filter((k) => THRESHOLD_SOURCES[k].includes(id))
      .map((k) => LABELS[k]);

  const publicacoes = REFERENCES.filter((r): r is Publicacao => !ehParecer(r));
  const pareceres = REFERENCES.filter(ehParecer);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Panel
        title="Embasamento"
        sub="De onde vem cada número que este aplicativo afirma"
      >
        <p style={{ fontSize: 13, color: T.dim, margin: "0 0 4px" }}>
          Este aplicativo é uma prova de conceito e não substitui julgamento
          clínico. As publicações abaixo foram conferidas contra a fonte
          primária, mas só valem como embasamento depois da revisão do mentor
          clínico — o que ainda não passou por ela aparece marcado. Os
          pareceres clínicos, à parte, já são a manifestação do próprio
          mentor: não há revisão pendente neles.
        </p>
      </Panel>

      <div style={{ display: "grid", gap: 12 }}>
        {publicacoes.map((r) => (
          <div
            key={r.id}
            style={{
              background: T.panel,
              border: `1px solid ${r.verificada ? T.line : `${T.warn}55`}`,
              borderRadius: 12,
              padding: "14px 16px",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 14, color: T.txt }}>{r.autores}</strong>
              <span style={{ fontSize: 12, color: T.dim }}>{r.ano}</span>
              {!r.verificada && (
                <span style={{ fontSize: 11, color: T.warn, fontWeight: 700 }}>
                  pendente de revisão
                </span>
              )}
            </div>
            <span style={{ fontSize: 13, color: T.txt }}>{r.titulo}</span>
            <span style={{ fontSize: 12, color: T.dim }}>{r.veiculo}</span>
            {r.nota && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: T.warn,
                  background: `${T.warn}14`,
                  border: `1px solid ${T.warn}33`,
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                {r.nota}
              </p>
            )}
            <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>
              Sustenta: {usos(r.id).join(" · ")}
            </div>
          </div>
        ))}
      </div>

      {pareceres.length > 0 && (
        <Panel
          title="Pareceres clínicos"
          sub="Julgamentos do mentor sobre valores que a literatura não define"
        >
          <div style={{ display: "grid", gap: 12 }}>
            {pareceres.map((r) => (
              <div
                key={r.id}
                style={{
                  background: T.panel,
                  border: `1px solid ${T.line}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14, color: T.txt }}>{r.profissional}</strong>
                  <span style={{ fontSize: 12, color: T.dim }}>{r.data}</span>
                </div>
                <span style={{ fontSize: 13, color: T.txt }}>{r.citacaoCurta}</span>
                {r.nota && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: T.dim,
                      background: `${T.line}66`,
                      border: `1px solid ${T.line}`,
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    {r.nota}
                  </p>
                )}
                <div style={{ fontSize: 11.5, color: T.dim, marginTop: 2 }}>
                  Sustenta: {usos(r.id).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
