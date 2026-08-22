# Guia de desenvolvimento — ReservaTech

Este guia é para quem vai continuar desenvolvendo o projeto depois desta
primeira versão (MVP).

## Onde criar cada coisa

### Um novo componente React reutilizável
Crie em `frontend/src/components/NomeDoComponente.tsx`. Um componente
"reutilizável" é algo usado em mais de uma página (ex: um badge, um
modal, um card). Se algo só é usado em uma única página, pode ficar
dentro do próprio arquivo da página.

### Uma nova página
Crie em `frontend/src/pages/NomeDaPagina.tsx` (ou em `pages/admin/` se
for uma tela exclusiva de administrador). Depois, registre a rota em
`frontend/src/App.tsx`, dentro de `<Routes>`.

### Um novo endpoint da API
Dois passos:
1. Adicione a função em um controller existente (`backend/src/controllers/`)
   ou crie um novo controller se for uma entidade nova.
2. Registre a rota correspondente em `backend/src/routes/`, ligando o
   método HTTP + caminho à função do controller.

### Uma nova regra de negócio
Coloque a lógica dentro do controller responsável. Se a lógica for usada
em mais de um lugar (como a checagem de conflito de horário), extraia
para uma função em `backend/src/utils/`.

### Uma alteração no banco
Edite `backend/src/database/schema.sql`. Como o schema usa
`CREATE TABLE IF NOT EXISTS`, criar uma tabela nova é simples. Para
**adicionar uma coluna em uma tabela existente**, é preciso um comando
`ALTER TABLE` (o SQLite não recria a tabela sozinho) — adicione esse
comando no `schema.sql` com um comentário explicando a mudança, já que
o projeto ainda não tem um sistema de migrations (isso está no `TODO.md`).

## Como criar uma nova funcionalidade, passo a passo

Exemplo: "adicionar um campo de capacidade nos recursos".

1. Adicione a coluna no `schema.sql` (`capacity INTEGER`).
2. Atualize o tipo `Resource` em `backend/src/types/index.ts` e em
   `frontend/src/types/index.ts`.
3. Atualize `createResource` e `updateResource` em
   `resourceController.ts` para ler/gravar esse campo.
4. Atualize o formulário em `ManageResources.tsx` (frontend) para incluir
   o campo.
5. Teste manualmente (veja a seção abaixo).

## Como testar manualmente

Como o projeto ainda não tem testes automatizados (ver `TODO.md`), o
fluxo de teste manual recomendado é:

1. Suba o backend (`npm run dev` em `backend/`) e o frontend
   (`npm run dev` em `frontend/`).
2. Use o usuário de teste **admin** para cadastrar/editar recursos e
   bloquear manutenção.
3. Use o usuário de teste **comum** (em outra aba, ou em uma janela
   anônima) para solicitar reservas.
4. Volte para o admin e aprove/recuse as solicitações.
5. Para testar a validação de conflito, tente criar duas reservas
   aprovadas para o mesmo recurso em horários que se sobrepõem — a
   segunda deve ser recusada pelo backend com erro 409.

Ferramentas como o [Postman](https://www.postman.com/) ou a extensão
"REST Client" do VS Code também ajudam a testar a API diretamente, sem
passar pelo frontend.

## Como trabalhar com Git

Sugestão simples, sem burocracia:

- `main` — sempre com uma versão que funciona.
- Uma branch por funcionalidade, com nome descritivo:
  `feature/filtros-recursos`, `fix/validacao-data`, etc.
- Commits pequenos e com mensagens claras (ex: `feat: adiciona filtro de
  recursos por tipo`, `fix: corrige validação de data inválida`).
- Abra um Pull Request para revisar antes de juntar na `main`, mesmo que
  seja só um colega dando uma olhada rápida.

Evite branches de longa duração — quanto mais tempo uma branch fica sem
juntar com a `main`, mais difícil fica resolver conflitos depois.

## Divisão sugerida da equipe

- **Frontend**: páginas, componentes, formulários e integração com a API.
- **Backend**: rotas da API, regras de negócio, autenticação e validações.
- **Banco**: estrutura do SQLite, evolução do schema e scripts de seed.

Essa divisão é só um ponto de partida — como o projeto é pequeno, é
normal e esperado que todo mundo mexa em mais de uma parte ao longo do
tempo.
