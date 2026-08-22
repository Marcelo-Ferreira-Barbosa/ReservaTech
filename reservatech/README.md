# ReservaTech

Sistema de Reserva de Salas e Equipamentos Acadêmicos.

## 1. O que é o ReservaTech

O ReservaTech é uma aplicação web para uma instituição de ensino gerenciar a
reserva de salas, laboratórios, projetores, notebooks e outros equipamentos.
Usuários solicitam reservas; administradores aprovam, recusam ou cancelam,
além de poderem bloquear recursos para manutenção.

## 2. Objetivo do projeto

Esta é a **primeira versão (MVP)** do sistema, pensada para servir de base
para uma equipe de estudantes continuar o desenvolvimento. O foco é
clareza e simplicidade, não sofisticação. Funcionalidades secundárias
ficaram propositalmente como tarefas em aberto — veja `TODO.md`.

## 3. Tecnologias utilizadas

| Camada    | Tecnologia                                  |
|-----------|----------------------------------------------|
| Frontend  | React + TypeScript + Vite                    |
| Backend   | Node.js + TypeScript + Express               |
| Banco     | SQLite (via `node:sqlite`, módulo nativo do Node.js) |
| Auth      | JWT (`jsonwebtoken`) + hash de senha (`bcryptjs`) |

> **Sobre o banco:** usamos o módulo `node:sqlite`, embutido no próprio
> Node.js desde a versão 22.5 (sem flags a partir do Node 22.13/23.4).
> Diferente de pacotes como `better-sqlite3`, ele não precisa compilar
> nenhum código nativo na instalação — por isso não exige Visual Studio
> Build Tools nem nada parecido, mesmo no Windows. Ao rodar o backend,
> você pode ver um aviso `ExperimentalWarning: SQLite is an experimental
> feature...` no terminal — isso é normal e não é um erro, apenas um
> aviso do próprio Node de que a API pode mudar em versões futuras.

> **Sobre o frontend:** todas as bibliotecas usadas (Vite, React,
> React Router, Axios) são pacotes 100% JavaScript/TypeScript — nenhuma
> delas precisa compilar código nativo na instalação, então o mesmo tipo
> de erro que pode acontecer com dependências nativas do backend não se
> aplica aqui.

## 4. Requisitos para executar

Antes de começar, instale em sua máquina:

- **Node.js** versão 22.13 ou superior ([nodejs.org](https://nodejs.org) — baixe a versão marcada como "LTS")
- **Git** ([git-scm.com](https://git-scm.com))
- **VS Code** (recomendado, mas qualquer editor funciona)

> Não é necessário instalar Visual Studio, Build Tools, Python nem
> nenhuma outra ferramenta de compilação — o projeto não usa nenhum
> pacote com dependências nativas.

Para conferir se o Node está instalado, abra um terminal e rode:

```bash
node -v
npm -v
```

Se aparecer um número de versão em cada comando, está tudo certo.

## 5. Como instalar

Depois de extrair/clonar o projeto, abra um terminal na pasta raiz
(`reservatech/`) e rode os comandos abaixo. **O projeto tem duas partes
independentes (backend e frontend), então cada uma precisa do seu próprio
`npm install`.**

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

Isso pode demorar alguns minutos na primeira vez.

## 6. Como configurar

O backend usa um arquivo `.env` para configurações simples (porta e chave
do JWT). Um exemplo já vem pronto — basta copiar:

```bash
cd backend
copy .env.example .env      # Windows (PowerShell ou CMD)
# ou, no Linux/Mac:
cp .env.example .env
```

Os valores padrão já funcionam para uso local. Não é obrigatório alterar
nada para rodar o projeto pela primeira vez.

## 7. Como criar/inicializar o banco

O banco SQLite é criado **automaticamente** na primeira vez que o backend
sobe (o arquivo `src/database/db.ts` executa o `schema.sql`). Ou seja,
você não precisa rodar nenhum comando manual só para criar as tabelas.

Porém, para ter dados de teste (usuários e recursos de exemplo), rode o
script de seed uma vez, **depois de instalar as dependências**:

```bash
cd backend
npm run seed
```

Você verá mensagens confirmando a criação dos usuários e recursos de
teste. É seguro rodar esse comando mais de uma vez — ele não duplica
dados que já existem.

## 8. Como executar o backend

Em um terminal, dentro da pasta `backend/`:

```bash
npm run dev
```

Se tudo der certo, você verá algo como:

```
ReservaTech backend rodando em http://localhost:3001
Teste rápido: http://localhost:3001/api/health
```

**Deixe este terminal aberto** — o backend precisa continuar rodando.

### Como verificar se o backend está funcionando

Abra `http://localhost:3001/api/health` no navegador. Se aparecer um
JSON como `{"status":"ok", ...}`, o backend está no ar.

### Como verificar se o banco foi criado

Depois de rodar o backend pela primeira vez, deve existir o arquivo:

```
backend/database/reservatech.db
```

Se esse arquivo existir, o banco foi criado com sucesso.

## 9. Como executar o frontend

Abra **outro terminal** (deixe o do backend rodando) e, dentro da pasta
`frontend/`:

```bash
npm run dev
```

Você verá uma mensagem do Vite informando o endereço, algo como:

```
Local:   http://localhost:5173/
```

## 10. Como acessar no navegador

Com os dois servidores rodando, acesse:

```
http://localhost:5173
```

Isso abre a tela de login do ReservaTech.

**Resumo das portas usadas:**

| Serviço  | Porta | URL                         |
|----------|-------|------------------------------|
| Backend  | 3001  | http://localhost:3001        |
| Frontend | 5173  | http://localhost:5173        |

O frontend está configurado (em `frontend/vite.config.ts`) para
encaminhar automaticamente chamadas `/api/...` para o backend, então
você não precisa se preocupar com CORS durante o desenvolvimento.

## 11. Usuários de teste

Criados pelo comando `npm run seed` (ver seção 7):

| Perfil | E-mail                       | Senha  |
|--------|-------------------------------|--------|
| Admin  | admin@reservatech.local       | 123456 |
| Usuário| usuario@reservatech.local     | 123456 |

> **Atenção:** essas credenciais são apenas para ambiente local acadêmico.
> Nunca use senhas assim em um ambiente real com dados de verdade.

## 12. Estrutura das pastas

```
reservatech/
├── backend/            # API REST (Node + Express + TypeScript)
│   └── src/
│       ├── controllers/   # Lógica de cada rota
│       ├── routes/        # Definição das rotas da API
│       ├── middlewares/   # Autenticação (JWT)
│       ├── database/      # Schema SQL, conexão e seed
│       ├── types/         # Tipos TypeScript compartilhados
│       └── utils/         # Funções auxiliares (ex: conflito de horário)
├── frontend/           # Interface web (React + Vite + TypeScript)
│   └── src/
│       ├── pages/          # Uma página por rota
│       ├── pages/admin/    # Páginas exclusivas do administrador
│       ├── components/     # Componentes reutilizáveis (Navbar, badges...)
│       ├── context/        # Contexto de autenticação
│       ├── services/       # Cliente HTTP (axios) para a API
│       └── types/          # Tipos TypeScript compartilhados
├── docs/               # Documentação de arquitetura e decisões técnicas
├── TODO.md             # Tarefas em aberto para a equipe continuar
└── README.md           # Este arquivo
```

## 13. Principais funcionalidades

- Cadastro e login de usuários (com dois perfis: usuário e admin)
- Consulta de recursos disponíveis
- Solicitação de reservas, com validação de conflito de horário
- Aprovação, recusa (com motivo) e cancelamento de reservas
- Cadastro, edição e ativação/desativação de recursos (admin)
- Bloqueio de recursos para manutenção (admin)
- Dashboards simples para usuário e administrador

## 14. Como frontend e backend se comunicam

O frontend faz chamadas HTTP (via `axios`) para a API REST do backend,
sempre no formato `/api/...`. O token JWT gerado no login é salvo no
`localStorage` do navegador e enviado automaticamente em cada requisição
no header `Authorization: Bearer <token>`. Veja mais detalhes em
`docs/ARQUITETURA.md`.

## 15. Onde o banco SQLite fica

O banco é um único arquivo:

```
backend/database/reservatech.db
```

Ele é criado automaticamente e **não deve ser versionado no Git**
(já está no `.gitignore`). Se quiser "resetar" o banco do zero, basta
apagar esse arquivo e rodar `npm run dev` novamente (as tabelas são
recriadas) seguido de `npm run seed`.

## 16. Como adicionar novas funcionalidades

Veja o guia detalhado em `docs/GUIA_DESENVOLVIMENTO.md`. Resumo rápido:

- Nova tela → `frontend/src/pages/`
- Novo endpoint → `backend/src/routes/` + `backend/src/controllers/`
- Nova regra de negócio → dentro do controller correspondente, ou em um
  novo arquivo se a lógica crescer muito
- Nova tabela/coluna → `backend/src/database/schema.sql`

## 17. Problemas comuns e possíveis soluções

**"Cannot find module" ao rodar `npm run dev`**
→ Rode `npm install` novamente na pasta correspondente (backend ou frontend).

**Porta 3001 ou 5173 já em uso**
→ Feche outro processo usando a porta, ou altere a porta no `.env`
(backend) ou em `vite.config.ts` (frontend).

**Erro de login "E-mail ou senha inválidos"**
→ Confira se rodou `npm run seed` no backend antes de tentar logar com
as credenciais de teste.

**Frontend não consegue falar com o backend**
→ Confirme que o backend está rodando (`http://localhost:3001/api/health`)
antes de usar o frontend.

**Mensagem `ExperimentalWarning: SQLite is an experimental feature...`**
→ Não é um erro. É apenas um aviso do Node informando que o módulo
`node:sqlite` ainda pode mudar em versões futuras. O projeto funciona
normalmente mesmo com esse aviso aparecendo.

**`SyntaxError` ou `node:sqlite` não encontrado**
→ Sua versão do Node é anterior à 22.13. Rode `node -v` para conferir e,
se necessário, instale uma versão mais recente (LTS) em nodejs.org.

**`npm install` no frontend mostra "X vulnerabilities" ao final**
→ São avisos do `npm audit` sobre versões usadas em desenvolvimento
(ex: servidor de dev do Vite), não erros de instalação. Não impedem o
projeto de funcionar. Não rode `npm audit fix --force` sem necessidade:
ele tenta atualizar para versões major novas (ex: Vite 8, React Router 7)
que exigem mudanças no código e não foram testadas nesta versão do
projeto.

## 18. Mais documentação

- `docs/ARQUITETURA.md` — como cada parte do sistema funciona
- `docs/GUIA_DESENVOLVIMENTO.md` — como a equipe deve trabalhar no código
- `docs/DECISOES_TECNICAS.md` — decisões tomadas onde a especificação era aberta
- `TODO.md` — lista de tarefas em aberto, classificadas por dificuldade
