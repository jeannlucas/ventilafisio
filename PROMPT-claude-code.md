# Prompt de bootstrap — Ventila Fisio (colar no Claude Code)

Você está em `~/Documents/Projetos/Ventila Fisio`. Use plan mode e valide uma
operação por vez antes de seguir.

## Contexto

Vou descompactar nesta pasta um arquivo `ventila-fisio.zip` com o projeto base
de uma POC chamada **Ventila Fisio** — um app de apoio à decisão em ventilação
mecânica na UTI, desenvolvido pela BigDev.Z — IT Consulting. Stack: React +
Vite + TypeScript + Supabase (Auth Google + Postgres com RLS) + Recharts.

O conteúdo descompacta para uma subpasta `ventila-fisio-pkg/`. Quero os arquivos
na **raiz** do projeto atual.

## Tarefas (uma de cada vez, me mostrando o plano antes)

1. **Mover o conteúdo para a raiz.** Descompacte (se eu ainda não tiver feito) e
   mova tudo de `ventila-fisio-pkg/` para `./`, depois remova a subpasta vazia.
   Confirme a estrutura final: `src/`, `supabase/schema.sql`, `package.json`,
   `index.html`, `vite.config.ts`, `tsconfig.json`, `README.md`, `.env.example`.

2. **Instalar e validar.** Rode `pnpm install`, depois `pnpm build`. O build
   deve passar (`tsc --noEmit` + `vite build`). Se houver erro, corrija antes de
   seguir e me explique o que mudou.

3. **Inicializar o Git** (se ainda não houver): `git init`, e faça o primeiro
   commit com a mensagem `chore: scaffold Ventila Fisio (BigDev.Z)`. O
   `.gitignore` já existe e ignora `node_modules`, `dist` e `.env.local`.

4. **Me guiar na configuração do Supabase.** Leia o `README.md` e me liste, de
   forma objetiva, os passos que EU preciso fazer manualmente no painel do
   Supabase e do Google Cloud (executar `supabase/schema.sql`, ativar o provider
   Google, preencher `.env.local`). Não invente chaves.

## Regras de negócio já implementadas (não regrida)

- Cálculos: PBW (ARDSnet), IMC, P/F, Driving Pressure, Mechanical Power
  (Gattinoni, **VC em litros**), complacências, resistência, Tobin.
- Dashboard com 4 indicadores: Driving Pressure, Pressão de Platô, VC ml/kg
  (peso predito), P/F.
- **Ventilação protetora**: alvo 4–6 ml/kg; obeso (IMC ≥30) 6–8 ml/kg, sempre
  com VC sobre peso predito; Pressão de Platô >30 é o limite de segurança.
- **Sugestão funciona mesmo sem altura/peso/gasometria** (regra importante):
  sem altura, estima PBW pela altura média do sexo e marca "estimado"; sem
  gasometria, usa preset de admissão FiO₂ 100% / PEEP 5 para titular depois.
  Ver `src/lib/clinical.ts` → `admissionSuggestion` e `pbwOrEstimate`.
- PEEP/FiO₂ pela tabela ARDSnet low-PEEP; volume-minuto ~100 ml/kg PBW/min.
- Isolamento de pacientes por usuário via RLS.
- Módulos: evolução diária, gráficos de tendência, predição de extubação,
  assincronias (registro + sugestão por protocolo), biblioteca de ventiladores
  (conteúdo `verified=false`, a validar).

## Importante

- Esta é uma ferramenta de **apoio** à decisão, não substitui julgamento
  clínico. Mantenha os avisos.
- O conteúdo da biblioteca de ventiladores ainda precisa ser validado por mim e
  pelo meu mentor — não o trate como definitivo.
- Não altere a fórmula do Mechanical Power (VC em litros) nem os limites de
  segurança sem me consultar.

Comece pela tarefa 1 e me mostre o plano.
