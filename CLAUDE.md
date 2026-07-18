# CLAUDE.md — Chat_Cliente

> Leia também: [OPENFLOW_GUIDELINES.md](OPENFLOW_GUIDELINES.md)
> O código é a fonte da verdade. Este documento descreve intenção e contexto — não implementação.

---

## Propósito

Chat_Cliente é a interface pública do ecossistema OpenFlow. É o ponto de contato entre o cliente
final e o sistema de negociação. Não exige autenticação. Qualquer pessoa com o link correto pode
iniciar uma conversa.

---

## Posição no Ecossistema

O OpenFlow é composto por quatro módulos independentes com repositórios e deploys separados:

- **Chat_Cliente** — interface pública do cliente (este projeto)
- **Especialista** — painel de atendimento dos especialistas
- **Gestor** — gestão de atendimentos e carteiras
- **Admin_Master** — administração central de empresas e configurações

Os módulos não se comunicam diretamente. A troca de informações ocorre exclusivamente via banco
de dados compartilhado e eventos em tempo real. Este módulo não conhece a existência dos outros —
apenas observa e reage a mudanças no banco.

---

## Responsabilidades

- Resolver a empresa e, quando informada, a carteira a partir da URL
- Identificar ou criar uma sessão de cliente e preservá-la entre visitas
- Conduzir o fluxo conversacional até a entrada em atendimento
- Enviar e receber mensagens em tempo real
- Sinalizar o status de entrega e leitura das mensagens ao cliente

**Este módulo não:**
- Autentica usuários
- Gerencia especialistas, carteiras ou empresas
- Contém lógica de negócio sobre descontos, contratos ou boletos
- Acessa APIs externas diretamente
- Possui lógica server-side

---

## Arquitetura

**Aplicação estática sem framework.**
Todo o comportamento é implementado em JavaScript vanilla carregado diretamente pelo HTML. Não há
camada de renderização, roteador client-side ou gerenciamento de estado externo.

**Roteamento por URL.**
A URL define o contexto da sessão: o primeiro segmento identifica a empresa; o segundo, quando
presente, identifica a carteira. Sessões de empresas ou carteiras diferentes são completamente
isoladas — armazenamento local e registros no banco separados.

**Sessão no navegador.**
A identidade do cliente é mantida exclusivamente no armazenamento local do navegador. Não há
cookie nem sessão server-side. A chave de armazenamento considera empresa e carteira para garantir
isolamento. Ao retornar, o cliente retoma o histórico e o estado da conversa de onde parou.

**Tempo real via banco.**
Mensagens novas e atualizações de status chegam por eventos do banco de dados — sem polling. O
módulo escuta dois tipos de evento: inserção de novas mensagens de especialistas e atualização de
status das mensagens enviadas pelo cliente.

**Deploy sem build.**
O Vercel serve os arquivos do repositório diretamente, sem executar etapa de compilação. Esta é
uma decisão arquitetural deliberada: arquivos estáticos que precisam ser acessíveis em produção
devem estar na raiz do repositório, não em subpastas de assets convencionais.

---

## Integrações

**Banco de dados e tempo real.**
Toda persistência e comunicação passam por um único provedor. O acesso usa a chave pública do
projeto — por design, sem privilégios elevados. O banco impõe as regras de acesso.

**Módulo Especialista.**
A integração é indireta: o Especialista lê e escreve nas mesmas tabelas. Mudanças de schema devem
considerar os dois módulos simultaneamente. Mudanças neste módulo não devem introduzir restrições
implícitas no Especialista.

---

## Convenções

**Schema é somente leitura para este módulo.**
Migrações são realizadas externamente. Este módulo adapta-se ao schema existente — não o define.

**Sem dependências de runtime.**
O projeto não usa frameworks de front-end. Adições de dependência requerem justificativa
arquitetural — não apenas conveniência.

**Isolamento de sessão é um contrato.**
A chave que identifica a sessão do cliente no armazenamento local combina empresa e carteira.
Alterar esse contrato invalida sessões existentes de todos os usuários ativos.

---

## Limites de Responsabilidade

Este módulo termina onde começa o atendimento. Após o cliente entrar em atendimento, a condução
da conversa passa ao Especialista. O Chat_Cliente mantém o canal aberto — recebe e envia mensagens
— mas não toma mais decisões de fluxo.

A lógica de negócio (regras de desconto, condições de renegociação, geração de documentos) não
pertence a este módulo. O Chat_Cliente leva o cliente até o especialista; o que acontece depois
é responsabilidade do ecossistema, não desta interface.

---

## Contexto para Futuras IAs

- O build do Vite **não roda em produção**. Arquivos estáticos precisam estar na raiz do repo.
- A chave do banco é pública por design — não tratar como segredo de servidor.
- Limpar o armazenamento local do navegador destrói a sessão permanentemente; o cliente perde
  o histórico e recomeça do zero.
- O realtime opera em dois canais distintos com comportamentos diferentes; alterações nessa
  camada têm impacto direto e imediato na experiência do usuário.
- O Especialista escreve nas mesmas tabelas que este módulo lê. Toda mudança de schema deve
  considerar os dois lados antes de ser aplicada.
- Este projeto não possui autenticação. Toda validação de acesso acontece nas políticas do banco.
