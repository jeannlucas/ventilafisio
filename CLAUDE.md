# Ventila Fisio

## O que é
Apoio à decisão em ventilação mecânica na UTI. É uma **POC**, declarada assim
pelo próprio README.

## Modo
MANUTENÇÃO.

Estado em 03/09/2026: a suíte roda e passa. `pnpm test` devolve **617 testes
em 28 arquivos** e `pnpm build` (que roda `tsc --noEmit` antes) sai limpo.

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
- **O resultado do TRE vale 24 horas** (`VALIDADE_TRE_HORAS`, em
  `src/lib/tre.ts`). Antes da fase o critério expirava sozinho, junto com a
  evolução do dia em que estava gravado; a tabela de sessões perdeu essa
  expiração natural, e sem a janela um TRE aprovado há cinco dias seguia
  contando como critério atendido.

  A janela é parecer do mentor (01/09/2026), coerente com a cadência diária de
  **AARC 2024** (recomendação 3: avaliar e, se apropriado, testar antes do
  meio-dia de cada dia — CONDICIONAL, certeza muito baixa) e de **ATS/CHEST
  2017**. Nenhuma das duas afirma a janela literalmente, e é por isso que ela
  entra como `parecer_tre_validade` e não como número de diretriz.

  **A janela vale para `aprovado` E para `falhou`, simetricamente.** Isso olha
  torto de primeira, porque derruba um bloqueador absoluto: um TRE que falhou
  há 30 horas deixa de reprovar. Mas ele está velho exatamente como um aprovado
  de 30 horas está, e a cadência das diretrizes manda fazer um teste novo, não
  arrastar o de anteontem. Expirado vira `null`, "não medido", que não aprova
  ninguém — só impede um resultado velho de decidir o dia de hoje. Se alguém
  "consertar" a assimetria, vai ser isto que quebra.

  O campo legado leva a mesma janela quando a data dele é conhecida (o
  `recorded_at` da evolução). Sem data, é tratado como não expirado: descartar
  em silêncio um dado só porque não sabemos a idade dele apagaria informação
  real da tela.
- **Não existe caminho para corrigir uma sessão encerrada.** A RLS permite
  `update` e `delete`, a interface não oferece. "Falhou" grava um bloqueador
  absoluto; hoje pede confirmação, mas não dá para desfazer. É decisão de
  produto do Jeann.

## A gasometria é interpretada, e cada número diz de onde vem

A Fase 6 fez o app ler a gasometria em vez de só guardá-la: distúrbio primário,
agudo ou crônico, compensação esperada, ânion gap corrigido pela albumina e
condutas sugeridas. `src/lib/gasometria.ts` faz todo o raciocínio;
`GasometriaPanel.tsx` só desenha o que ele devolveu e **não tem número clínico
nenhum dentro**.

### As decisões que parecem erradas e não são

1. **`sem_disturbio` exige os TRÊS parâmetros na faixa, não só o pH.** Berend
   2014 registra que na acidose respiratória crônica o pH pode estar normal ou
   acima de 7,40. Um classificador que olhasse só o pH chamaria o retentor
   crônico compensado de paciente sem distúrbio, que é a mesma forma do defeito
   da FiO₂ zero virando P/F infinita em verde.
2. **`indeterminado` não é `sem_disturbio`.** O primeiro significa que os
   valores não fecham entre si; o segundo, que não há problema. Diferem em
   rótulo, em explicação e em **cor** — âmbar contra verde, e a cor sobe para a
   borda do painel. Nada de verde tranquilizador numa gasometria que não fecha.
3. **O pH decide o LADO; só depois os parâmetros decidem o sistema.** Uma
   acidose metabólica compensada tem PaCO₂ BAIXA: perguntar "a PaCO₂ está
   baixa?" antes de olhar o pH devolve alcalose respiratória, o distúrbio
   oposto, na tela de um app de decisão clínica.
4. **Quem decide agudo × crônico é o BICARBONATO.** A regra do pH por 10 mmHg
   (0,08 e 0,03) é convenção de livro-texto e a pesquisa desta fase não achou
   estudo primário nenhum. Ela é leitura auxiliar, marcada como convenção, e
   **os coeficientes não aparecem na tela** — há teste proibindo `/0[.,]0[83]/`
   ali, justamente porque é onde alguém "completaria" a funcionalidade.
5. **Na alcalose metabólica o app NÃO dá número.** Decisão do mentor em
   01/09/2026, tomada depois de saber que o estudo primário da fórmula usual é
   **em cães** (Madias 1984) e que Berend 2014 avisa em nota de rodapé que a
   previsão nesse distúrbio é difícil. Isto é decisão de não exibir, não
   implementação faltando, e é a coisa mais fácil da fase de alguém "consertar"
   por engano. Há teste que fica vermelho se um número aparecer.

### O ânion gap é sempre corrigido pela albumina

`AG = Na⁺ − (Cl⁻ + HCO₃⁻)`, sem potássio. A correção é Figge 1998, medida em
152 pacientes de UTI: `+2,5 mmol/L` por g/dL abaixo de 4,0.

Em UTI a hipoalbuminemia é regra e derruba o gap calculado — sem correção o app
deixaria de enxergar acidose exatamente na população que ele atende. Os dois
valores aparecem, e **sem albumina o corrigido é `null`**: o app não usa 4,0
como se tivesse sido medido nem rotula o bruto de corrigido.

**O app não afirma faixa normal** para o ânion gap: ela depende do analisador do
laboratório e as fontes divergem de 3-12 a 8,5-15.

### `Conduta` não tem campo de dose

O app nomeia o medicamento e nunca a quantidade. Não existe onde escrever um
número de mEq, então quem quiser prescrever no futuro tem de alterar o tipo — e
aí é decisão consciente, não deslize. O gatilho do bicarbonato é pH < 7,20,
parecer do mentor.

`alcada: "medica"` sai visualmente distinta e sempre acompanhada de que quem
decide é a equipe médica. As quatro condutas têm a alçada afirmada por teste: a
direção perigosa não é rotular fisioterapia como decisão médica, é o inverso.

### O rodapé sai do resultado, nunca de lista escrita à mão

`interpretar` devolve as `sourceKeys` que combinam com o que ele de fato
produziu, e o painel só as repassa. Chave e conteúdo saem das mesmas variáveis,
então não têm como divergir — este projeto embarcou três vezes um painel cujo
rodapé não cobria o que ele exibia.

### O que ficou pendente do mentor

Duas perguntas abertas, e as duas são acopladas:

1. **O critério de cronicidade da BTS foi ESTREITADO de forma interina.** Ele
   disparava com qualquer PaCO₂ > 45, inclusive com pH alcalêmico: pH 7,48 /
   PaCO₂ 48 / HCO₃⁻ 35, uma alcalose metabólica corriqueira de UTI, era rotulada
   como hipercapnia de longa data e recebia a conduta de alvo de SpO₂ 88-92% —
   restrição de oxigênio para quem não é retentor. O mentor decidiu o "OU" sobre
   dois casos concretos, os **dois com pH ≤ 7,36**; nunca foi perguntado sobre
   caso alcalêmico. Acrescentado `pH <= 7,45` ao portão externo, o que preserva
   os dois casos dele. Falta a palavra final.
2. **Retentor crônico com pH ≥ 7,40 cai em "alcalose metabólica".** O lado
   alcalino não tem ramo para PaCO₂ alta com HCO₃⁻ alto. É a regra padrão de
   livro-texto, mas o dossiê desta fase cita o NEJM dizendo que na acidose
   respiratória crônica o pH pode estar acima de 7,40 — ou seja, a regra padrão
   erra na população que este app atende. **Não corrigido de propósito**: é
   pergunta clínica, e o conserto óbvio da pendência 1 apagaria o único sinal
   correto que esse paciente ainda recebe.

Também segue sem fonte a lista `MODALIDADES_TESTE` da Fase 5, e o `verificada:
true` das seis publicações novas vale confirmar com ele, porque é o que suprime
o aviso de "pendente de revisão" na tela.

## Esforço, drive e recrutabilidade: o que o app mede e o que ele se recusa a dizer

A Fase 7 acrescentou o bloco de mecânica do esforço. `src/lib/mecanica.ts` faz
todo o raciocínio; dois painéis desenham o que ele devolve e **não têm número
clínico nenhum dentro**.

### As duas armadilhas opostas, no mesmo commit

**P0.1 é positivo e ZERO É VALOR VÁLIDO E GRAVE**: significa ausência de drive.
Um `ACIMA_DE_ZERO` ali barraria justamente o achado mais sério que o campo pode
ter.

**ΔPocc é NEGATIVO por definição** — é a deflexão abaixo da PEEP. Um `min: 0`
ali barraria **toda medida que existe**, exatamente como barraria todo BE de
paciente acidótico.

Os limites são `p01: { min: 0, max: 30 }` e `pocc: { min: -60, max: 0 }`, e cada
um tem teste de aceitação **e** de reprovação: campo sem entrada no mapa é
ignorado em silêncio por `invalidMeasurements`, então o de aceitação sozinho não
prova nada.

### O que é publicado, o que é parecer

| Número | Procedência |
|---|---|
| P0.1 acima de **3,5** | `telias_2020` |
| P0.1 abaixo de **1,5** | `parecer_p01_faixa` — Telias publica **1,0**, e o mentor reafirmou 1,5 depois de ver isso |
| `Pmus = 0,75 × \|ΔPocc\|` | `bertoni_2019` |
| `ΔP_L,dyn = (P_pico − PEEP) + 2/3 × \|ΔPocc\|` | `bertoni_2019` |
| Faixas 4, 8, 12 do Pmus | `parecer_pmus_faixas` — Bertoni valida a CONVERSÃO, não as faixas |
| R/I | `chen_2020` |

As operating characteristics do Telias (sensibilidade 80%, especificidade 77%)
foram medidas contra **esforço esofágico**, não contra desfecho clínico, e a
tela diz isso. É a diferença entre "prevê esforço alto" e "prevê que o paciente
vai mal".

O **15** que aparece no texto da faixa mais alta é frase, **não fronteira**. As
fronteiras são 4, 8 e 12. O mentor escreveu as bordas de forma difusa ("< 3-4",
"> 12-15") e código precisa de número.

### Três recusas deliberadas, cada uma com teste

1. **A ΔP_L,dyn não recebe faixa nem cor de status.** O mentor não foi
   perguntado sobre limiares dela; a literatura tem 15 e 20. A ausência de cor
   é testada por `borderLeftColor`, porque trocar `T.dim` por uma cor de status
   não mudaria texto nenhum e a suíte ficaria verde.
2. **O app não diz se o paciente é recrutável.** O 0,5 que circula como corte é
   a **mediana da coorte de derivação de Chen 2020 (n = 45)**, o erro de medida
   em torno dele é da ordem da distância entre os limiares propostos, e a
   validação por tomografia mais recente deu AUC 0,70 com IC de 0,52 a 0,89.
   Toda razão exibida na tela carrega essa ressalva, e há teste que confere o
   container inteiro — não só o elemento do número.
3. **A razão pode ser NEGATIVA e não é recortada.** Quando o volume expirado
   extra fica abaixo do insuflado, o R/I sai negativo: é artefato de medida, e
   recortar esconderia o sinal. Os dois lugares que exibem razão carregam a
   frase que explica isso, de uma constante única.

### Fechamento de via aérea desconhecido RECUSA calcular

Quando há fechamento completo, a PEEP baixa efetiva é a **pressão de abertura**
(Chen 2020). Sem essa substituição a conta erra exatamente no paciente em que
ela mais importa.

`fechamentoViaAerea` exige booleano declarado: `null` devolve `null`, igual ao
`passivo`. Não saber se há fechamento **não é o mesmo** que saber que não há —
calcular pelo caminho sem substituição para uma pergunta não respondida seria o
erro que a substituição existe para impedir.

A assimetria com o `passivo` é proposital: `passivo` recusa `false` também,
porque paciente não passivo não pode fazer a manobra; `fechamento` aceita
`false`, porque "não há" é resposta legítima que muda a conta.

### Nada derivado é gravado

`Pmus` e `ΔP_L,dyn` são recalculadas na exibição. O banco guarda `pocc`,
`ppico` e `peep`. Se o mentor mudar um coeficiente amanhã, **o histórico inteiro
se corrige sozinho**, em vez de ficar com números velhos cristalizados no banco
afirmando o que a versão anterior achava.

### O que ficou pendente

- **Os oito valores da manobra não têm teto de escala.** A cerca reusa
  `measurement-limits.ts` e barra negativo, zero onde zero não existe e não
  numérico. Mas `peep`, `pplat` e `vc` **não têm `max` em lugar nenhum do app**,
  nem para a evolução diária, então PEEP 150 ou volume 4500 passam e produzem
  razão formatada. Não foi inventado teto: teto de escala é número clínico e
  precisa de fonte. Se entrar, entra em `measurement-limits.ts` para o app
  inteiro, não só para a manobra.
- **A ΔP_L,dyn merece faixas?** A literatura tem 15 e 20; o mentor não foi
  consultado.
- **A origem do P0.1 muda a leitura** (valor do ventilador contra oclusão
  dedicada, que Telias mostra não serem intercambiáveis), e o app não a
  distingue.
- **A garantia da ressalva são três variáveis mantidas em sincronia à mão**, não
  uma lista derivada. Os três sítios que hoje imprimem razão estão cobertos; um
  quarto reintroduziria o defeito.

## Alvo por patologia: o que a doença de base muda, e o que ela não muda

A Fase 8 fez as sugestões de ventilação enxergarem a patologia do paciente.
`src/lib/alvos.ts` faz todo o raciocínio; os painéis desenham o que ele devolveu
e **não têm número clínico nenhum dentro**.

`PatologiaKey` é união fechada de três — `dpoc`, `asma`, `lesao_cerebral_aguda` —
e `derivarPerfil` filtra `patient.comorbidities` por ela antes de qualquer
consumidor. A caixa genérica **"Doença neurológica" (`neuro`) não é a mesma coisa
que `lesao_cerebral_aguda`**, e a distinção é estrutural: `neuro` sequer chega em
`perfil.patologias`. Sem isso o alvo de PaCO₂ do TCE cairia sobre a doença
neuromuscular crônica, onde ele empurra para o lado errado.

Obesidade **não** está na união: ela modula o volume corrente por `perfil.obeso`,
que vem do IMC, não de caixa marcada.

### Asma e DPOC vão em direções opostas, e o app nunca as funde

É o eixo da fase inteira, e o defeito que ela mais tentou reintroduzir:

- **Asma: teto fixo de 5 cmH₂O**, com ou sem auto-PEEP. A tabela do ARDSnet não
  se aplica.
- **DPOC: 80 a 85% do auto-PEEP MEDIDO.** Sem auto-PEEP medido o aplicativo
  **não dá número nenhum** — devolver o valor da tabela seria afirmar que ela
  vale ali.

A faixa existe porque Ranieri 1993 situa o limite em 85% e Demoule 2020 em 80%.
O app mostra os dois em vez de escolher um.

Duas armadilhas registradas porque já aconteceram nesta fase:

1. O ramo do "ponto de partida" nasceu **acima** do ramo da asma e mandava o
   asmático registrar o auto-PEEP, medida que o app nunca usa nele. E o
   `AdmissionCard` sempre passa os três valores nulos, então **todo** asmático
   via a linha. Ordem de ramo é decisão clínica aqui, não estilo.
2. O teto da asma é `Math.min(base.peep!, PEEP_MAX_ASMA)`, e **nenhum fixture o
   distingue de um `5` cru**, porque o piso do `ARDSNET_LOW` é 5. Fica assim de
   propósito: `Math.min` é o operador de um TETO, e um `5` cru **elevaria** para
   5 um valor de tabela já menor, agravando o aprisionamento. A intestabilidade
   é propriedade da tabela, não do código.

### Auto-PEEP ZERO recusa número, e não é a mesma recusa

Zero é medida real e **favorável**: significa que não há aprisionamento aéreo a
limitar, ou seja, a premissa da regra dos 80 a 85% não existe naquele paciente.
Nenhuma das duas fontes diz "auto-PEEP zero, logo PEEP zero". O app chegou a
mostrar **"PEEP 0,0 a 0,0 cmH₂O"** para paciente com P/F 150: prescrição de ZEEP
nascida de multiplicar um achado bom por 0,8.

Hoje o zero recusa número, **com motivo próprio, diferente do motivo do "não
medido"**. Os dois recusam, por razões diferentes, e há teste que fica vermelho
se alguém fundir os dois textos. Isso é o oposto de confundir zero com ausência:
é levar o zero a sério.

O corte é em **zero exato**, e só nele, porque zero é a ausência do fenômeno e
não um limiar. Auto-PEEP pequeno mas não nulo (1, 2) continua produzindo faixa,
e é pergunta aberta ao mentor — inclusive porque `auto_peep = 1` hoje aparece
como "0,8 a 0,8 cmH₂O", que tem a mesma cara do defeito acima.

### Sem gasometria e sem oximetria, a base é o preset, não a tabela

`sugerirPeepFio2` constrói a base a partir da oxigenação: com P/F ou SpO₂, a
linha do ARDSnet; sem nenhum dos dois, o preset (FiO₂ 100, PEEP 5,
`presetAdmissao: true`). **Só depois** roda o portão da patologia, sobre a base
que construiu.

Essa separação é o conserto de dois defeitos que se sucederam:

1. O portão do preset ficava **antes** do portão da patologia, então num dia sem
   gasometria o Dashboard imprimia "PEEP 5 · tabela ARDSnet" para o DPOC — a
   tabela que a fase declara não se aplicar — e **descartava em silêncio** o
   auto-PEEP que o fisioterapeuta tinha acabado de digitar.
2. O primeiro conserto roteou esse paciente para o ramo da tabela, e ele passou a
   receber **FiO₂ 40% sem nenhum dado de oxigenação**. Ausência de dado virando
   número afirmativo, e no sentido perigoso: 40% é baixo onde o padrão seguro sem
   informação é 100%.

A lição vale para além desta função: ao consertar um caminho de ausência de dado,
varra os **outros campos que a mesma função devolve**. O defeito não sumiu, mudou
de campo.

O rótulo "tabela ARDSnet" só aparece quando o número veio mesmo da tabela.

### O app não rebaixa a frequência respiratória

A fase chegou a baixar o piso de frequência de 12 para 10 em obstrutivo, e a tela
dizia *"piso de frequência baixado para dar tempo de expirar"*. Duas coisas
estavam erradas ao mesmo tempo:

- **O piso nunca entrava em vigor.** `bruto = predBW × 100 / vcTargetMl`, e o
  alvo de volume é sempre `predBW × 6` (ou `× 7` no obeso), então **o peso se
  cancela** e a frequência é 17 ou 14 para qualquer paciente. Nem 12 nem 10
  jamais limitaram nada. A tela afirmava um rebaixamento que não acontecia.
- **O 10 não tinha fonte.** Nem publicação, nem parecer: o dossiê o registra como
  pergunta aberta. Era número clínico inventado, citado sob Demoule e Ranieri.

O piso obstrutivo saiu. A modulação ficou, com o que Demoule de fato publica — a
relação I:E alvo de 1:4 a 1:6 — dizendo explicitamente que **o aplicativo não
altera a frequência e não calcula a relação**, porque não conhece o tempo
inspiratório configurado no ventilador. Qual é o piso em obstrutivo, se é que
existe, é pergunta ao mentor.

Isto passou por uma review de tarefa sem ser pego porque a fixture era
`sugerirVentilacao(70, 700)` — 10 ml/kg, alvo que `sugerirVc` **nunca produz**.
Fixture de ramo inalcançável prova o comportamento de um código que ninguém roda.

### O app não diz se o obeso deve ser recrutado, e não dá piso de PEEP

O ensaio que testou recrutamento com PEEP alta no obeso é **intraoperatório e
negativo**, e não sustenta piso de PEEP nenhum. Por isso o aviso do obeso **não
tem número**, e há teste que exige que ele não tenha dígito.

Mas o teste que dizia guardar a recusa **escopava a asserção no elemento do
aviso**, que é texto constante: injetar um `Math.max(peep, 10)` para o obeso
deixava a suíte **inteira verde**. O nome do teste prometia o dobro do que a
asserção verificava. Hoje a recusa é afirmada onde ela mora, em `alvos.ts`:
`modulacoes` vazia e `valor.peep === base.peep`.

O volume corrente do obeso é a única modulação da fase que **move um número**:
a faixa desloca de 4–6 para 6–8 ml/kg de peso predito, e o alvo vai a 7. É
`parecer_vc_obeso`, do mentor — De Jong 2020 recomenda 6 nos dois grupos.

### A citação tem que sustentar o que está escrito EMBAIXO dela

O parecer do VC no obeso entrou primeiro em `THRESHOLD_SOURCES.vcKg`, que aparece
em rodapés escritos à mão: **todo** paciente passou a ver "Parecer clínico (VC no
obeso)" sob um card que mostrava a faixa 4–6 do não obeso. Sobre-citação.

A chave `vcKgObeso` separou os dois. Mas o conserto, sozinho, trocou a
sobre-citação pela **sub-citação**: o obeso ficou vendo 6–8 classificado "Ideal"
sobre um rodapé que citava só fontes que não sustentam 6–8. Os dois rodapés
escritos à mão passaram a derivar de `sVc.modulacoes`, como o resto da fase.

**Rodapé escrito à mão é o defeito, nas duas direções.** Este projeto já embarcou
três vezes um painel cujo rodapé não cobria o que ele exibia, e nesta fase
embarcou o inverso duas vezes em dois commits seguidos.

### O alvo de PaCO₂ é alvo próprio, não modulação de um alvo existente

`alvoPaco2` devolve 35 a 45 mmHg **só** para `lesao_cerebral_aguda`, e devolve
`null` para todo o resto — não um alvo neutro. É o único produtor de `alvos.ts`
com `base === valor` **e** `modulacoes` não vazia, e é proposital: não existe
alvo contrafactual, porque sem a patologia o app não dá alvo de PaCO₂ nenhum.

Por isso ele é renderizado com `LinhaModulacaoSimples`, nunca com
`LinhaModulacao`: esta imprime "Padrão sem essa modulação: X" e inventaria um
alvo padrão que os outros pacientes não têm.

A ressalva do Robba 2020 — recomendação **forte** sobre evidência de qualidade
**baixa**, válida para o paciente **sem hipertensão intracraniana clinicamente
significativa**, que o app não tem como saber — vai em elemento **irmão**, nunca
dentro do que carrega os números. Este projeto já embarcou um teste que passava
porque os dígitos de uma ressalva estavam no mesmo elemento do valor asserido.

### O que ficou pendente

- **Qual é o piso de frequência em obstrutivo, se existe?** O 10 saiu por não ter
  fonte. Demoule diz "frequência baixa" e não publica número.
- **Auto-PEEP pequeno mas não nulo.** O corte é em zero exato; 1 produz faixa, e
  ela aparece como "0,8 a 0,8".
- **DPOC e lesão cerebral aguda juntos puxam a PaCO₂ em direções opostas** —
  hipercapnia permissiva contra normocapnia de 35 a 45. O app mostra os dois
  alvos lado a lado sem reconciliar.
- **Asma e DPOC marcados juntos: o teto da asma é aplicado, e o texto NÃO afirma
  que é o mais conservador**, porque não é em toda a faixa: com auto-PEEP baixo o
  limite do DPOC cai abaixo de 5. Tomar o menor dos dois seria aritmética de dois
  tetos já publicados, mas resolveria sozinha uma pergunta que ninguém respondeu.
- **O preset de admissão é cego à patologia por construção**, e o portão do
  preset só cede quando há auto-PEEP medido.
- **O alvo de PaCO₂, o aviso do obeso e a linha de I:E não existem no
  `AdmissionCard`**, que é a única tela antes da primeira evolução — o momento em
  que os três mais importam. `AVISO_OBESO` mora em `Dashboard.tsx` e não em
  `lib/`, o que é justamente o que impede o reuso.
- **A chave `obstrutivo` cita Demoule 2020 E Ranieri 1993**, então o ramo só-asma
  exibe no rodapé um artigo de auto-PEEP em DPOC que não sustenta o teto de 5. É
  sobre-citação, não afirmação falsa, e separar em duas chaves mexe em
  `references`, no `LABELS` do `Sources.tsx` e no teste de referência órfã.
- **`auto_peep`, como `peep`, `pplat` e `vc`, não tem teto de escala.** A
  diferença é que auto-PEEP 150 não fica parado num campo: vira faixa formatada
  como alvo. Teto de escala é número clínico e precisa de fonte.

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
12. **O BE é rotineiramente NEGATIVO e zero é o valor normal.** Um `if (!be)`
    mata o −2 e o 0 na mesma linha. É a armadilha nº 5 num campo onde zero fica
    no MEIO da escala, não na ponta — pior que nos escores. O limite em
    `measurement-limits.ts` é `{ min: -50, max: 50 }`, cerca de plausibilidade e
    não faixa clínica, sem piso positivo de propósito.
13. **As colunas `na`, `cl` e `albumina` são aplicadas à mão**, como a
    `tre_sessions`. Sem elas, o formulário grava os demais campos e falha nos
    três; e sem sódio e cloro o app simplesmente não mostra ânion gap nenhum,
    que é o comportamento correto e não um defeito.
14. **P0.1 e ΔPocc caem em armadilhas OPOSTAS.** Zero é grave no P0.1 (ausência
    de drive) e o campo é positivo; o ΔPocc é negativo por definição e zero é
    "esforço não detectado". Piso positivo num, teto zero no outro: inverter
    qualquer um dos dois barra medida real.
15. **A tabela `recruitment_maneuvers` e as colunas `p01` e `pocc` são
    aplicadas à mão**, como as anteriores. Sem elas o formulário falha nos dois
    campos e o painel da manobra monta mas não grava.
16. **A coluna `auto_peep` é aplicada à mão**, como as anteriores. Sem ela o
    formulário de evolução grava os demais campos e falha nesse; e sem
    auto-PEEP medido o app simplesmente não dá alvo de PEEP para o paciente
    com DPOC, que é o comportamento correto e não um defeito.
17. **Asma e DPOC vão em direções OPOSTAS, e a ordem dos ramos é decisão
    clínica.** O teto da asma é fixo em 5 com ou sem auto-PEEP; o do DPOC exige
    auto-PEEP medido. Um ramo genérico de "obstrutivo" acima do ramo da asma
    manda o asmático medir o que o app nunca vai usar nele, e o
    `AdmissionCard` chama sempre com os três valores nulos, então TODO
    asmático veria. Já aconteceu nesta fase.
18. **Auto-PEEP ZERO é medida real e favorável, e recusa número por motivo
    PRÓPRIO.** Zero significa que não há aprisionamento a limitar, ou seja, a
    regra dos 80 a 85% perdeu o referente. Não é a mesma recusa do "não
    medido", e há teste que fica vermelho se alguém fundir os dois textos.
    Multiplicar o zero por 0,8 devolvia "PEEP 0,0 a 0,0 cmH₂O" para paciente
    com P/F 150.