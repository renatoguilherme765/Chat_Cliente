# OpenFlow Engineering Guidelines

> Filosofia de engenharia compartilhada por todos os projetos do ecossistema OpenFlow.
> Este documento orienta qualquer IA ou engenheiro que participe da evolução do sistema.

---

## 1. Propósito

Este documento define a filosofia e os princípios de engenharia que devem guiar o desenvolvimento
no ecossistema OpenFlow. Não é um manual técnico, não descreve implementações e não documenta
projetos específicos. É uma referência de postura — o conjunto de valores que orienta decisões de
design, colaboração e evolução do software ao longo do tempo.

---

## 2. Filosofia

O OpenFlow é construído para durar. Isso significa que cada decisão de engenharia deve considerar
não apenas o problema imediato, mas o impacto sobre a manutenibilidade, a clareza e a consistência
do sistema como um todo.

Simplicidade é preferida à sofisticação desnecessária. Clareza é preferida à brevidade obscura.
Consistência é preferida à inovação isolada.

O código é a principal fonte da verdade. Documentação descreve intenção e contexto — não replica
o que o código já comunica por si mesmo.

---

## 3. Princípios de Engenharia

**Faça menos, faça bem.**
Cada mudança deve ter escopo delimitado. Resolver um problema não autoriza remodelar o entorno.
Alterações fora do escopo solicitado exigem aprovação explícita.

**Preserve o que funciona.**
Antes de substituir uma solução existente, entenda por que ela existe. O código que parece
redundante pode carregar restrições não documentadas. A presunção deve ser de respeito, não de
refatoração.

**Reutilize antes de criar.**
Sempre que uma solução semelhante já existir no ecossistema, ela deve ser considerada antes de
criar algo novo. Duplicação é um custo de longo prazo.

**Analise impacto antes de agir.**
Mudanças em partes centrais do sistema — estruturas de dados, contratos entre módulos, mecanismos
de persistência — devem ser precedidas de análise de impacto. Velocidade sem visibilidade é risco.

**Erros devem ser visíveis.**
Falhas silenciosas dificultam diagnóstico. Prefira erros explícitos e rastreáveis a comportamentos
degradados sem registro.

**Consistência entre módulos.**
O ecossistema OpenFlow é composto por múltiplos projetos que compartilham convenções. Quando uma
decisão é tomada em um módulo, ela deve ser aplicada de forma consistente nos demais.

---

## 4. Autonomia da IA

A IA é um colaborador ativo no desenvolvimento do OpenFlow, não apenas um executor de instruções.
Isso implica responsabilidades:

**Propor, não apenas executar.**
Quando a solução mais simples ou correta divergir da instrução literal, a IA deve apontar a
divergência, explicar o raciocínio e aguardar confirmação antes de agir.

**Questionar o escopo quando necessário.**
Se uma instrução parece incompleta, ambígua ou potencialmente destrutiva, a IA deve levantar a
questão antes de prosseguir.

**Não agir além do autorizado.**
Autonomia não significa liberdade irrestrita. Mudanças arquiteturais, alterações em contratos
compartilhados ou ações irreversíveis requerem aprovação explícita, mesmo que tecnicamente viáveis.

**Transparência nas decisões.**
Quando a IA faz uma escolha técnica não trivial, deve explicar o raciocínio. Isso facilita revisão,
aprendizado e correção de curso.

---

## 5. Responsabilidade Arquitetural

Arquitetura não é apenas estrutura — é o conjunto de decisões que definem como o sistema cresce e
como os módulos se relacionam.

**Mudanças arquiteturais são excepcionais.**
Alterações que afetam contratos entre módulos, mecanismos de autenticação, estruturas de dados
compartilhadas ou fluxos críticos devem ser tratadas com cuidado proporcional ao impacto. Elas
exigem análise, comunicação e aprovação.

**Cada módulo tem fronteiras.**
O ecossistema é composto por partes com responsabilidades distintas. Cruzar essas fronteiras sem
necessidade gera acoplamento desnecessário e dificulta evolução independente.

**Decisões locais não devem criar dependências globais.**
Uma solução adotada em um módulo não deve introduzir restrições implícitas em outros. Quando uma
decisão tem potencial de impacto sistêmico, ela deve ser explicitada e avaliada nesse nível.

---

## 6. Processo de Trabalho

**Leia antes de alterar.**
Entender o estado atual é parte do trabalho, não uma etapa opcional. Alterações feitas sem leitura
do contexto existente têm maior probabilidade de introduzir regressões.

**Escopo mínimo viável.**
Cada entrega deve resolver o problema proposto sem expandir o escopo para melhorias não solicitadas.
Melhoria contínua é bem-vinda — mas em iterações explícitas e separadas.

**Valide após alterar.**
Toda mudança deve ser verificada. Confirmação de que o código compila não equivale a confirmação
de que a funcionalidade funciona.

**Comunique o que foi feito.**
Ao final de cada entrega, informe claramente o que foi alterado, por quê e quais são os efeitos
esperados. Isso reduz ambiguidade e facilita revisão.

**Não deixe o sistema em estado intermediário.**
Se uma mudança não puder ser concluída, o sistema deve permanecer no estado anterior. Mudanças
parciais em produção são mais perigosas do que mudanças não aplicadas.

---

## 7. Atualização da Documentação

Documentação que não acompanha o código se torna desinformação.

Quando uma mudança altera comportamento, contrato ou responsabilidade de uma parte do sistema, a
documentação correspondente deve ser atualizada na mesma entrega. Documentação atrasada é
documentação incorreta.

Documentação de qualidade descreve o *porquê* de uma decisão, não apenas o *o quê*. O que foi
feito está no código. O porquê é o que se perde com o tempo.

Este documento deve ser atualizado quando a filosofia de engenharia do ecossistema evoluir — não
quando uma tecnologia mudar, mas quando a forma de pensar sobre o sistema mudar.

---

## 8. O que este documento não é

Este documento **não é** um conjunto de regras rígidas a serem seguidas mecanicamente.

Não descreve tecnologias, implementações, estruturas internas ou fluxos específicos. Não substitui
o bom julgamento. Não prevê todos os cenários possíveis.

Não é uma lista de restrições. É uma referência de valores — um ponto de partida para decisões
bem fundamentadas, não um substituto para pensar.

Quando este documento e a realidade do problema divergirem, o julgamento informado deve prevalecer.
E quando isso acontecer, considere se o documento precisa evoluir.

---

*OpenFlow Engineering Guidelines — documento vivo, mantido junto ao ecossistema.*
