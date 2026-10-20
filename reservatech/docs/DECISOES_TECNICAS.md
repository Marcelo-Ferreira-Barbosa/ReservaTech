# Decisões técnicas

Este documento registra decisões tomadas em pontos onde os requisitos
originais não especificavam uma solução exata, seguindo a orientação de
sempre escolher a alternativa mais simples e explicar o porquê.

---

## 1. Formato de data e hora no banco

**Decisão:** `date` é armazenado como texto `YYYY-MM-DD` e `start_time`/
`end_time` como texto `HH:MM` (24 horas), em vez de um tipo `DATETIME`
ou timestamp numérico.

**Por quê:** o SQLite não tem um tipo nativo de data/hora — ele
armazena como texto, número ou real, e é a aplicação que decide o
formato. Usando `YYYY-MM-DD` e `HH:MM` com zero à esquerda, a
comparação de strings (`<`, `>`, `<=`) já funciona corretamente como
comparação cronológica, sem precisar converter para objetos `Date` só
para comparar. Isso simplifica bastante o código de validação de
conflito.

**Alternativas consideradas:** guardar tudo como timestamp Unix
(mais comum em sistemas maiores, mas exige conversões constantes para
exibir e comparar) ou usar um tipo `DATETIME` combinando data+hora em
um único campo (comresultaria em parsing mais complexo para separar
"mesma data, horários diferentes").

---

## 2. Horário final é um limite não inclusivo

**Decisão:** dois intervalos `[inícioA, fimA)` e `[inícioB, fimB)`
conflitam se `inícioA < fimB` **e** `inícioB < fimA`. Ou seja, uma
reserva das 14:00–16:00 **não** conflita com uma reserva das 16:00–17:00.

**Por quê:** essa é a interpretação mais natural de "horário de término"
em sistemas de agenda (o recurso fica livre exatamente quando o horário
final é atingido) e foi um exemplo explícito dado na especificação
original do projeto.

---

## 3. Reservas pendentes podem coexistir com conflito entre si

**Decisão:** o sistema permite que várias pessoas solicitem reservas
conflitantes (todas ficam `pendente`). A validação de conflito só
bloqueia quando o conflito é com uma reserva **já aprovada**.

**Por quê:** essa foi a solução mais simples para não travar o fluxo de
solicitação — o usuário não deveria ser impedido de "tentar" reservar um
horário concorrido só porque outra pessoa pediu primeiro. Quem decide
qual solicitação vence é o administrador, no momento da aprovação.

**Consequência aceita:** se o admin aprovar uma reserva, outras
solicitações pendentes conflitantes com ela **continuam pendentes** e
precisarão ser recusadas manualmente pelo admin (o sistema não faz isso
automaticamente ainda — ver `TODO.md`, item "auto-rejeitar pendentes
conflitantes ao aprovar").

**Alternativa considerada:** bloquear a criação de qualquer reserva
pendente conflitante com outra pendente já existente. Foi descartada
por deixar a experiência de solicitação mais rígida sem necessidade,
para um MVP acadêmico.

---

## 4. Token JWT guardado no localStorage

**Decisão:** o token de autenticação é salvo em `localStorage` no
navegador, não em cookies.

**Por quê:** é a abordagem mais simples de implementar e entender para
um projeto didático, e evita a complexidade extra de configurar cookies
`httpOnly` com atributos de segurança (`Secure`, `SameSite`) que fazem
mais sentido em um ambiente de produção real.

**Trade-off aceito:** tokens em `localStorage` são acessíveis via
JavaScript, o que os torna teoricamente mais expostos a ataques XSS do
que cookies `httpOnly`. Para uso acadêmico local isso é aceitável; para
uma evolução futura em produção, migrar para cookies `httpOnly` está
listado no `TODO.md` como melhoria de segurança.

---

## 5. Cadastro público sempre cria perfil "usuário"

**Decisão:** o endpoint `POST /api/auth/register` sempre cria contas com
`role = 'user'`. Não existe cadastro público de administrador.

**Por quê:** por segurança básica (qualquer pessoa poderia se cadastrar
como admin) e simplicidade. O usuário admin de teste é criado apenas
pelo script de seed (`npm run seed`), representando como um admin real
seria provisionado (manualmente, por outro admin, ou diretamente no
banco) — isso fica registrado como ponto de evolução futura.

---

## 6. Uso do módulo nativo `node:sqlite` em vez de `better-sqlite3`

**Decisão:** o acesso ao banco usa o módulo `node:sqlite` (classe
`DatabaseSync`), embutido no próprio Node.js, em vez do pacote externo
`better-sqlite3`.

**Por quê:** `better-sqlite3` é um addon nativo — ele compila código
C++ durante o `npm install` (via `node-gyp`). Em máquinas Windows sem o
Visual Studio Build Tools instalado, essa compilação falha, o que é um
obstáculo comum e desnecessário para um projeto acadêmico que muitos
estudantes vão rodar em notebooks pessoais recém-formatados. O módulo
`node:sqlite` tem uma API praticamente idêntica (`prepare().run()/.get()/
.all()`), mas já vem pronto dentro do Node — zero compilação, zero
dependência extra.

**Trade-off aceito:** o `node:sqlite` ainda é classificado como
"experimental" (release candidate) pela própria documentação do Node,
e exibe um aviso `ExperimentalWarning` no console ao rodar. Isso é
inofensivo para o uso local/acadêmico deste projeto. Requer Node.js
22.13 ou superior (versões mais antigas não têm o módulo disponível
sem flags).

**Alternativa considerada:** manter `better-sqlite3` e documentar a
instalação do Visual Studio Build Tools. Foi descartada por adicionar
um passo de instalação pesado (vários GB) só para uma dependência de
banco, o que vai contra a prioridade de simplicidade do projeto.

---

## 7. Bloqueio de manutenção muda o status do recurso para "manutenção"

**Decisão:** ao criar um `maintenance_block` **para a data de hoje**, o
recurso associado tem seu `status` alterado automaticamente para
`manutencao`. Ao remover o último bloqueio de um recurso, o status volta
para `ativo` — mas somente se ele estiver em `manutencao`.

**Por quê:** simplifica a exibição no frontend — a lista de recursos
pode mostrar o status diretamente, sem precisar cruzar com a tabela de
bloqueios toda vez.

**Por que só para hoje:** um bloqueio agendado para daqui a um mês não
pode deixar o recurso indisponível desde já. O que realmente impede as
reservas dentro do período bloqueado é a checagem de conflito em
`reservationController` (`hasMaintenanceConflict`), que olha a tabela de
bloqueios e funciona independente do `status`. O `status` é só o
indicador visual do estado **atual** do recurso.

**Por que a volta para `ativo` é condicional:** se o admin tinha marcado
o recurso como `inativo` (quebrado, aposentado), remover um bloqueio de
manutenção antigo não pode reativá-lo sozinho. Por isso o `UPDATE` tem
`AND status = 'manutencao'`.

**Limitação aceita:** o status não vira `manutencao` sozinho quando a
data de um bloqueio futuro chega, nem volta para `ativo` quando a
data/hora do bloqueio simplesmente passa (ele só volta quando o bloqueio
é **removido manualmente**). Fazer essas duas viradas automaticamente por
tempo é uma melhoria futura (ver `TODO.md`).

---

## 7b. Bloqueio de manutenção não pode ser criado sobre reservas aprovadas

**Decisão:** criar um `maintenance_block` que se sobreponha a uma reserva
já `aprovada` do mesmo recurso e data é recusado com `409`, e a resposta
traz a lista de reservas conflitantes (`conflicts`).

**Por quê:** criar o bloqueio por cima deixaria reservas com status
`aprovada` que na prática não poderiam acontecer — o usuário apareceria
na sala e ela estaria interditada. Preferimos que o admin veja o
conflito e decida conscientemente: escolher outro horário, ou cancelar
as reservas afetadas (o que já avisa o usuário via `reason`) e então
criar o bloqueio.

**Trade-off aceito:** para uma manutenção emergencial o admin precisa de
dois passos (cancelar as reservas, depois bloquear) em vez de um. Achamos
aceitável porque o cancelamento é justamente o momento de registrar o
motivo para o usuário.

---

## 8. Frontend mantido nas majors originais (React 18, Vite 5, React Router 6)

**Decisão:** ao atualizar as dependências do frontend para eliminar
riscos de instalação, optamos por atualizar apenas para a **última
versão de patch/minor dentro da mesma major** já usada no projeto
(ex: Vite `5.4.1` → `5.4.21`), em vez de saltar para as majors mais
recentes disponíveis no momento (ex: Vite 8, React 19, React Router 7).

**Por quê:** o frontend já não depende de nenhum pacote com compilação
nativa — o problema relatado (erro de instalação por falta de Visual
Studio Build Tools) era exclusivo do backend, causado pelo
`better-sqlite3` (ver decisão 6). Atualizar as versões de patch garante
compatibilidade com versões recentes do Node sem introduzir mudanças de
API que quebrariam as páginas já implementadas — majors novas como
React Router 7 mudam parte da API de rotas e exigiriam revisão e testes
adicionais, o que não é necessário só para resolver um problema de
instalação.

**Consequência aceita:** o `npm install` no frontend pode mostrar avisos
do `npm audit` sobre vulnerabilidades moderadas em `esbuild` (usado
apenas pelo servidor de desenvolvimento, não afeta o build de produção)
e em `react-router` (um redirecionamento aberto, mitigável ao evitar
redirecionar para URLs vindas diretamente do usuário sem validação).
Migrar para as majors mais novas ficou registrado como melhoria futura
em `TODO.md`.
