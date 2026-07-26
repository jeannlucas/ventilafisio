# Ventila Fisio

## O que é
Apoio à decisão em ventilação mecânica na UTI. É uma **POC**, declarada assim
pelo próprio README.

## Modo
MANUTENÇÃO.

Estado em 25/07/2026: existe 1 arquivo de teste. A suíte NÃO foi executada
porque `node_modules` não está instalado. Rode `pnpm install && pnpm test` e
atualize esta linha com o resultado real na primeira vez que trabalhar aqui.

## Branches
- Principal: `main`
- Integração: `dev`
- Deploy automático na principal: nenhuma configuração no repositório.
- Promoção para a principal e deploy são do Jeann, nunca meus.

## Stack
- Vite + React, `react-router-dom`
- TypeScript (o build roda `tsc --noEmit` antes)
- **pnpm** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`). NÃO use npm aqui.
- Testes: Vitest

## Comandos
- Dev: `pnpm run dev` (vite)
- Build: `pnpm run build` (`tsc --noEmit && vite build`)
- Preview do build: `pnpm run preview`
- Testes: `pnpm test` (vitest run)
- Lint: não existe
- Cobertura: não existe

## Arquitetura real deste projeto
Vite + React com `src/` e `docs/`. Existe um `PROMPT-claude-code.md` na raiz,
que é contexto de trabalho anterior, não instrução vigente.

## Desvios conscientes do padrão global
1. **Sem medição de cobertura.** Vale a regra comportamental.
2. **Um teste só.** Para um domínio clínico, é pouco. Comportamento novo que
   envolva cálculo ou recomendação nasce com teste, sem exceção.

## Vocabulário de domínio
- **Ventilação mecânica**: suporte respiratório artificial em UTI.
- **POC**: prova de conceito. O projeto não é produto validado clinicamente.

## Armadilhas conhecidas
1. **É software de apoio a decisão clínica, e é repositório PÚBLICO.** Qualquer
   mudança em cálculo, faixa de referência ou recomendação tem consequência
   fora da tela. Não ajuste número, limite ou fórmula sem fonte, e sem falar com
   o Jeann.
2. **É pnpm, não npm.** `npm install` aqui gera árvore divergente do lockfile.
3. `PROMPT-claude-code.md` na raiz não é instrução vigente; este arquivo é.
