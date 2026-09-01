import { Link } from "react-router-dom";
import { sourcesFor, shortCite, type SourceKey } from "../lib/references";
import { ehParecer } from "../data/references";
import { T } from "../lib/theme";

/**
 * Rodapé de embasamento do painel. Diz de onde vem o número que está acima
 * dele e leva à página com a referência completa.
 */
export function SourceFooter({ sourceKeys }: { sourceKeys: SourceKey[] }) {
  const refs = sourceKeys.flatMap((k) => sourcesFor(k));
  // Fonte repetida entre limiares do mesmo painel aparece uma vez só.
  const unicas = refs.filter((r, i) => refs.findIndex((o) => o.id === r.id) === i);
  if (unicas.length === 0) return null;

  const pendente = unicas.some((r) => !ehParecer(r) && !r.verificada);

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: `1px solid ${T.line}`,
        fontSize: 10.5,
        color: T.dim,
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span>Fonte: {shortCite(unicas)}</span>
      {pendente && (
        <span style={{ color: T.warn }} title="Ainda não revisada pelo mentor clínico">
          · pendente de revisão
        </span>
      )}
      <Link to="/fontes" style={{ color: T.accent, textDecoration: "none" }}>
        ver embasamento ›
      </Link>
    </div>
  );
}
