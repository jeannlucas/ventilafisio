# Ventila Fisio

## O que é
Apoio à decisão em ventilação mecânica na UTI. É uma **POC**, declarada assim
pelo próprio README.

## Modo
MANUTENÇÃO.

Estado em 01/09/2026: a suíte roda e passa. `pnpm test` devolve **352 testes
em 23 arquivos** e `pnpm build` (que roda `tsc --noEmit` antes) sai limpo.

O Vitest subiu de 2.1.9 para 3.2.7 em 24/08/2026, e os 156 testes passaram sem
nenhum ajuste: nem em teste, nem em `vite.config.ts`, nem em `src/test-setup.ts`.
A subida fechou o GHSA-5xrq-8626-4rwp, crítica que estava registrada aqui como
exceção de auditoria. Com ela resolvida na origem, a exceção saiu do
`pnpm-workspace.yaml` e esta seção deixou de existir: o `pnpm audit` do CI passa
sem precisar ignorar nada.

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

## Link de plantão: o caminho é validado por formato

`src/lib/share-link.ts` é o filtro entre a URL que o visitante digitou e o
`navigate()`. Ele aceita **só** `/compartilhar/<uuid>` e devolve `null` para
qualquer outra coisa.

Ele existe por um defeito real, corrigido em 24/08/2026. O App guardava
`window.location.pathname` no localStorage quando alguém abria um
compartilhamento deslogado, e depois do login chamava `navigate(caminho)`. A
única guarda era `startsWith("/compartilhar")`, que aceita qualquer caminho que
apenas COMECE com o prefixo. Era um open redirect: caminho controlado pelo
visitante indo direto para o roteador.

Isso importa porque o React Router tinha dois avisos abertos sobre exatamente
esse ponto: **GHSA-jjmj-jmhj-qwj2** (open redirect levando a XSS) e
**GHSA-wrjc-x8rr-h8h6** (open redirect via barra invertida). O primeiro é
explícito: *"applications with open redirects could permit attacker crafted
links"*. O pré-requisito da falha era um open redirect na aplicação, e agora
não há.

O **GHSA-jjmj-jmhj-qwj2 saiu de "sem correção" para corrigido na 6.30.5**, e
esta seção afirmava o contrário até 24/08/2026. A subida foi de `patch`
(6.30.4 → 6.30.6) e não precisou do major: 171 testes e build limpos. Lição
para reler aqui: *"sem correção publicada"* é estado do dia em que foi escrito,
não propriedade da falha. Reconfira antes de decidir com base nessa frase.

Duas decisões que valem manter:

1. **Valida por formato, não por lista de proibidos.** O token é
   `crypto.randomUUID()`, então o caminho legítimo tem forma fechada. Lista de
   proibidos sempre tem um caso a mais: a correção do CVE-2025-68470 no próprio
   React Router precisou de uma segunda rodada por isso.
2. **Filtra na leitura, não só na escrita.** O que está no localStorage pode ter
   sido gravado pela versão anterior, que não filtrava. Quem navega é quem
   confere.

O terceiro aviso do React Router (**GHSA-337j-9hxr-rhxg**, injeção de construtor
via `deserializeErrors()`) é de hidratação **SSR**. Este projeto é SPA com Vite,
não tem SSR, então o caminho não existe aqui.

Sobram dois avisos, os dois exigindo o React Router 7: o
**GHSA-wrjc-x8rr-h8h6** e o **GHSA-337j-9hxr-rhxg** acima. Subir para a linha 7
é major e mexe no roteamento inteiro. Não foi feito: o defeito da aplicação era
o que importava, e ele está fechado independentemente da versão.

## Um `overrides` no pnpm-workspace.yaml, e por quê

O `vitest` tem o **próprio** `vite` como dependência, com faixa
`^5.0.0 || ^6.0.0 || ^7.0.0-0`. Sem override o pnpm resolve isso para o fundo
da faixa, e a árvore fica com duas cópias do vite: a que o app usa e uma 5.4.21
vulnerável escondida sob o vitest. Subir o vite do projeto **não** resolve
sozinho — foi medido em 24/08/2026, `pnpm why vite` mostrava `Found 2 versions`
depois da subida para a 7.

Por isso existe `overrides: { vite: ^7.3.6 }` no `pnpm-workspace.yaml`. Ele não
força nada fora de contrato: 7.3.6 está dentro da faixa que o vitest declara.
Quando o vitest passar a exigir `^7` sozinho, o bloco pode sair — **conferindo
antes com `pnpm why vite`**, porque sem ele a resolução volta para a 5 em
silêncio.

O alvo é a linha 7, não a mais recente: o vitest 3.2.7 não aceita vite 8.

## O TRE é uma sessão acompanhada, não um campo de texto

Até a Fase 5 o teste de respiração espontânea era uma coluna,
`daily_evolutions.tre_result`, com dois valores: `pass` e `fail`. Um teste
interrompido — porque o paciente foi para a tomografia, porque a família chegou,
porque o transporte veio — só cabia ali como **falha**. E TRE reprovado é
bloqueador ABSOLUTO em `extubationReadiness`: reprovava um paciente que não
falhou em nada.

A Fase 5 trocou isso por `public.tre_sessions`, uma sessão com início, fim,
critérios e desfecho. Três coisas valem manter na cabeça:

1. **`interrompido` não é `falhou`.** `resultadoTreParaTriagem`, em
   `src/lib/tre.ts`, devolve `null` para interrompido — "não medido", igual a
   quem nunca fez o teste. Só `falhou` vira `"fail"`. Se alguém "simplificar"
   isso para dois valores, o defeito volta inteiro.
2. **`desfecho: null` é EM ANDAMENTO, não dado faltando.** Não existe coluna de
   status separada; a ausência de desfecho é o estado.
3. **Chave ausente em `criterios` é "não avaliado".** Presente com
   `atingido: false` é "avaliado e não atingido". O painel APAGA a chave ao
   desmarcar, em vez de gravar `false` — é a mesma regra do resto do projeto, e
   está testada nos dois sentidos.

### A resposta vem da última sessão CONCLUÍDA

Não da mais recente. Sessão em andamento não apaga o que já foi concluído: abrir
um teste novo uma hora depois de um `falhou` não pode derrubar o bloqueador
enquanto o teste corre. Pelo mesmo motivo, sessão em andamento sem nenhuma
concluída também não invalida o campo legado.

E `sessoes === null` significa que a BUSCA FALHOU, o que é diferente de não
haver sessão: aí a resposta é `null` e o legado não é consultado. Sem isso, um
erro de rede apagava da tela uma reprovação real, porque um `"pass"` velho no
campo antigo passava por cima.

### O campo antigo saiu do formulário e a coluna continua

`daily_evolutions.tre_result` não é mais escrita, mas continua **lida** como
fallback para quem foi registrado antes da fase, e por isso continua declarada
em `src/types/index.ts`. A coluna não foi derrubada: drop column apaga dado e é
decisão do Jeann.

O campo saiu do formulário de evolução porque oferecia só Aprovado e Falhou.
Enquanto ele existiu, o defeito central da fase continuou alcançável pela tela
principal de entrada de dado, mesmo com todo o caminho novo correto — foi o
achado mais grave da review final da fase.

### Um cálculo de triagem por tela, não dois

`PatientDetail.tsx` chama `extubationReadiness` **uma vez**, na aba Desmame, e
passa o mesmo objeto para o `TrePanel` (via `pendenciasParaIniciar`) e para o
`ExtubationCard`, que deixou de calcular e só desenha. Duas contas da mesma
pergunta clínica divergem; uma não. Se for acrescentar um consumidor, leia o
mesmo objeto.

`pendenciasParaIniciar` exclui o próprio critério "TRE aprovado" — sem isso a
pergunta se morde: para iniciar o teste seria preciso já tê-lo feito. O rótulo é
exportado de `clinical.ts` como `CRITERIO_TRE_APROVADO` justamente para que
renomeá-lo lá não quebre a exclusão em silêncio.

### O app não cronometra os cinco minutos, e não bloqueia o início

Cada critério de falha exige persistência de cinco minutos. Quem julga isso é o
terapeuta, que está na beira do leito; o app cronometra a **sessão**. Não
acrescente contagem regressiva por critério: seria afirmar uma medida que o app
não faz.

E as pendências que o painel mostra antes de iniciar são informação, não trava.
Quem decide é o terapeuta.

### Pendências clínicas desta fase

- O pH de corte é **7,35**, decisão do mentor em 01/09/2026. O Boles 2007, que o
  app também cita, usa **7,32**. A divergência é real e está registrada como
  `parecer_tre_ph` em `src/data/references.ts` — não é erro de digitação e não
  deve ser "corrigida" para 7,32.
- `MODALIDADES_TESTE` (PSV, CPAP, Tubo T) está marcada **CONTEÚDO A VALIDAR** e
  não tem fonte. Levar ao mentor.
- **Por quanto tempo um TRE vale?** Antes da fase o critério expirava junto com
  a evolução diária; agora lê o histórico inteiro, então um TRE aprovado há
  cinco dias continua contando. Não inventei janela de validade: é pergunta
  clínica, e o subtítulo do card foi corrigido para dizer de onde cada número
  vem enquanto ela não é respondida.
- **Não existe caminho para corrigir uma sessão encerrada.** A RLS permite
  `update` e `delete`, a interface não oferece. "Falhou" grava um bloqueador
  absoluto; hoje pede confirmação, mas não dá para desfazer. É decisão de
  produto do Jeann.

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
9. **O teste do gráfico de MRC depende de como o Recharts serializa o path,
   não de uma contagem óbvia.** `src/components/patient/TrendCharts.test.tsx`
   prova que a série de MRC não interpola através de um dia sem avaliação
   completa. Contar elementos `<path>` não distingue nada — é sempre 1 por
   linha, com ou sem lacuna. O que distingue é o atributo `d`: o gerador de
   curva do d3 abre um novo comando `M` (moveto) a cada ponto nulo quando a
   lacuna é preservada, e usa um único `M` quando os nulos são interpolados.
   O teste conta esses `M`: 2 significa lacuna preservada, 1 significa que
   virou interpolação. Recharts está na 2.15.4 hoje; se uma subida de versão
   mudar a serialização do path e quebrar esse teste, a quebra não é ruído
   para apagar — é o teste avisando que o app passou a desenhar uma
   recuperação de força que ninguém mediu, e é exatamente isso que ele existe
   para impedir.
10. **`abaEscolhidaPeloUsuario`, em `PatientDetail.tsx`, não é reiniciado
    quando o `id` da rota muda.** O sinalizador existe para impedir que a
    carga assíncrona de evoluções troque a aba de quem já clicou numa; ele é
    lido dentro de `load()`, mas nunca é zerado no `useEffect` que reage a
    `[id]`. Hoje isso é inofensivo porque nenhum link do aplicativo pula do
    detalhe de um paciente para o de outro sem recarregar a página. No dia em
    que existir navegação de "próximo paciente", a aba escolhida para o
    paciente A vai vazar para o paciente B e suprimir a escolha automática de
    aba que deveria valer para ele. Quem adicionar essa navegação precisa
    zerar o sinalizador junto com a troca de `id`.
11. **A tabela `tre_sessions` é aplicada à mão.** Não há banco no ambiente de
    desenvolvimento e nenhum teste executa o `schema.sql`, então o DDL sai daqui
    revisado mas NÃO verificado. Sem ele aplicado no Supabase, o painel de TRE
    monta normalmente e falha só na hora de gravar. Quem aplica é o Jeann.
