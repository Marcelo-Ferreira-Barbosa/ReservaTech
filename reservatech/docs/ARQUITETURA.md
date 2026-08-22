# Arquitetura do ReservaTech

Este documento explica, de forma simples, como as partes do sistema se
conectam. A ideia é que qualquer pessoa da equipe consiga entender o
caminho completo de uma requisição sem precisar ler todo o código antes.

## Visão geral

```
┌─────────────────┐        HTTP / JSON        ┌──────────────────┐        SQL         ┌───────────────┐
│   Frontend       │  ───────────────────────>  │   Backend         │  ───────────────>  │  SQLite        │
│  React + Vite    │  <───────────────────────  │  Express + TS     │  <───────────────  │  (1 arquivo)   │
│  localhost:5173  │                             │  localhost:3001   │                    │  reservatech.db│
└─────────────────┘                             └──────────────────┘                    └───────────────┘
```

- O **frontend** é tudo o que roda no navegador: as telas, formulários e
  a navegação entre páginas.
- O **backend** é a API: recebe requisições HTTP, aplica as regras de
  negócio (por exemplo, a validação de conflito de horário) e lê/grava
  no banco.
- O **banco** é um único arquivo SQLite. Não existe um servidor de banco
  separado para instalar — é só um arquivo no disco.

## Como o frontend funciona

- Escrito em React com TypeScript, usando Vite como bundler/dev server.
- As páginas ficam em `frontend/src/pages/`. Cada arquivo é uma tela
  (ex: `Login.tsx`, `Dashboard.tsx`).
- A navegação entre páginas é feita pelo `react-router-dom`, configurado
  em `frontend/src/App.tsx`.
- O estado de "quem está logado" fica em `frontend/src/context/AuthContext.tsx`,
  disponível para toda a aplicação através do hook `useAuth()`.
- Toda comunicação com o backend passa por `frontend/src/services/api.ts`,
  que já cuida de anexar o token JWT em cada requisição.

## Como o backend funciona

- Escrito em Node.js + Express + TypeScript.
- `src/server.ts` sobe o servidor HTTP.
- `src/app.ts` monta o Express, os middlewares globais (CORS, JSON) e
  conecta cada grupo de rotas (`/api/auth`, `/api/resources`, etc).
- `src/routes/` define **qual URL** chama **qual função**.
- `src/controllers/` contém a lógica de cada rota: validar dados de
  entrada, consultar/gravar no banco e devolver uma resposta.
- `src/middlewares/auth.ts` contém as funções que verificam o token JWT
  (`requireAuth`) e o perfil do usuário (`requireAdmin`).
- `src/utils/time.ts` contém a lógica pura de comparação de horários,
  usada tanto para validar reservas quanto bloqueios de manutenção.

Separar "rotas" de "controllers" ajuda a manter cada arquivo pequeno e
focado: a rota só decide o caminho, o controller decide o que fazer.

## Como o SQLite funciona aqui

- Usamos o módulo `node:sqlite`, embutido no próprio Node.js (a classe
  `DatabaseSync`), em vez de um pacote externo como `better-sqlite3`.
  Ele permite consultar o banco de forma **síncrona** (sem `await`), o
  que deixa o código dos controllers mais simples de ler — e, por ser
  nativo do Node, não exige nenhuma compilação na instalação.
- O arquivo `src/database/db.ts` abre a conexão com o banco e executa
  `schema.sql` toda vez que o servidor sobe. Como o schema usa
  `CREATE TABLE IF NOT EXISTS`, isso não apaga dados existentes.
- `src/database/seed.ts` é um script separado (não roda automaticamente)
  que insere dados de exemplo — só quando ainda não existem.
- A API usada nos controllers (`db.prepare(sql).run()/.get()/.all()`) é
  praticamente idêntica à de bibliotecas populares como `better-sqlite3`,
  então o restante da lógica de acesso ao banco não muda dependendo de
  qual das duas você usa.

## Como ocorre uma requisição (exemplo: listar recursos)

1. O usuário abre a página "Recursos" no navegador.
2. `frontend/src/pages/Resources.tsx` chama `api.get("/resources")`.
3. O axios envia `GET http://localhost:5173/api/resources`.
4. O proxy do Vite (configurado em `vite.config.ts`) encaminha isso para
   `http://localhost:3001/api/resources`.
5. O Express roteia essa URL para `resourceRoutes.ts`, que chama
   `listResources` em `resourceController.ts`.
6. O controller consulta a tabela `resources` no SQLite e devolve os
   dados em JSON.
7. O frontend recebe o JSON e renderiza a lista de recursos na tela.

## Como uma reserva é criada

1. O usuário preenche o formulário em `NewReservation.tsx` e envia.
2. O frontend faz `POST /api/reservations` com `resource_id`, `date`,
   `start_time` e `end_time`.
3. `reservationController.ts` valida:
   - se todos os campos foram enviados;
   - se o formato de data/hora é válido;
   - se o horário final é depois do inicial;
   - se o recurso existe e está `ativo`;
   - se **não há conflito com um bloqueio de manutenção**;
   - se **não há conflito com outra reserva já aprovada**.
4. Se tudo estiver certo, a reserva é criada com status `pendente`.
5. Um administrador depois aprova ou recusa essa reserva.

## Como ocorre a validação de conflito

A regra está isolada em `backend/src/utils/time.ts`, na função
`timeRangesOverlap`. Ela usa a fórmula clássica de sobreposição de
intervalos: dois intervalos `[inicioA, fimA)` e `[inicioB, fimB)` se
sobrepõem se `inicioA < fimB` **e** `inicioB < fimA`.

O horário final é tratado como **não inclusivo**: uma reserva das
14:00–16:00 não conflita com uma reserva das 16:00–17:00. Essa decisão
está documentada em `docs/DECISOES_TECNICAS.md`.

Essa validação roda em dois momentos:
- ao **criar** a reserva (`createReservation`);
- ao **aprovar** a reserva (`approveReservation`) — porque outra reserva
  pode ter sido aprovada entre a criação e a aprovação desta.

## Como funciona a autenticação

- No login/cadastro, o backend gera um **token JWT** contendo o `id` e o
  `role` (perfil) do usuário, assinado com uma chave secreta
  (`JWT_SECRET`, definida no `.env`).
- O frontend guarda esse token no `localStorage` do navegador.
- Em cada requisição seguinte, o frontend envia esse token no header
  `Authorization: Bearer <token>`.
- O middleware `requireAuth` (em `backend/src/middlewares/auth.ts`)
  verifica esse token em toda rota protegida. Se for válido, ele
  disponibiliza `req.user` (com `id` e `role`) para o controller usar.

## Como administrador e usuário possuem permissões diferentes

- Toda rota que só o admin pode usar tem o middleware `requireAdmin`
  encadeado depois de `requireAuth` (ver `backend/src/routes/*.ts`).
- Dentro dos controllers, algumas regras dependem do perfil mesmo em
  rotas compartilhadas. Por exemplo, `listReservations` devolve **todas**
  as reservas se `req.user.role === "admin"`, ou só as do próprio
  usuário caso contrário.
- No frontend, o componente `PrivateRoute` (em
  `frontend/src/components/PrivateRoute.tsx`) impede que um usuário
  comum acesse páginas administrativas, e vice-versa.

**Importante:** a proteção real está no **backend**. A proteção no
frontend é só para melhorar a experiência (evitar mostrar telas que a
pessoa não pode usar) — nunca confie apenas na interface para segurança.
