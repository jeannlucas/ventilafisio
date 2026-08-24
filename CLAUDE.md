# Ventila Fisio

## O que é
Apoio à decisão em ventilação mecânica na UTI. É uma **POC**, declarada assim
pelo próprio README.

## Modo
MANUTENÇÃO.

Estado em 26/07/2026, depois da auditoria: a suíte roda e passa.
`pnpm test` devolve **156 testes em 8 arquivos**, e `pnpm exec tsc --noEmit`
sai limpo. A suíte foi rodada 10 vezes seguidas com resultado idêntico.

Atenção ao escrever teste novo: o `tsconfig.json` não inclui os tipos de Node,
então `node:fs` e `__dirname` passam no vitest mas **quebram o `pnpm build`**,
que roda `tsc --noEmit` antes. Para ler arquivo em teste, use o `?raw` do Vite
(exemplo em `src/favicon.test.ts`).

## Branches
- Principal: `main`
- Integração: `dev`
- Promoção para a principal e deploy são do Jeann, nunca meus.

### A ordem da promoção, sem exceção

```
1. git push origin dev
2. git checkout main && git merge --ff-only dev
3. git push origin main
```

O passo 1 vir primeiro é o que garante que a `dev` do GitHub nunca fique atrás
da `main`. O `.githooks/pre-push` recusa o push da `main` enquanto a `dev` local
estiver à frente da `origin/dev` (escape: `git push --no-verify`).

O `--ff-only` no passo 2 é igualmente obrigatório, e passou a valer em
24/08/2026. Antes disso a promoção era `git merge dev`, que cria um commit de
merge **só na `main`**: a `dev` nunca o recebia de volta, e a `main` ia ficando
à frente da `dev` sem que faltasse código nenhum (as árvores eram idênticas, só
a topologia divergia). O efeito prático é que o invariante `dev >= main` deixava
de valer e um `merge --ff-only` futuro falharia. Medido em 24/08/2026: a `main`
estava 1 commit à frente da `dev` aqui. Foi corrigido avançando a `dev` até a
`main`, sem criar commit, e desde então a promoção é `--ff-only`.

## Host
Vercel. O `vercel.json` na raiz devolve `index.html` em qualquer rota, e é
obrigatório: o roteamento é do cliente, então sem ele `/paciente/:id` e
`/compartilhar/:token` dão 404 quando abertos direto na URL. Comprovado com
host estático puro: `/` responde 200 e `/compartilhar/algo` responde 404.
Na Vercel o filesystem tem precedência sobre `rewrites`, então o catch-all
não engole os arquivos de `public/`.

## Segurança neste repositório
**Este repositório é PÚBLICO.** Tudo que entra aqui fica visível para qualquer
pessoa, e o histórico do git não esquece: apagar num commit seguinte não desfaz
a exposição.

Consequências práticas:
- **Nada de segredo, em nenhuma hipótese.** Sem chave, sem token, sem senha, sem
  string de conexão. A chave `anon` do Supabase é pública por desenho; a
  `service_role` NUNCA pode aparecer aqui, nem no cliente, nem em teste, nem em
  comentário, nem em exemplo.
- **Nada de dado real de paciente.** Nem em teste, nem em fixture, nem em
  captura de tela, nem em mensagem de commit. É POC clínica: o dado de exemplo
  é sempre inventado.
- O `.gitignore` ignora `.env` e `.env.*`, liberando só `.env.example`. Se
  precisar de variável nova, ela entra no `.env.example` com placeholder óbvio,
  nunca com o valor.
- Antes de qualquer commit, revisar o diff procurando segredo e PII. Em dúvida,
  não commitar e falar com o Jeann.

## Exceção de auditoria registrada
`pnpm-workspace.yaml` tem um `auditConfig.ignoreGhsas` com uma entrada:
**GHSA-5xrq-8626-4rwp**, crítica, no Vitest 2.1.9 (corrigida a partir do 3.2.6).

Fica no `pnpm-workspace.yaml`, e não no `package.json`, porque o pnpm 11 parou
de ler o campo `pnpm` do `package.json` e migrou as configurações para lá. Se
você puser em `pnpm.auditConfig`, o pnpm avisa que ignorou e a exceção não vale.

Por que ela não barra o CI: a falha é leitura e execução arbitrária de arquivo
**quando o servidor de UI do Vitest está escutando**. Aqui esse servidor não
existe. O `@vitest/ui` não está instalado (confira no `package.json`), o script
de teste é `vitest run` sem `--ui`, e o Vitest é devDependency, então nada disso
chega ao navegador de ninguém. Verificado em 24/08/2026.

A exceção é **pelo identificador da falha, nunca pelo pacote ou pelo caminho**:
se surgir outra crítica no Vitest, ela barra normalmente. Mesma regra do
`.gitleaks.toml` dos outros projetos.

Quando revisitar: subir o Vitest para 3.x resolve de vez e permite apagar a
exceção. É mudança de versão maior, mexe nos 156 testes, e por isso não foi
feita junto com a auditoria, com o projeto pausado. No dia em que o
desenvolvimento voltar, é a primeira coisa da fila.

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
8. **Ícone são três arquivos, não um.** Safari ignora o favicon SVG e cai no
   `.ico`; a tela de início do iOS só aceita PNG. `favicon.ico` e
   `apple-touch-icon.png` são gerados por `scripts/gerar-icones.py`, que
   redesenha a geometria do SVG com Pillow (não há conversor SVG para PNG na
   máquina). Mexeu no SVG, rode o script.
