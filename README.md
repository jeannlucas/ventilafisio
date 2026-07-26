# Ventila Fisio

Apoio à decisão em ventilação mecânica na UTI. **Prova de conceito.**
Desenvolvido por BigDev.Z, IT Consulting.

> Ferramenta de apoio. Não substitui o julgamento clínico do profissional
> assistente. O conteúdo dos ventiladores e as sugestões ainda não passaram por
> validação clínica formal.

## O que está implementado

**Acesso**
- Login com Google via Supabase Auth. Não há cadastro manual: o `profile` é
  criado no primeiro acesso.
- Pacientes pertencem a um **hospital**. Você vê os pacientes dos hospitais em
  que é membro, e cria hospitais pela barra do topo.
- **Passagem de plantão por link**: gera um link que dá acesso direto a um
  paciente. O link vale **7 dias** e pode ser revogado a qualquer momento pela
  tela do paciente.

**Paciente**
- Admissão com nome, idade, sexo, diagnóstico, altura, peso, ventilador e modo.
- Dados antropométricos podem ser **corrigidos depois** da admissão, o que
  refina o peso predito.
- **Alta e arquivamento** por óbito ou extubação, com histórico preservado e
  aba própria para os arquivados. Dá para reativar.

**Decisão clínica**
- Dashboard com 4 indicadores: Driving Pressure, Pressão de Platô, VC ml/kg
  sobre peso predito, e relação P/F.
- **Sugestão de admissão** que funciona mesmo sem altura, peso ou gasometria,
  sinalizando na tela o que foi estimado.
- **Sugestão inicial** de VC, PEEP e FiO₂ (tabela ARDSnet low-PEEP), FR e
  volume-minuto, com faixa estendida para obeso (IMC ≥ 30).
- **Cálculos**: PBW (ARDSnet), IMC, P/F, Driving Pressure, Mechanical Power
  (Gattinoni), complacência estática e dinâmica, resistência, Tobin, PAM.
- **Painel Leitura do caso**: junta os alertas numéricos com as correlações do
  quadro clínico (bloqueio neuromuscular, sedação, vasopressor, broncodilatador,
  achados de imagem) e ordena por severidade.
- **Prontidão para extubação**: triagem por 8 critérios objetivos. Distingue
  critério reprovado de critério não medido, e recusa dar veredito com menos de
  4 critérios avaliados.
- **Evolução diária** com quadro clínico expandido (imagem, medicamentos
  venosos, sonda e dieta), carry-forward do quadro entre evoluções, histórico
  expansível com autor e data.
- **Gráficos de tendência**: DP e platô, P/F, complacência estática, Tobin.
- **Assincronias**: registro manual com sugestão de ajuste por protocolo.
- **Biblioteca de ventiladores** com nomenclatura por aparelho e passo a passo
  de manuseio. Conteúdo marcado como não validado.

**Qualidade de entrada**: medidas fisicamente impossíveis são recusadas antes de
chegar ao banco (FiO₂ fora de 21 a 100, Glasgow fora de 3 a 15, platô abaixo da
PEEP, altura zero). Isso não é faixa clínica, é plausibilidade.

## Pré-requisitos

- Node 18 ou superior e **pnpm** (`corepack enable`). Não use npm: o lockfile é
  do pnpm e npm gera uma árvore divergente.
- Uma conta no [Supabase](https://supabase.com). O plano free serve.

## 1. Banco de dados

No Supabase, abra **SQL Editor** e execute todo o conteúdo de
`supabase/schema.sql`. O arquivo é idempotente e pode ser reaplicado. Ele cria
tabelas, políticas de RLS, o gatilho que cria o `profile` no primeiro login, e o
seed com 4 ventiladores.

## 2. Login com Google

1. Supabase: **Authentication > Providers > Google**, ative.
2. [Google Cloud Console](https://console.cloud.google.com): crie um **OAuth
   Client ID** do tipo Web. Em *Authorized redirect URIs*, cole a URL que o
   Supabase mostra na tela do provider.
3. Cole **Client ID** e **Client Secret** no Supabase.
4. Em **Authentication > URL Configuration**, adicione `http://localhost:5173` e
   a URL de produção em *Redirect URLs*.

## 3. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha com **Project URL** e **anon public key** (em *Project Settings > API*).
Sem esse arquivo o app abre numa tela explicando o que falta.

## 4. Rodar

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # suíte completa
pnpm build      # tsc --noEmit && vite build
pnpm preview    # serve o build
```

## 5. Publicação

O roteamento é do cliente (`BrowserRouter`), então o host **precisa** devolver o
`index.html` para qualquer caminho. Sem isso, abrir `/paciente/:id` ou
`/compartilhar/:token` direto na URL devolve 404, e o link de passagem de
plantão só é usado assim.

Para Vercel isso já está resolvido pelo `vercel.json` na raiz. Em outro host, o
equivalente é: `_redirects` com `/* /index.html 200` na Netlify, ou
`try_files $uri /index.html` no nginx.

Lembre de cadastrar a URL de produção nas *Redirect URLs* do Supabase e nas
*Authorized redirect URIs* do Google.

### Ícones

São três arquivos em `public/`, e os três são necessários: o Safari ignora o
favicon SVG e cai no `.ico`, e a tela de início do iOS só aceita o PNG.

O `favicon.ico` e o `apple-touch-icon.png` são gerados a partir da mesma
geometria do SVG. Se mexer no `public/favicon.svg`, ajuste as constantes do
script e rode de novo:

```bash
python3 scripts/gerar-icones.py
```

## Estrutura

```
vercel.json                      devolve index.html em qualquer rota (SPA)
scripts/gerar-icones.py          gera favicon.ico e apple-touch-icon.png
public/favicon.svg               ícone do app, curva de pressão-tempo
supabase/schema.sql              tabelas, RLS, funções e seed
src/main.tsx                     bootstrap, estilos globais, tela de config ausente
src/App.tsx                      layout, barra de hospital, abas e rotas
src/types/index.ts               tipos de domínio
src/lib/clinical.ts              cálculos, classificações, sugestão e extubação
src/lib/measurement-limits.ts    plausibilidade física das medidas de entrada
src/lib/auth.tsx                 contexto de autenticação
src/lib/hospital.tsx             contexto de hospital ativo
src/lib/supabase.ts              cliente e detecção de configuração ausente
src/lib/theme.ts                 tokens visuais
src/data/asynchronies.ts         catálogo de assincronias e ajustes
src/data/clinical-board.ts       achados de imagem, medicamentos, sonda e dieta
src/components/ui.tsx            componentes de UI
src/components/VentilatorGuide.tsx  guia de manuseio de um aparelho
src/pages/Login.tsx              tela de login
src/pages/PatientList.tsx        lista de pacientes do hospital e compartilhados
src/pages/AdmitPatient.tsx       admissão
src/pages/PatientDetail.tsx      dashboard, evolução, gráficos, extubação
src/pages/Archived.tsx           pacientes com alta
src/pages/VentilatorLibrary.tsx  biblioteca de ventiladores
src/pages/AcceptShare.tsx        aceite de link de plantão
src/pages/ConfigMissing.tsx      instrução quando falta .env.local
```

## Testes

`pnpm test` roda a suíte em Vitest. Unitários cobrem os cálculos clínicos e a
validação de entrada; testes de componente rodam em jsdom com Testing Library.

Não existe medição de cobertura configurada.

## Limitações conhecidas e próximos passos

- **Validação clínica**: nenhum dos limites, fórmulas ou sugestões foi revisado
  por especialista. Antes de qualquer uso assistencial, isso precisa acontecer.
- **Ventiladores**: as 4 linhas do seed estão com `verified = false`. Revisem
  nomenclatura e manuseio dos modelos que vocês usam de fato.
- **Tabela ARDSnet** é para SDRA. Para pulmão normal, DPOC ou asma, os alvos de
  PEEP e FR mudam. Um motor de sugestão por perfil de paciente resolveria.
- **Assincronias** são registro manual. Detecção automática depende das curvas
  de fluxo e pressão do aparelho, o que exige integração com o ventilador.
- **Notas dos ventiladores**: a coluna `ventilators.notes` tem conteúdo curado
  que nenhuma tela exibe hoje.
- **Colunas sem uso** no banco estão listadas no fim de `supabase/schema.sql`.
