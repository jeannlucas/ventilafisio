# Dossiê clínico — Ventila Fisio, Fase 6

Para: mentor clínico
De: equipe de desenvolvimento
Data: 01/09/2026
Assunto: as quatro perguntas do painel de gasometria que ficaram sem número

## Como usar este documento

Em 01/09/2026 o mentor respondeu cinco perguntas sobre o painel de
gasometria. Quatro ficaram fechadas ou parcialmente fechadas:

- **Bicarbonato**: sinalizar o medicamento pelo nome, **nunca a dose**,
  quando o **pH < 7,20**. Fechado.
- **Acidose respiratória**: o aplicativo **deve** distinguir aguda de
  crônica, por uma regra a cada 10 mmHg de PaCO₂. Faltou a regra.
- **Alcalose metabólica**: o aplicativo **deve** opinar sobre a compensação
  esperada. Faltou a regra e a fonte.
- **Ânion gap**: o mentor **quer** o ânion gap. Faltou dizer se calcula com
  ou sem potássio, e qual faixa trata como normal.
- **DPOC**: o mentor disse que não sabe os valores e pediu pesquisa.

Este documento é a pesquisa. Ele não decide nada. Cada item traz, separados
de propósito e nunca misturados: **o que a fonte realmente diz**, **se a
fonte diz isso para este uso ou se aplicar aqui é inferência nossa**, e
**quão forte é a fonte**. Onde um dado bibliográfico não pôde ser
confirmado numa fonte efetivamente acessada, o campo diz isso com todas as
letras, em vez de trazer um número plausível.

Vale repetir o motivo, porque ele é específico deste projeto: o repositório
é público e cada número na tela leva uma citação que o usuário pode abrir.
Uma citação inventada que se revele errada é pior do que uma lacuna
declarada.

**Fora de escopo, já resolvido:** a fórmula de Winters para acidose
metabólica, PaCO₂ esperada = 1,5 × HCO₃⁻ + 8 ± 2 (Albert MS, Dell RB,
Winters RW. *Quantitative displacement of acid-base equilibrium in metabolic
acidosis*. Ann Intern Med 1967;66(2):312-322). Não refizemos essa pesquisa.
**Registro para o mentor:** nenhuma das fontes lidas nesta rodada contradiz
Winters. A revisão do NEJM de 2014 (Berend e cols., adiante) reproduz a
fórmula **exatamente nesses termos**, nomeia-a "Winters formula" em nota de
rodapé e informa que a resposta secundária se completa em 12 a 24 h.

### Convenção de tipos deste projeto

O código distingue `Publicacao` (citação real e verificável) de `Parecer`
(juízo de profissional). Boa parte do que segue é **convenção de livro-texto
sem estudo primário rastreável**, e essa distinção precisa sobreviver até a
tela: onde este documento diz "convenção", o número **não** deve entrar como
`Publicacao`.

---

## Pergunta 1 — Acidose e alcalose respiratória: aguda × crônica

### A pergunta

Qual é a variação esperada de HCO₃⁻ e de pH a cada 10 mmHg de desvio da
PaCO₂, para acidose e alcalose respiratória, aguda e crônica?

### O que eu proponho

Uma tabela única, com a regra do **bicarbonato** como critério primário e a
regra do **pH** apenas como leitura auxiliar (o motivo está em "Divergências").

| Distúrbio | ΔHCO₃⁻ por 10 mmHg de ΔPaCO₂ | ΔpH por 10 mmHg (auxiliar) |
|---|---|---|
| Acidose respiratória **aguda** | +1 mmol/L | −0,08 |
| Acidose respiratória **crônica** | +4 a +5 mmol/L | −0,03 |
| Alcalose respiratória **aguda** | −2 mmol/L | +0,08 |
| Alcalose respiratória **crônica** | −4 a −5 mmol/L | +0,03 a +0,04 |

Concretamente, para a decisão "aguda ou crônica" na acidose respiratória:
com PaCO₂ de 60 mmHg (20 acima de 40), HCO₃⁻ de ~26 mmol/L sugere quadro
agudo; HCO₃⁻ de ~32 a 34 mmol/L sugere adaptação renal completa, ou seja,
crônico. Entre os dois, agudo sobre crônico.

O aplicativo deve dizer **"compatível com"**, nunca "é". A classificação
aguda/crônica é temporal e depende da história do paciente; a gasometria
sozinha só oferece compatibilidade.

### A fonte

**Fonte principal (revisão de alto impacto, texto lido na íntegra):**
Berend K, de Vries APJ, Gans ROB. *Physiological approach to assessment of
acid-base disturbances*. N Engl J Med. 2014;371(15):1434-1445.
DOI 10.1056/NEJMra1003327. PMID 25295502.

A Tabela 1 desse artigo foi lida palavra por palavra no PDF. Ela traz, em
inglês:

> Acute: [HCO3−] is increased by 1 mmol/liter for each Paco2 increase of
> 10 mm Hg above 40 mm Hg
> Chronic: generally [HCO3−] is increased by 4–5 mmol/liter for each Paco2
> increase of 10 mm Hg above 40 mm Hg

e, para alcalose respiratória:

> Acute: [HCO3−] is decreased by 2 mmol/liter for each Paco2 decrease of
> 10 mm Hg below 40 mm Hg
> Chronic: [HCO3−] is decreased by 4–5 mmol/liter for each Paco2 decrease
> of 10 mm Hg below 40 mm Hg

A mesma tabela informa que a adaptação secundária se completa em **2 a 5
dias** nos dois distúrbios respiratórios. Valores de referência adotados
pela revisão: pH 7,40 ± 0,02; PaCO₂ 40 ± 2 mmHg; HCO₃⁻ 24 ± 2 mmol/L.

**Estudos primários por trás dos números** — confirmados bibliograficamente
via Europe PMC, mas com uma ressalva importante logo abaixo:

- **Acidose respiratória aguda:** Brackett NC Jr, Cohen JJ, Schwartz WB.
  *Carbon dioxide titration curve of normal man. Effect of increasing
  degrees of acute hypercapnia on acid-base equilibrium*. N Engl J Med.
  1965;272:6-12. DOI 10.1056/NEJM196501072720102. PMID 14219220.
- **Acidose respiratória crônica:** van Ypersele de Strihou C, Brasseur L,
  De Coninck J. *The "carbon dioxide response curve" for chronic hypercapnia
  in man*. N Engl J Med. 1966;275(3):117-122.
  DOI 10.1056/NEJM196607212750301. PMID 5943727.
- **Alcalose respiratória aguda:** Arbus GS, Hebert LA, Levesque PR,
  Etsten BE, Schwartz WB. *Characterization and clinical application of the
  "significance band" for acute respiratory alkalosis*. N Engl J Med.
  1969;280(3):117-123. DOI 10.1056/NEJM196901162800301. PMID 5782512.
- **Alcalose respiratória crônica (humanos):** Krapf R, Beeler I, Hertner D,
  Hulter HN. *Chronic respiratory alkalosis. The effect of sustained
  hyperventilation on renal regulation of acid-base equilibrium*. N Engl J
  Med. 1991;324(20):1394-1401. DOI 10.1056/NEJM199105163242003. PMID 1902283.
- **Alcalose respiratória crônica (cão, mecanismo renal):** Gennari FJ,
  Goldstein MB, Schwartz WB. *The nature of the renal adaptation to chronic
  hypocapnia*. J Clin Invest. 1972;51(7):1722-1730. DOI 10.1172/JCI106973.
  PMID 5032522. PMCID PMC292319.

**Fonte de apoio (revisão, PDF lido na íntegra):** Madias NE, Adrogué HJ.
*Cross-talk between two organs: how the kidney responds to disruption of
acid-base balance by the lung*. Nephron Physiol. 2003;93(3):p61-p66.
DOI 10.1159/000069557.

**Fonte de contraste (estudo primário em humanos, abstract lido):**
Martinu T, Menzies D, Dial S. *Re-evaluation of acid-base prediction rules
in patients with chronic respiratory acidosis*. Can Respir J.
2003;10(6):311-315. DOI 10.1155/2003/818404. PMID 14530822.

**Fontes secundárias, usadas apenas onde declarado:** Brandis K.
*Acid-base pHysiology*, capítulo 4.5 (anaesthesiamcq.com); Yartsev A.,
*Deranged Physiology*, capítulo 204; Patel S, Sharma S. *Respiratory
Acidosis*. StatPearls, atualizado em 12/06/2023.

**O que NÃO consegui confirmar, explicitamente:**

1. **Não li o corpo de nenhum dos quatro artigos do grupo de Boston**
   (Brackett 1965, van Ypersele 1966, Arbus 1969, Gennari 1972). O NEJM e a
   JCI antiga não abriram; o Europe PMC devolveu apenas metadados, sem
   abstract, para Brackett, van Ypersele e Arbus. **Autores, título,
   periódico, ano, volume, número, páginas, DOI e PMID estão confirmados**;
   os coeficientes atribuídos a eles vêm da revisão do NEJM 2014 e das
   fontes secundárias, **não da leitura do original**.
2. O Europe PMC devolveu o segundo autor de Arbus 1969 como **"Herbert LA"**.
   A grafia habitual na literatura é **"Hebert LA"**. Não consegui dirimir.
   Se essa citação for para a tela, confira a grafia antes.
3. **A regra do pH (0,08 e 0,03 por 10 mmHg) não tem estudo primário que eu
   tenha conseguido rastrear.** Ver "Divergências".
4. Não localizei um valor de ΔHCO₃⁻ por mmHg no abstract de Gennari 1972; o
   abstract descreve o mecanismo renal, não o coeficiente.

### O que a fonte realmente diz × o que é inferência nossa

**A fonte diz, para este uso exato:** a revisão do NEJM 2014 é justamente um
manual de interpretação de gasometria à beira do leito. Os quatro números de
bicarbonato são o objeto declarado da tabela. Aplicá-los para separar aguda
de crônica é o uso previsto pela própria fonte, que afirma:

> A respiratory change is called "acute" or "chronic" depending on whether a
> secondary change in the bicarbonate concentration meets certain criteria.

**Inferência nossa:** a faixa "4 a 5" da revisão precisa virar um número ou
uma banda na tela. Propor "entre 4 e 5, e sinalizar acima de 5 como possível
alcalose metabólica associada" é decisão de produto, não afirmação da fonte.
A própria tabela do NEJM sustenta a direção — ela diz que HCO₃⁻ acima do
previsto sugere alcalose metabólica superposta — mas o corte operacional é
nosso.

**Inferência nossa, mais frágil:** a conversão da regra do pH. Madias &
Adrogué (2003) dão, para hipercapnia crônica em humanos, "0,3 nEq/L de
[H⁺] por mmHg" — isto é, +3 nEq/L a cada 10 mmHg. Partindo de [H⁺] = 40
nEq/L (pH 7,40), 43 nEq/L corresponde a pH ≈ 7,37, ou seja, −0,03. **Essa
aritmética é nossa, não da fonte.** Ela bate com a convenção, o que é
tranquilizador, mas não é a mesma coisa que a fonte afirmar "−0,03".

### Força da evidência

**Média-alta para o bicarbonato.** São observações empíricas diretas em
humanos e cães, feitas nos anos 1960-70 por um único grupo de pesquisa
(Schwartz, em Boston) e reproduzidas sem contestação por sessenta anos numa
revisão do NEJM. Não são ensaios randomizados — não faria sentido que
fossem, é fisiologia descritiva. A própria revisão do NEJM assume a
limitação:

> the equations that are used to assess acid–base status are approximations
> based on nearly 40-year-old studies involving humans and dogs. Experimental
> studies of severe chronic hypocapnia and hypercapnia in humans are not
> ethically feasible.

**Baixa para o pH.** Ver abaixo.

### Divergências

**1. A regra do pH parece não ter origem.** Esta é a descoberta mais
desconfortável desta pergunta. A tabela do NEJM 2014 **não traz regra de pH
nenhuma** — só bicarbonato. O StatPearls, consultado diretamente, também
**não** traz valores de pH por 10 mmHg. Os 0,08 e 0,03 circulam em cursinho,
em prova e em livro de UTI. O *Deranged Physiology*, ao rastrear o
coeficiente, declara por escrito:

> Though this "0.008" coefficient is quoted widely, I cannot find its origin
> anywhere.

e sugere que ele sai de aplicar a equação de Henderson ignorando a mudança
do bicarbonato, o que seria uma derivação algébrica, não uma medida. **Minha
recomendação:** se a regra do pH entrar no aplicativo, ela entra como
`Parecer`/convenção, com o rótulo dizendo isso, e o bicarbonato continua
sendo o critério que decide. Não a registre como `Publicacao`.

**2. O bicarbonato crônico: 3,5 × 4 × 5,1.** Três números circulam.

- **3,5 mmol/L por 10 mmHg** — o valor "clássico" mais citado, presente em
  Medscape e em livro-texto. Não consegui atribuí-lo a um artigo primário
  lido.
- **4 mmol/L** — o que o StatPearls afirma ("HCO3− will have increased by
  four mEq/L for every ten mmHg increase in PCO2 over a time course of
  days") e o que Brandis dá como média.
- **4 a 5 mmol/L** — o que a revisão do NEJM 2014 adota.
- **5,1 mmol/L** — o que **foi medido** em 18 pacientes ambulatoriais
  estáveis com doença pulmonar obstrutiva crônica por Martinu e cols.
  (2003), com regressão linear sobre gasometrias arteriais.

Martinu e cols. também mediram a queda de pH: **0,014 por 10 mmHg**, contra
os 0,03 da convenção. Ou seja: os pacientes crônicos reais compensam
**melhor** do que a regra prevê. O abstract conclui que os mecanismos
fisiológicos se mostraram mais eficazes do que as regras clássicas previam.

**Consequência prática, e é a que importa para a tela:** a revisão do NEJM
2014 registra que, ao contrário do que se ensinava, o pH na acidose
respiratória crônica **pode ser normal e, em casos individuais, maior do que
7,40**. Um aplicativo que classifique "pH normal ⇒ sem distúrbio" erra
justamente no retentor crônico compensado. Ver também a Pergunta 4.

**3. Alcalose respiratória crônica: 4-5 (NEJM) × 4,1-4,2 (Krapf, medido).**
Aqui não há conflito, há convergência: Krapf e cols. (1991) mediram queda de
0,41 mmol/L de HCO₃⁻ por mmHg em normais e 0,42 em acidóticos, ou seja, 4,1
a 4,2 por 10 mmHg — dentro da faixa da revisão. Madias & Adrogué (2003)
dizem "aproximadamente 0,4 mEq/L por mmHg" em humanos e 0,4 a 0,5 em cães.

**4. Acidose respiratória crônica: 0,3 (Madias) × 0,4-0,5 (regra dos 4-5).**
Madias & Adrogué (2003), na faixa de PaCO₂ entre 40 e 90 mmHg, afirmam
"0,3 mEq/l de HCO₃⁻ por mmHg" — ou seja, **3 por 10 mmHg**, abaixo tanto da
convenção de 3,5 quanto da faixa 4-5 do NEJM e muito abaixo dos 5,1 medidos
por Martinu. Não consegui reconciliar as duas revisões, ambas com Madias
como autor. Registro a divergência sem resolvê-la.

**5. Um alerta metodológico da própria fonte principal.** A revisão do NEJM
2014 diz que analisadores modernos produzem valores de referência de pH de
**7,40 a 7,44** e respostas secundárias diferentes das publicadas em
livro-texto, e conclui: *"a reappraisal of the prediction equations may be
needed"*. Se o mentor confirmar as regras, é honesto que a tela diga que são
aproximações.

---

## Pergunta 2 — Compensação esperada na alcalose metabólica

### A pergunta

Qual PaCO₂ o aplicativo deve chamar de "compensação esperada" numa alcalose
metabólica, e de onde sai esse número?

### O que eu proponho

**PaCO₂ esperada = 0,7 × (HCO₃⁻ − 24) + 40, com margem de ± 2 a ± 5 mmHg**,
acompanhada de **duas ressalvas na própria tela**:

1. A previsão na alcalose metabólica é **reconhecidamente menos confiável**
   que a de Winters para acidose metabólica. O texto deve dizer isso.
2. A hipoventilação compensatória tem **teto fisiológico**: a hipoxemia
   resultante estimula os quimiorreceptores e limita a resposta. Não é
   esperado que a compensação leve a PaCO₂ muito acima de ~55 mmHg. Uma
   PaCO₂ de 70 mmHg **não** é "compensação de alcalose metabólica"; é
   acidose respiratória associada.

Se o mentor preferir uma linguagem mais conservadora, uma alternativa
defensável é o aplicativo **não** dar número e apenas dizer "espera-se
hipoventilação com elevação modesta da PaCO₂; a previsão quantitativa é
pouco confiável neste distúrbio". Isso também é uma resposta legítima.

### A fonte

**Fonte da fórmula (revisão de alto impacto, texto lido na íntegra):**
Berend K, de Vries APJ, Gans ROB. N Engl J Med. 2014;371(15):1434-1445
(citação completa na Pergunta 1). A Tabela 1 traz, literalmente:

> Metabolic alkalosis
> pH >7.42 and [HCO3−] >26 mmol per liter
> Secondary (respiratory) response: Paco2 = 0.7 × ([HCO3−] − 24) + 40±2 mm Hg
> or [HCO3−] + 15 mm Hg‡ or 0.7 × [HCO3−] + 20 mm Hg§
> Complete secondary adaptive response within 24–36 hr

E as duas notas de rodapé, que são o coração desta resposta:

> ‡ These calculations are easy to make at the bedside but are not reliable
> at all bicarbonate concentrations.
> § The secondary respiratory response is difficult to predict in metabolic
> alkalosis.

**Fonte primária do coeficiente 0,7 (abstract lido no Europe PMC):**
Madias NE, Bossert WH, Adrogué HJ. *Ventilatory response to chronic
metabolic acidosis and alkalosis in the dog*. J Appl Physiol Respir Environ
Exerc Physiol. 1984;56(6):1640-1646. DOI 10.1152/jappl.1984.56.6.1640.
PMID 6735822.

O abstract afirma, em números:

> arterial PCO2 is expected to change by 0.74 Torr for a 1-meq/l chronic
> change in plasma bicarbonate concentration

e acrescenta que a resposta foi uniforme em todo o espectro, da acidose
metabólica grave à alcalose metabólica grave, e independente do modo de
geração da alcalose (diurético, drenagem gástrica ou acetato de
desoxicorticosterona).

**Não confirmado, e é o ponto central desta pergunta:**

- **O estudo primário é em cães.** É a palavra "dog" no próprio título. Não
  encontrei estudo primário em humanos que sustente o coeficiente 0,7.
- Existe um candidato humano: **Javaheri S, Kazemi H. *Metabolic alkalosis
  and hypoventilation in humans*. Am Rev Respir Dis. 1987;136(4):1011-1016.
  DOI 10.1164/ajrccm/136.4.1011. PMID 3116894.** Os dados bibliográficos
  estão confirmados via Europe PMC. **O abstract e o texto NÃO foram lidos**
  — a Oxford Academic exige assinatura. **Não sei o que esse artigo mede nem
  se ele sustenta o 0,7.** Está aqui como pista para o mentor, não como
  apoio.
- O teto de ~55 mmHg e o mecanismo (hipoxemia estimulando quimiorreceptores)
  vieram de **fontes secundárias** — OpenAnesthesia e revisões de referência
  encontradas em busca. **Não localizei o estudo primário desse limite.**
  Trate como convenção fisiológica.

### O que a fonte realmente diz × o que é inferência nossa

**A fonte diz, para este uso exato:** a revisão do NEJM 2014 lista essa
fórmula como a resposta secundária esperada na alcalose metabólica, num
artigo cujo propósito declarado é interpretar gasometria à beira do leito. O
uso é o previsto.

**Inferência nossa, e importante:** aplicar a um paciente de UTI um
coeficiente derivado de **cães** é extrapolação entre espécies. Ela é
padrão na literatura — a própria revisão do NEJM a adota sem ressalva de
espécie — mas continua sendo extrapolação, e o mentor merece saber disso ao
decidir.

**Inferência nossa:** escolher ±2 ou ±5 como margem. O NEJM traz ±2 na
primeira forma e ±5 aparece em outras versões da mesma regra. É decisão de
produto.

### Força da evidência

**Baixa a média, e a mais fraca das quatro perguntas deste dossiê.** Um
estudo experimental em cães, dos anos 1980, referendado por uma revisão do
NEJM que — no mesmo parágrafo em que o referenda — **avisa por escrito que a
previsão é difícil neste distúrbio**. Isso não invalida a regra; significa
que a tela precisa carregar a ressalva junto com o número.

Contraste deliberado: Winters, para acidose metabólica, é estudo em
**humanos** e está na revisão **sem** nota de rodapé de baixa confiabilidade.
As duas regras não devem ter o mesmo peso visual na interface.

### Divergências

**1. O coeficiente: 0,6 × 0,7 × 0,74 × faixas mais largas.** Circulam:

- **0,74** — o valor efetivamente medido por Madias e cols. (1984), em cães.
- **0,7** — o arredondamento adotado pela revisão do NEJM 2014.
- **0,6** — versão que aparece escrita como PaCO₂ = 40 + 0,6 × ΔHCO₃⁻.
- **0,25 a 1,0 mmHg por mEq/L** — faixa muito mais larga, citada em material
  de ensino. Se essa faixa for verdadeira, ela por si só explica por que o
  NEJM chama a previsão de difícil: um HCO₃⁻ de 36 (ΔHCO₃⁻ = 12) daria PaCO₂
  esperada entre 43 e 52 mmHg.

**Não consegui confirmar em fonte primária as versões 0,6 e 0,25-1,0.** Elas
apareceram em busca e em material secundário. Estão listadas para o mentor
saber que a divergência existe, não como citação utilizável.

**2. Três fórmulas para a mesma coisa, na mesma tabela.** O NEJM oferece
`0,7 × (HCO₃⁻ − 24) + 40`, `HCO₃⁻ + 15` e `0,7 × HCO₃⁻ + 20`. Elas **não**
dão o mesmo resultado. Para HCO₃⁻ = 36: a primeira dá 48,4; a segunda dá 51;
a terceira dá 45,2. A nota ‡ do próprio artigo explica: as versões de
cabeceira "não são confiáveis em todas as concentrações de bicarbonato".
Recomendo adotar **só** a primeira, que é a que carrega o coeficiente medido.

**3. Sobre a alcalose metabólica e a DPOC, uma nota que liga as perguntas 2
e 4.** A busca localizou um artigo do *Chest* intitulado *Metabolic Alkalosis
Contributes to Acute Hypercapnic Respiratory Failure*. **Não consegui abrir
nem confirmar seus dados bibliográficos**, então não o cito. Registro apenas
como pergunta ao mentor: numa UTI, o paciente com DPOC em uso de diurético
pode ter alcalose metabólica que reduz o drive e piora a hipercapnia. Se o
mentor achar que o aplicativo deve alertar sobre essa combinação, isso vira
escopo novo e precisa de fonte própria.

---

## Pergunta 3 — Ânion gap

### A pergunta

Com ou sem potássio? Qual faixa normal? E a correção pela albumina?

### O que eu proponho

**Três decisões, uma delas para o mentor bater o martelo (ver "Perguntas que
restam").**

1. **Fórmula sem potássio**, que é a da revisão do NEJM e a mais difundida:
   **AG = Na⁺ − (Cl⁻ + HCO₃⁻)**.
2. **Faixa normal: não fixar um número no código sem ressalva.** Exibir a
   faixa **8 a 16 mmol/L** apenas se acompanhada do aviso de que a faixa
   depende do analisador do laboratório e que analisadores modernos produzem
   valores mais baixos (faixas relatadas de 3 a 12). O aplicativo deve dizer
   ao usuário para conferir a faixa do próprio laboratório.
3. **Correção pela albumina, sempre, e em destaque.** Para cada 1 g/dL de
   queda da albumina sérica abaixo do normal, somar **2,5 mmol/L** ao ânion
   gap calculado. Numa UTI isto não é refinamento acadêmico: é a diferença
   entre ver e não ver uma acidose.

Sugestão de produto: em vez de um só número, mostrar **os dois** — "ânion gap
14; corrigido para albumina 2,0 g/dL: 19" — para que o profissional veja de
onde veio a correção.

### A fonte

**Fórmula e uso à beira do leito (revisão de alto impacto, texto lido):**
Berend K, de Vries APJ, Gans ROB. N Engl J Med. 2014;371(15):1434-1445. A
figura de avaliação da acidose traz literalmente `Anion gap:
([Na+]−[Cl−]−[HCO3− ])` e, ao lado, a instrução de correção:

> Correct for albumin: for every 1 g/dl albumin decrease, increase
> calculated anion gap by 2.5 mmol/liter

No corpo do texto, sobre a faixa de referência:

> Wide reference ranges of 3.0 to 12.0 mmol per liter up to 8.5 to 15.0 mmol
> per liter in the anion gap have been reported, owing to differences in
> laboratory methods. Consequently, clinicians should know the reference
> range for their own laboratory.

E sobre a correção, no texto:

> Without correction for hypoalbuminemia, the estimated anion gap does not
> reveal a clinically significant increase in anions (>5 mmol per liter) in
> more than 50% of cases. For every decrement of 1 g per deciliter in the
> serum albumin concentration, the calculated anion gap should be increased
> by approximately 2.3 to 2.5 mmol per liter. Nevertheless, the
> albumin-corrected anion gap is merely an approximation, since it does not
> account for ions such as magnesium, calcium, and phosphate ions.

**Fonte primária da correção pela albumina (abstract lido no Europe PMC):**
Figge J, Jabor A, Kazda A, Fencl V. *Anion gap and hypoalbuminemia*. Crit
Care Med. 1998;26(11):1807-1810. DOI 10.1097/00003246-199811000-00019.
PMID 9824071.

Nove voluntários normais e **152 pacientes criticamente enfermos** (265
medidas). O abstract afirma:

> Each g/L decrease in serum albumin caused the observed anion gap to
> underestimate the total concentration of gap anions by 0.25 mEq/L

com r² = 0,94, e informa que **49% dos pacientes críticos tinham albumina
abaixo de 20 g/L**. Convertendo unidades: 0,25 mEq/L por g/L equivale a
**2,5 mEq/L por g/dL**. **Esta é a fonte certa para este projeto**: é um
estudo em UTI, exatamente a população do Ventila Fisio.

**Fonte primária do fator alternativo 2,3 (dados obtidos por busca, artigo
não lido):** Feldman M, Soni N, Dickson B. *Influence of hypoalbuminemia or
hyperalbuminemia on the serum anion gap*. J Lab Clin Med. 2005;146(6):317-320.
DOI 10.1016/j.lab.2005.07.008. 5.328 pacientes consecutivos; inclinação da
regressão albumina × ânion gap de **2,3 mM por g/dL**.

**Fonte primária do deslocamento da faixa pelos analisadores (abstract
lido):** Winter SD, Pearson JR, Gabow PA, Schultz AL, Lepoff RB. *The fall of
the serum anion gap*. Arch Intern Med. 1990;150(2):311-313. PMID 2302006.

O abstract contrapõe a faixa tradicional de **8 a 16 mmol/L** à faixa de
**3 a 11 mmol/L** encontrada num de seus laboratórios com o analisador
**Beckman ASTRA**, atribuindo o deslocamento sobretudo à elevação dos
valores de cloreto.

**Fonte sobre limitações (apenas abstract, via Europe PMC):** Kraut JA,
Madias NE. *Serum anion gap: its uses and limitations in clinical medicine*.
Clin J Am Soc Nephrol. 2007;2(1):162-174. DOI 10.2215/CJN.03020906.
PMID 17699401.

**Não confirmado, explicitamente:**

1. **O texto completo de Kraut & Madias 2007 não foi lido.** O site da CJASN
   devolveu HTTP 402 e as rotas alternativas falharam. Do abstract confirmo
   a frase: *"The normal value can vary widely, reflecting both differences
   in the methods that are used to measure its constituents and substantial
   interindividual variability."* Não confirmo nenhum número específico de
   faixa atribuído a esse artigo.
2. **Não confirmei em fonte primária a faixa normal da versão COM potássio.**
   Achei valores conflitantes em fontes secundárias: 10-20, 12-20, 16 ± 4, e
   até 4-12 (StatPearls, que traz a fórmula com potássio mas uma faixa que
   parece ser a da fórmula sem). Brandis diz apenas que "a faixa de
   referência é ligeiramente mais alta com esta fórmula alternativa", sem
   dar o número. **Se o mentor quiser a versão com potássio, este número
   precisa vir dele ou de nova pesquisa.**
3. Feldman 2005: DOI, autores, periódico, ano, volume, número e páginas vêm
   de resultado de busca e do repositório institucional da UTHSCSA. **Não
   abri o artigo nem o abstract no Europe PMC** (a consulta não retornou o
   registro). PMID não confirmado.
4. Winter 1990: li o abstract; **não confirmei DOI** (o artigo é anterior à
   adoção geral de DOI pela *Archives of Internal Medicine*).

### O que a fonte realmente diz × o que é inferência nossa

**A fonte diz, para este uso exato:** Figge e cols. mediram a correção
**em pacientes de UTI** e a propuseram exatamente para evitar que uma
acidose com gap fosse perdida por hipoalbuminemia. É o nosso caso, literalmente.

**A fonte diz, para este uso exato:** a revisão do NEJM instrui a corrigir
sempre — *"the anion gap should always be adjusted for the albumin
concentration"* — e afirma que a albumina, como ácido fraco, pode responder
por até 75% do ânion gap.

**Inferência nossa:** escolher 2,5 em vez de 2,3. O NEJM aceita os dois
("2.3 to 2.5"). Escolhi 2,5 porque a fonte primária que o sustenta (Figge) é
a que estudou pacientes críticos. A fonte que sustenta 2,3 (Feldman) tem
população muito maior mas não é específica de UTI. **Esta é uma escolha,
não um achado**, e está aqui para o mentor confirmar ou trocar. Na prática a
diferença é pequena: com albumina de 2,0 g/dL (queda de 2,2 do valor de
referência de 4,2), a correção é +5,5 com 2,5 e +5,1 com 2,3.

**Inferência nossa:** qual "albumina normal" usar como referência da
subtração. Figge propõe `AG ajustado = AG observado + 0,25 × ([albumina
normal] − [albumina observada])` em g/L, mas o valor de "albumina normal"
depende do laboratório. Se o aplicativo fixar 4,0 ou 4,4 g/dL, isso é
decisão nossa e deve aparecer na tela.

### Força da evidência

**Média-alta para a correção pela albumina.** Dois estudos observacionais
independentes, um em UTI com r² = 0,94 e outro com mais de cinco mil
pacientes, chegando a coeficientes praticamente iguais (2,5 e 2,3), e uma
revisão do NEJM que manda corrigir sempre. Não há ensaio randomizado, e nem
faria sentido haver.

**Média para o ânion gap como ferramenta.** A própria revisão do NEJM 2014 é
franca sobre o limite: cerca de metade dos pacientes com lactato entre 3,0 e
5,0 mmol/L tem ânion gap dentro da faixa de referência, e o gap tem
sensibilidade e especificidade abaixo de 80% para identificar lactato
elevado. Conclusão literal do artigo:

> cannot replace a measurement of the serum lactate level. Nevertheless,
> lactate levels are not routinely measured or always rapidly available, and
> a high anion gap can alert the physician that further evaluation is
> necessary.

**Baixa para qualquer faixa de referência fixa.** Ver divergências.

### Divergências

**1. A faixa normal não é uma faixa; é uma propriedade do analisador.**
Esta é a divergência mais consequente para a interface.

| Fonte | Faixa citada |
|---|---|
| Convenção tradicional (Brandis, Higgins) | 8 a 16 mmol/L |
| Winter e cols. 1990, Beckman ASTRA | 3 a 11 mmol/L |
| Berend e cols. 2014 (faixa das faixas relatadas) | de 3,0-12,0 até 8,5-15,0 |
| Higgins 2009, métodos por eletrodo íon-seletivo | 3 a 10 mmol/L |

Higgins cita ainda um estudo (Paulson) em que **oito analisadores**
produziram médias de ânion gap entre **5,9 e 12 mmol/L**. Isto é: um mesmo
sangue teria "gap normal" num aparelho e "gap alto" noutro. **Não consegui
confirmar bibliograficamente os estudos de Roberts e Paulson citados por
Higgins.**

O aplicativo não conhece o analisador do hospital. Fixar "12" no código e
pintar 14 de vermelho é uma afirmação que a literatura não autoriza.

**2. 2,5 (Figge) × 2,3 (Feldman) × "2,3 a 2,5" (NEJM).** Já tratado acima.
A divergência é pequena e o NEJM aceita ambos.

**3. Com ou sem potássio.** Não é bem divergência de valor, é divergência de
escola: a versão com potássio é descrita como mais usada por nefrologistas,
onde o potássio varia mais. A revisão do NEJM usa a versão sem potássio. Sem
resposta do mentor, recomendo seguir o NEJM.

**4. Uma ressalva honesta da própria revisão.** O NEJM adverte que o gap
corrigido pela albumina é "apenas uma aproximação", porque não contabiliza
magnésio, cálcio e fosfato. E acrescenta um problema que nenhuma correção
resolve: *"a baseline value of the anion gap is generally not available for
an individual patient"* — o gap "normal" varia entre pessoas e quase nunca
se conhece o basal do paciente à frente.

---

## Pergunta 4 — DPOC: alvos gasométricos e o que é o basal deste paciente

### A pergunta

Qual faixa de SpO₂ na DPOC, e existe um número que separe o retentor crônico
no basal dele de uma exacerbação aguda?

### 4a. Alvo de SpO₂

#### O que eu proponho

**SpO₂ alvo de 88 a 92%** em paciente com DPOC conhecida ou com outro fator
de risco para insuficiência respiratória hipercápnica (obesidade mórbida,
fibrose cística, deformidade de parede torácica, doença neuromuscular,
obstrução fixa ligada a bronquiectasia), enquanto não há gasometria.

E, junto: **saturação acima da faixa não é "melhor"**. Este é o ponto que a
tela precisa comunicar, porque contraria a intuição de quem está com o
oxímetro na mão.

#### A fonte

**Diretriz, com grau declarado (PDF lido na íntegra):** O'Driscoll BR,
Howard LS, Earis J, Mak V. *British Thoracic Society Guideline for oxygen use
in adults in healthcare and emergency settings*. BMJ Open Respir Res.
2017;4(1):e000170. DOI 10.1136/bmjresp-2016-000170.

Recomendação G1 (idêntica a A3), lida literalmente no PDF:

> For most patients with known COPD or other known risk factors for
> hypercapnic respiratory failure (eg, morbid obesity, cystic fibrosis, chest
> wall deformities or neuromuscular disorders or fixed airflow obstruction
> associated with bronchiectasis), a target saturation range of 88–92% is
> suggested pending the availability of blood gas results (**grade A for
> COPD, grade D for other conditions**).

O grau é o que o mentor vai querer ver: **grau A para DPOC**. A diretriz usa
o sistema **SIGN**, no qual grau A exige, nas palavras do próprio documento,
*"At least one meta-analysis, systematic review or RCT rated as 1++, and
directly applicable to the target population"*. Grau D corresponde a nível de
evidência 3 ou 4, isto é, opinião ou estudo não analítico.

Para comparação, a mesma diretriz recomenda **94-98%** para o doente agudo
**sem** risco de hipercapnia (recomendação A2, **grau D**). Ou seja: a faixa
restritiva da DPOC tem evidência **mais forte** que a faixa geral.

**A evidência randomizada que sustenta o grau A (texto do PMC lido):**
Austin MA, Wills KE, Blizzard L, Walters EH, Wood-Baker R. *Effect of high
flow oxygen on mortality in chronic obstructive pulmonary disease patients in
prehospital setting: randomised controlled trial*. BMJ. 2010;341:c5462.
DOI 10.1136/bmj.c5462. PMID 20959284. PMCID PMC2957540.

405 pacientes com exacerbação presumida de DPOC atendidos por paramédicos e
admitidos no Royal Hobart Hospital; 214 com DPOC confirmada por prova de
função pulmonar. Braço ativo: *"titrated oxygen treatment delivered by nasal
prongs to achieve arterial oxygen saturations between 88% and 92%"*.

Resultados, na análise por intenção de tratar:

- **Todos os pacientes:** 9% de mortalidade (21 óbitos) com oxigênio de alto
  fluxo contra 4% (7 óbitos) com oxigênio titulado. **Risco relativo 0,42
  (IC 95% 0,20 a 0,89; p = 0,02).**
- **Subgrupo com DPOC confirmada:** 9% (11 óbitos) contra 2% (2 óbitos).
  **Risco relativo 0,22 (IC 95% 0,05 a 0,91; p = 0,04).**
- Na análise por protocolo, os pacientes que receberam oxigênio titulado
  tiveram menos acidose respiratória (pH médio 7,41 ± 0,09, n = 10, contra
  7,29 ± 0,15, n = 18; diferença média 0,12; p = 0,01) e menos hipercapnia
  (PaCO₂ 42,9 ± 14,2 mmHg, n = 10, contra 76,5 ± 50,2 mmHg, n = 19;
  diferença média −33,6 mmHg; p = 0,02).

Conclusão dos autores, literal: *"Titrated oxygen treatment significantly
reduced mortality, hypercapnia, and respiratory acidosis compared with high
flow oxygen in acute exacerbations of chronic obstructive pulmonary
disease."*

**É este o ensaio que o mentor vai querer.** Ele responde exatamente à
pergunta "titular oxigênio em vez de dar liberalmente muda mortalidade?" —
e a resposta é sim, com redução de risco relativo de 58% em toda a coorte e
78% no subgrupo com DPOC confirmada.

**Evidência observacional de apoio (abstract lido):** Echevarria C, Steer J,
Wason J, Bourke S. *Oxygen therapy and inpatient mortality in COPD
exacerbation*. Emerg Med J. 2021;38(3):170-177.
DOI 10.1136/emermed-2019-209257. PMID 33243839.

Estudo prospectivo com 1.027 pacientes com DPOC em oxigênio suplementar, em
seis hospitais do Reino Unido. Tomando 88-92% como referência: SpO₂ de 93-96%
teve OR ajustada de **1,98 (p = 0,025)**; SpO₂ de 97-100%, OR ajustada de
**2,97 (p = 0,001)**. Conclusão citada: *"inpatient mortality was lowest in
those with oxygen saturations of 88%-92%"*, e, ponto relevante para o
desenho da tela, que *"the practice of setting different target saturations
based on carbon dioxide levels is not justified"* — isto é, o alvo é o mesmo
independentemente de o CO₂ estar ou não elevado.

**Diretriz internacional que converge (texto do PMC lido):** Agustí A,
Celli BR, Criner GJ, et al. *Global Initiative for Chronic Obstructive Lung
Disease 2023 Report: GOLD Executive Summary*. Eur Respir J. 2023;61(4):2300239.
DOI 10.1183/13993003.00239-2023. PMID 36858443. PMCID PMC10066569.

Do texto: *"Supplemental oxygen for hypoxemia should be titrated to a target
saturation of 88–92%"*; *"Venturi masks offer more accurate and controlled
delivery of inspired oxygen than do nasal prongs"*; *"In severe ECOPD, blood
gases should be checked frequently or as clinically indicated to monitor for
carbon dioxide retention and/or worsening acidosis"*; e uma observação de
segurança que vale para qualquer aplicativo que leia oximetria — a oximetria
de pulso *"may overestimate blood oxygen content among individuals with
darker skin tones"*.

**Não confirmado, explicitamente:**

- **O GOLD não declara grau de recomendação** para o alvo de 88-92% no
  sumário executivo lido. A força vem da BTS e de Austin, não do GOLD.
- Não confirmei se existe versão da diretriz BTS posterior a 2017. A página
  institucional da BTS não abriu em formato legível. **A diretriz citada é a
  de 2017; se houver atualização, este dossiê não a viu.**

#### O que a fonte realmente diz × o que é inferência nossa

**A fonte diz, para este uso exato:** a BTS recomenda a faixa exatamente para
o cenário de "paciente com DPOC, antes do resultado da gasometria" — que é o
cenário do fisioterapeuta à beira do leito. Não há inferência aqui.

**Inferência nossa, e é preciso ter cuidado:** o ensaio de Austin é
**pré-hospitalar**, com paramédicos, em exacerbação aguda. O paciente do
Ventila Fisio está na **UTI**, muitas vezes já intubado. A faixa de 88-92% é
recomendada pela BTS e pelo GOLD para o paciente com DPOC de modo geral, mas
**a evidência randomizada de mortalidade é do cenário pré-hospitalar**.
Estender a mortalidade do ensaio ao paciente sob ventilação invasiva é
extrapolação; recomendar a faixa não é, porque a diretriz já o faz.

#### Força da evidência

**A mais forte deste dossiê.** Um ensaio clínico randomizado com desfecho
duro (mortalidade), significativo tanto na coorte inteira quanto no subgrupo
pré-especificado; uma coorte prospectiva de mil pacientes com relação
dose-resposta na direção esperada; e duas diretrizes internacionais
convergentes, uma delas com grau A explícito. Se algum número deste dossiê
merece entrar no aplicativo como `Publicacao` sem hesitação, é este.

#### Divergências

Não encontrei divergência relevante entre BTS, GOLD e ERS/ATS quanto ao
88-92%. A única nuance é a de Echevarria e cols.: alguns serviços ajustam o
alvo conforme o CO₂, e esse estudo argumenta que a prática não se justifica —
o alvo deve ser o mesmo.

### 4b. Existe um número que defina "hipercapnia crônica no basal"?

#### O que eu proponho

**A resposta honesta é: não existe um limiar de PaCO₂ que, sozinho, defina o
retentor crônico no basal dele. A distinção é feita pelas regras de
compensação da Pergunta 1 mais a história do paciente.** Foi exatamente isso
que a pesquisa encontrou, e vale registrar como achado, não como fracasso.

Dito isso, **existe um critério publicado, e ele é sobre pH e bicarbonato,
não sobre PaCO₂**. A BTS o formula assim, num "good practice point" lido
literalmente no PDF:

> If the PCO2 is raised but pH is ≥7.35 ([H+] ≤45 nmol/L) and/or a high
> bicarbonate level (>28 mmol/L), the patient has probably got long-standing
> hypercapnia; maintain target range of 88–92% for these patients. Blood
> gases should be repeated at 30–60 min to check for rising PCO2 or falling
> pH.

E o contraponto, na mesma diretriz:

> If the patient is hypercapnic (PCO2 >6 kPa or 45 mm Hg) and acidotic
> (pH <7.35 or [H+] >45 nmol/L), start NIV with targeted oxygen therapy if
> respiratory acidosis persists for more than 30 min after initial standard
> medical management.

Portanto a proposta concreta para o aplicativo:

- **PaCO₂ > 45 mmHg com pH ≥ 7,35 e/ou HCO₃⁻ > 28 mmol/L** → texto:
  "compatível com hipercapnia de longa data (retentor crônico compensado)".
- **PaCO₂ > 45 mmHg com pH < 7,35** → texto: "acidose respiratória aguda ou
  agudizada sobre crônica".
- **Sempre**: "a distinção depende da história do paciente e de gasometrias
  anteriores; a gasometria isolada só sugere".

O aplicativo **não deve** afirmar "este é o basal do paciente". Ele não tem
como saber. O que ele pode dizer é o que é compatível com o quê.

#### A fonte

BTS (O'Driscoll e cols. 2017), citação completa acima. **Atenção ao status
do item:** o critério de pH ≥ 7,35 e/ou HCO₃⁻ > 28 aparece como **"good
practice point"** (marcado com ✓ no documento), **não** como recomendação
graduada. Na hierarquia da própria diretriz, isso é consenso de painel, o
degrau mais baixo. **Não é grau A nem grau D — está fora da escala de
graus.** É honesto e importante que o mentor saiba disso.

**Diretriz com GRADE, para o limiar de acidose (PDF lido na íntegra):**
Rochwerg B, Brochard L, Elliott MW, Hess D, Hill NS, Nava S, Navalesi P, et
al. *Official ERS/ATS clinical practice guidelines: noninvasive ventilation
for acute respiratory failure*. Eur Respir J. 2017;50(2):1602426.
DOI 10.1183/13993003.02426-2016.

Recomendação lida literalmente:

> We recommend bilevel NIV for patients with ARF leading to acute or
> acute-on-chronic respiratory acidosis (pH ⩽7.35) due to COPD exacerbation.
> (**Strong recommendation, high certainty of evidence.**)

E a recomendação simétrica, que é a que fecha esta pergunta:

> We suggest NIV not be used in patients with hypercapnia who are not
> acidotic in the setting of a COPD exacerbation. (**Conditional
> recommendation, low certainty of evidence.**)

Ou seja: a própria diretriz internacional trata "hipercápnico **sem**
acidose" como categoria clínica distinta de "hipercápnico **com** acidose", e
faz a separação por **pH**, não por PaCO₂. Isso corrobora a proposta acima
por um caminho independente da BTS.

Consideração de implementação da mesma diretriz:

> Bilevel NIV should be considered when the pH is ⩽7.35, PaCO2 is >45 mmHg
> and the respiratory rate is >20–24 breaths·min−1 despite standard medical
> therapy.

E uma ressalva que o aplicativo não deve omitir se exibir o pH de 7,35:

> There is no lower limit of pH below which a trial of NIV is inappropriate;
> however, the lower the pH, the greater risk of failure.

**Não confirmado, explicitamente:**

- **Não encontrei, em nenhuma fonte, um valor de PaCO₂ que defina "basal do
  retentor crônico".** Busquei; o que existe são os critérios de pH e
  bicarbonato acima. Registro isso como conclusão da pesquisa, não como
  lacuna por falta de tentativa.
- O número do artigo da diretriz ERS/ATS (1602426) e o volume 50(2) vieram
  de resultado de busca. **O DOI 10.1183/13993003.02426-2016 foi confirmado
  no rodapé do PDF lido.** Autores, título e todas as citações acima foram
  lidos no PDF.
- Não consegui abrir a diretriz BTS/ICS de 2016 sobre manejo ventilatório da
  insuficiência respiratória hipercápnica aguda (*Thorax* 2016;71 Suppl 2),
  citada pela BTS de 2017. Os dados bibliográficos vieram de busca e **não
  estão confirmados**; por isso ela não é citada como fonte aqui.

#### O que a fonte realmente diz × o que é inferência nossa

**A fonte diz, para este uso exato:** a BTS escreve o critério para o
profissional decidir a faixa de oxigênio de um paciente concreto. É o uso
previsto.

**Inferência nossa:** transformar o "and/or" da BTS (pH ≥ 7,35 **e/ou**
HCO₃⁻ > 28) numa regra de código exige decidir se é conjunção ou disjunção.
A diretriz deliberadamente não decide. **Esta é uma pergunta para o mentor.**

**Inferência nossa, e importante:** o valor de corte do bicarbonato,
28 mmol/L, é da BTS. Ele **não** coincide exatamente com o que as regras de
compensação da Pergunta 1 produziriam. Com PaCO₂ de 50 mmHg (10 acima de 40),
a regra crônica de 4-5 prevê HCO₃⁻ de 28 a 29 — coincide. Mas com PaCO₂ de 46
mmHg, a regra crônica prevê ~26,4, abaixo do corte de 28, enquanto o paciente
já seria classificado como hipercápnico. **Os dois critérios não são o mesmo
critério**, e o aplicativo precisa escolher qual manda, ou exibir os dois.

#### Força da evidência

**Média, e desigual entre as partes.** O limiar de pH ≤ 7,35 para VNI tem
**recomendação forte com alta certeza de evidência** no GRADE do ERS/ATS —
é sólido. O critério "pH ≥ 7,35 e/ou HCO₃⁻ > 28 sugere hipercapnia de longa
data" é **consenso de painel** (good practice point), o degrau mais baixo da
BTS. Não trate os dois como equivalentes na tela.

#### Divergências

Não encontrei divergência entre BTS e ERS/ATS sobre o limiar de pH 7,35. A
divergência real é outra e já foi registrada na Pergunta 1: **Martinu e cols.
mediram, em DPOC estável, uma compensação melhor do que a convenção prevê
(HCO₃⁻ +5,1 por 10 mmHg, pH −0,014 por 10 mmHg), e a revisão do NEJM 2014
registra que o pH na acidose respiratória crônica pode ser normal ou até
acima de 7,40.** Isso torna o critério da BTS conservador na direção certa —
mas significa que um retentor crônico bem compensado pode aparecer no
aplicativo com pH normal e ser lido como "sem distúrbio" se o bicarbonato não
for olhado. **Este é o defeito específico que o painel de gasometria precisa
não ter.** Ele é o mesmo padrão de erro que a armadilha 5 do `CLAUDE.md` já
descreve para outros indicadores: um estado anormal que a lógica ingênua
classifica como normal.

### 4c. Alvos ventilatórios em DPOC para o fisioterapeuta

#### O que eu proponho

**Muito pouco, e de propósito.** Encontrei fonte forte para três afirmações e
só essas devem entrar:

1. **VNI é indicada quando pH ≤ 7,35 e PaCO₂ > 45 mmHg com frequência
   respiratória > 20-24 irpm apesar do tratamento clínico padrão.** Fonte:
   ERS/ATS 2017, recomendação forte, alta certeza de evidência (citação
   verbatim acima).
2. **VNI não é indicada no paciente hipercápnico sem acidose.** Fonte:
   ERS/ATS 2017, recomendação condicional, baixa certeza.
3. **Nebulização, quando usada, deve ser preferencialmente movida a ar e não
   a oxigênio**, para não elevar a PaCO₂. Fonte: GOLD 2023 — *"If a nebulizer
   is chosen, air-driven is preferable to oxygen-driven nebulization to avoid
   the potential risk of increasing arterial partial pressure of carbon
   dioxide"*.

**O que NÃO encontrei com fonte suficiente, e por isso não proponho:** alvos
numéricos de volume corrente, PEEP, tempo expiratório, relação I:E ou
auto-PEEP específicos para DPOC sob ventilação invasiva. Esses valores
circulam em material de ensino, mas não os localizei numa diretriz ou estudo
primário que eu tenha efetivamente lido nesta rodada. **Colocá-los na tela
sem fonte violaria a regra do projeto.** Se o mentor quiser esse bloco, ele
precisa de uma rodada de pesquisa própria — provavelmente com as Orientações
Práticas em Ventilação Mecânica da AMIB/SBPT, que o aplicativo já cataloga.

---

## Perguntas que restam para o mentor

Estas precisam do juízo dele, não de mais citação.

1. **Regra do pH: entra ou não entra?** Ela é convenção sem origem
   rastreável (o coeficiente 0,08 não tem fonte primária que eu tenha
   achado, e o *Deranged Physiology* declara por escrito que também não a
   achou). Se entrar, entra como `Parecer`. O bicarbonato decide. Confirma?

2. **Acidose respiratória crônica: 3,5, 4, 4-5 ou 5,1?** Adotei 4-5, que é a
   revisão do NEJM 2014. Mas 5,1 é o valor **medido** em DPOC estável
   (Martinu 2003), e a população do aplicativo é justamente essa. Qual o
   mentor quer na tela?

3. **Alcalose metabólica: número ou frase?** A fórmula 0,7 existe, mas seu
   estudo primário é em **cães** e a revisão do NEJM avisa, em nota de
   rodapé, que a previsão é difícil neste distúrbio. O mentor prefere (a) o
   número com a ressalva ao lado, ou (b) apenas a frase qualitativa, sem
   número?

4. **Ânion gap: com ou sem potássio?** Sem resposta, sigo o NEJM (sem
   potássio). **Se for com potássio, preciso da faixa normal do mentor** — as
   fontes secundárias divergem (10-20, 12-20, 16 ± 4) e não consegui
   confirmar nenhuma em fonte primária.

5. **Ânion gap: qual faixa normal exibir, sabendo que ela depende do
   analisador?** Opções: (a) exibir 8-16 com aviso sobre o laboratório;
   (b) não exibir faixa e apenas mostrar o valor com o valor corrigido;
   (c) deixar a faixa configurável por unidade. Minha preferência é (b) ou
   (c), porque (a) afirma mais do que a literatura autoriza.

6. **Correção pela albumina: 2,5 ou 2,3?** Escolhi 2,5 porque o estudo que o
   sustenta (Figge 1998) é em pacientes de UTI. 2,3 tem população maior mas
   não específica. A diferença prática é inferior a 0,5 mmol/L.

7. **Qual valor de "albumina normal" o aplicativo usa como referência da
   correção?** Precisa ser um número fixo na tela, e ele varia por
   laboratório.

8. **O "e/ou" da BTS.** "pH ≥ 7,35 **e/ou** HCO₃⁻ > 28 mmol/L sugere
   hipercapnia de longa data": em código isso precisa virar E ou OU. A
   diretriz não decide. O mentor decide.

9. **Quando os dois critérios de cronicidade discordarem** — o da BTS
   (HCO₃⁻ > 28) e o da regra de compensação da Pergunta 1 — qual prevalece na
   tela? Ou o aplicativo mostra ambos e não conclui?

10. **Alvos ventilatórios em DPOC sob ventilação invasiva** (volume corrente,
    PEEP, tempo expiratório, auto-PEEP): quer esse bloco? Se sim, ele precisa
    de uma rodada de pesquisa própria, provavelmente sobre a diretriz
    AMIB/SBPT que o aplicativo já cataloga. Nada disso entra nesta fase.

11. **DPOC com alcalose metabólica associada** (diurético, drenagem
    gástrica): o aplicativo deve alertar sobre a piora do drive e da
    hipercapnia? É escopo novo e sem fonte confirmada neste dossiê.

---

## Anexo — Estado de verificação de cada fonte

Lido = texto ou abstract efetivamente acessado nesta pesquisa.
Metadados = autores, título, periódico, ano, volume, número, páginas, DOI e
PMID confirmados em base bibliográfica, **sem** leitura do conteúdo.

| Fonte | Estado |
|---|---|
| Berend, de Vries, Gans. NEJM 2014;371(15):1434-1445 | **Lido** (PDF completo, Tabela 1 e texto) |
| O'Driscoll e cols. BMJ Open Respir Res 2017;4(1):e000170 | **Lido** (PDF completo) |
| Austin e cols. BMJ 2010;341:c5462 | **Lido** (texto no PMC, incluindo Tabela 4) |
| Rochwerg e cols. Eur Respir J 2017;50(2):1602426 | **Lido** (PDF completo) |
| Agustí e cols. Eur Respir J 2023;61(4):2300239 | **Lido** (texto no PMC) |
| Madias, Adrogué. Nephron Physiol 2003;93(3):p61-p66 | **Lido** (PDF completo) |
| Martinu, Menzies, Dial. Can Respir J 2003;10(6):311-315 | **Lido** (abstract) |
| Madias, Bossert, Adrogué. J Appl Physiol 1984;56(6):1640-1646 | **Lido** (abstract) |
| Figge e cols. Crit Care Med 1998;26(11):1807-1810 | **Lido** (abstract) |
| Winter e cols. Arch Intern Med 1990;150(2):311-313 | **Lido** (abstract). DOI não confirmado |
| Echevarria e cols. Emerg Med J 2021;38(3):170-177 | **Lido** (abstract) |
| Krapf e cols. NEJM 1991;324(20):1394-1401 | **Lido** (abstract) |
| Gennari, Goldstein, Schwartz. J Clin Invest 1972;51(7):1722-1730 | **Lido** (abstract). Sem coeficiente no abstract |
| Kraut, Madias. Clin J Am Soc Nephrol 2007;2(1):162-174 | **Lido** (só abstract). Texto completo bloqueado (HTTP 402) |
| Brackett, Cohen, Schwartz. NEJM 1965;272:6-12 | **Metadados apenas.** Número do fascículo não confirmado no Europe PMC |
| van Ypersele de Strihou e cols. NEJM 1966;275(3):117-122 | **Metadados apenas** |
| Arbus e cols. NEJM 1969;280(3):117-123 | **Metadados apenas.** Grafia do 2º autor em dúvida (Hebert × Herbert) |
| Javaheri, Kazemi. Am Rev Respir Dis 1987;136(4):1011-1016 | **Metadados apenas.** Conteúdo desconhecido; citado só como pista |
| Feldman, Soni, Dickson. J Lab Clin Med 2005;146(6):317-320 | **Não lido.** Dados de busca e repositório institucional. PMID não confirmado |
| Higgins C. *Clinical aspects of the anion gap*. acutecaretesting.org, jul/2009 | **Lido.** Fonte secundária |
| Brandis K. *Acid-base pHysiology*, caps. 3.2 e 4.5 | **Lido.** Fonte secundária (livro on-line) |
| Yartsev A. *Deranged Physiology*, cap. 204 | **Lido.** Fonte secundária |
| Patel S, Sharma S. *Respiratory Acidosis*. StatPearls, 12/06/2023 | **Lido.** Fonte secundária |
| Pandey DG, Sharma S. *Biochemistry, Anion Gap*. StatPearls, 10/07/2023 | **Lido.** Fonte secundária, com faixa internamente inconsistente |
| BTS/ICS. *Ventilatory management of acute hypercapnic respiratory failure*. Thorax 2016 | **Não acessada.** Citada pela BTS 2017; dados bibliográficos não confirmados |

---

## Decisões do mentor clínico, 01/09/2026

Respostas às perguntas deste dossiê. Cada uma vira `Parecer` ou confirma uma
`Publicacao`, conforme anotado.

### 1. Acidose respiratória crônica: **5,0 mmol/L** por 10 mmHg de PaCO₂

Escolha dele, entre as duas opções apresentadas. **Nenhuma das duas fontes diz
5,0**: a revisão do NEJM 2014 dá a faixa de 4 a 5, e Martinu 2003 mediu 5,1 em
DPOC estável. O valor está dentro da faixa do NEJM e a um décimo do medido por
Martinu, mas é juízo clínico, não número publicado.

Entra como `Parecer` (`parecer_compensacao_cronica`), citado ao lado das duas
publicações. Não atribuir 5,0 ao NEJM nem ao Martinu.

### 2. Alcalose metabólica: **frase, não número**

Ele escolheu a opção (b) depois de saber que o estudo primário da fórmula 0,7
é em cães (Madias 1984) e que o NEJM registra em nota de rodapé que a previsão
neste distúrbio é difícil.

Consequência de projeto: `gasometria.ts` **não** calcula PaCO₂ esperada na
alcalose metabólica. Não existe função para isso, e não é omissão a corrigir.
A tela diz que se espera hipoventilação e que a previsão quantitativa aqui é
pouco confiável.

Isto é uma decisão de NÃO exibir número, e é a mais fácil de alguém desfazer
por engano numa fase futura, achando que faltou implementar. Precisa de teste
que falhe se um número aparecer ali.

### 3. Ânion gap: **sem potássio**

`AG = Na⁺ − (Cl⁻ + HCO₃⁻)`. Ele fechou questão, citando material do ACCP.

**Não cataloguei o ACCP**: não verifiquei essa fonte. A fórmula já é sustentada
pela revisão do NEJM 2014, que foi lida e confirmada, e é essa que a tela cita.
A menção ao ACCP fica registrada aqui como origem da confirmação dele, não como
citação do aplicativo.

Ele não deu faixa normal. Mantida a decisão do dossiê: o aplicativo **não
afirma faixa**, mostra o valor e o valor corrigido pela albumina, e avisa que a
faixa depende do analisador do laboratório.

### 4. Critério de cronicidade da BTS: **em aberto**

Ainda sem resposta. Enquanto não vier, `gasometria.ts` não conclui cronicidade
por esse critério.
