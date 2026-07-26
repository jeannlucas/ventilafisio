# Ventila Fisio

## O que é
Apoio à decisão em ventilação mecânica na UTI. É uma **POC**, declarada assim
pelo próprio README.

## Modo
MANUTENÇÃO.

Estado em 26/07/2026, depois da auditoria: a suíte roda e passa.
`pnpm test` devolve **148 testes em 7 arquivos**, e `pnpm exec tsc --noEmit`
sai limpo. A suíte foi rodada 10 vezes seguidas com resultado idêntico.

## Branches
- Principal: `main`
- Integração: `dev`
- Deploy automático na principal: nenhuma configuração no repositório.
- Promoção para a principal e deploy são do Jeann, nunca meus.

## Stack
- Vite + React, `react-router-dom`
- TypeScript (o build roda `tsc --noEmit` antes)
- **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). NÃO use npm aqui.
- Testes: Vitest. Ambiente `jsdom`, com Testing Library para componente.
  Setup em `src/test-setup.ts`, configurado no bloco `test` do `vite.config.ts`.

## Comandos
- Dev: `pnpm run dev` (vite)
- Build: `pnpm run build` (`tsc --noEmit && vite build`)
- Preview do build: `pnpm run preview`
- Testes: `pnpm test` (vitest run)
- Lint: não existe
- Cobertura: não existe

## Arquitetura real deste projeto
Vite + React com `src/` e `docs/`. Dentro de `src/`: `lib/` guarda domínio e
contextos, `components/` guarda UI reaproveitável, `pages/` guarda tela,
`data/` guarda catálogo estático, `types/` guarda os tipos de domínio.

Cálculo clínico mora em `src/lib/clinical.ts` e não conhece React nem Supabase.
Plausibilidade de entrada mora em `src/lib/measurement-limits.ts`. Mantenha
assim: regra de negócio nova entra em `lib/`, não dentro de componente.

Existe um `PROMPT-claude-code.md` na raiz, que é contexto de trabalho anterior,
não instrução vigente.

## Desvios conscientes do padrão global
1. **Sem medição de cobertura.** Vale a regra comportamental.
2. **`PatientDetail.tsx` tem cerca de 1000 linhas e 10 componentes num arquivo.**
   A auditoria registrou e não quebrou, porque o modo é MANUTENÇÃO e nenhum
   defeito dependia disso. Se for mexer muito nesse arquivo, vale extrair antes.
3. **Estilos globais são injetados por JS** em `main.tsx`, não há arquivo CSS.
   A classe `.vf-row`, usada por `components/ui.tsx`, é definida lá. Não conclua
   que ela não existe só porque não há `.css` no projeto.

## Vocabulário de domínio
- **Ventilação mecânica**: suporte respiratório artificial em UTI.
- **POC**: prova de conceito. O projeto não é produto validado clinicamente.
- **PBW**: peso predito, base de todo alvo de volume corrente.
- **Driving Pressure**: pressão de platô menos PEEP.
- **TRE**: teste de respiração espontânea.
- **ZEEP**: PEEP zero, que é regulagem válida (não confundir com dado faltando).

## Armadilhas conhecidas
1. **É software de apoio a decisão clínica, e é repositório PÚBLICO.** Qualquer
   mudança em cálculo, faixa de referência ou recomendação tem consequência
   fora da tela. Não ajuste número, limite ou fórmula sem fonte, e sem falar com
   o Jeann.
2. **É pnpm, não npm.** `npm install` aqui gera árvore divergente do lockfile.
3. `PROMPT-claude-code.md` na raiz não é instrução vigente; este arquivo é.
4. **Distinga plausibilidade de faixa clínica.** `measurement-limits.ts` só
   barra o fisicamente impossível. Quem julga gravidade é `classify()` em
   `clinical.ts`, e aqueles limites são clínicos: não os toque sem fonte.
5. **Ausência de dado não é resultado normal.** Foi a origem dos defeitos mais
   graves que a auditoria achou: FiO₂ zero virava P/F infinita classificada como
   "Normal" em verde, e um vasopressor nunca avaliado contava como critério
   atendido na triagem de extubação. Ao criar indicador novo, decida
   explicitamente o que acontece quando o dado não existe.
6. **O SQL de `supabase/schema.sql` não é executado por nenhum teste.** Não há
   banco no ambiente de desenvolvimento. Mudança de schema ou de RLS sai daqui
   revisada, mas NÃO verificada, e quem aplica é o Jeann.
7. **Colunas sem uso** estão listadas no fim do `schema.sql`. Foram tiradas dos
   tipos TypeScript, mas continuam no banco de propósito: derrubar coluna apaga
   dado e é decisão do Jeann.
