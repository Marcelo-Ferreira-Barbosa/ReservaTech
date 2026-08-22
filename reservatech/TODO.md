# TODO — Tarefas em aberto

Lista de melhorias e funcionalidades deixadas propositalmente de fora
desta primeira versão, para a equipe continuar o desenvolvimento.
Classificadas por dificuldade estimada.

## Fácil

- [ ] Adicionar filtro de recursos por tipo e por status na tela de
      Recursos (`frontend/src/pages/Resources.tsx`).
- [ ] Adicionar campo de busca por nome na lista de recursos e reservas.
- [ ] Melhorar mensagens de erro do formulário de nova reserva (ex:
      avisar antes de enviar se a data escolhida já passou).
- [ ] Mostrar um "loading spinner" mais visual em vez do texto simples
      "Carregando..." usado nas páginas atualmente.
- [ ] Adicionar um favicon e um título mais descritivo por página.

## Médio

- [ ] Paginação nas listagens de reservas e no histórico administrativo
      (`ReservationRequests.tsx`), que hoje carregam tudo de uma vez.
- [ ] Auto-rejeitar (ou pelo menos sinalizar) reservas pendentes que
      ficaram conflitantes depois que uma outra foi aprovada para o
      mesmo horário (ver decisão registrada em `docs/DECISOES_TECNICAS.md`,
      item 3).
- [ ] Reverter automaticamente o status de um recurso de `manutencao`
      para `ativo` quando a data/hora do bloqueio já passou, em vez de
      depender de remoção manual (ver `docs/DECISOES_TECNICAS.md`, item 6).
- [ ] Página de histórico mais completa para o usuário comum (reservas
      canceladas e recusadas também, com filtro por período).
- [ ] Validações de formulário mais completas no frontend (ex: impedir
      seleção de datas passadas no campo de data).
- [ ] Melhorias de UI: estados vazios mais ilustrativos, confirmações
      de ação mais consistentes (hoje algumas usam `window.confirm`,
      que é bem simples).

## Difícil

- [ ] Testes automatizados (backend: Jest ou Vitest testando os
      controllers e a lógica de conflito de horário; frontend: testes de
      componente com Testing Library).
- [ ] Melhorias de segurança: rate limiting no login, refresh token em
      vez de JWT de longa duração, migrar o token do `localStorage` para
      cookie `httpOnly`, e avaliar a migração do frontend para React
      Router 7 (corrige avisos de `npm audit` sobre versões antigas do
      `react-router`, mas exige revisar a API de rotas antes de atualizar).
- [ ] Relatórios administrativos (ex: recursos mais reservados, taxa de
      aprovação/recusa, uso por período).
- [ ] Sistema de migrations para o banco (hoje toda alteração de schema
      precisa ser feita manualmente em `schema.sql`, incluindo `ALTER
      TABLE` para colunas novas em tabelas já existentes).
- [ ] Notificações (ex: avisar o usuário quando sua reserva for aprovada
      ou recusada) — lembrando que isso é uma "possível evolução futura"
      e não deve envolver envio real de e-mail/SMS nesta fase.

---

Para ideias fora desse escopo (mobile nativo, pagamentos, IoT, IA,
microsserviços etc.), veja a seção "Possível evolução futura" nas notas
originais do projeto — propositalmente não fazem parte deste roadmap
próximo.
