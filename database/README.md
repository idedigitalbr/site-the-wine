# The Wine — banco de dados

O banco de produção usa MySQL 8 em um volume Docker nomeado (`thewine_mysql_data`).
As migrations desta pasta são executadas automaticamente apenas na primeira
inicialização de um volume vazio pelo serviço `db` do Compose.

## Desenvolvimento local com Laragon

O fluxo local da branch `feature/reservas-the-wine` usa o MySQL do Laragon em
`127.0.0.1:3306`, sem Docker. Dentro de `next-app`, configure um `.env.local`
baseado em `.env.example` e execute:

```bash
npm run db:migrate:local
npm run db:seed:restaurant:local
```

O executor cria o database configurado caso ele não exista e registra as
migrations aplicadas em `schema_migrations`. Ele nunca remove tabelas e não
altera outros databases do servidor local.

O seed cadastra dados demonstrativos idempotentes para o salão local: áreas,
tipos e mesas, combinações, turnos de almoço/jantar e horários de
funcionamento. Ele também cria uma massa completa marcada como `DEMO`: 10
clientes, 12 reservas cobrindo todos os estados do fluxo, 5 entradas de lista
de espera, 3 bloqueios, 2 holds, 4 appointments legados, 7 pagamentos, 2
reembolsos, 5 eventos de webhook e 5 notificações em estados variados. As
reservas demonstrativas usam códigos `DEMO-*` e podem ser usadas para testar
timeline, check-in, acomodação, conclusão, no-show, cancelamento, atribuição
de mesa, alteração de horário e analytics. O comando imprime alguns tokens de
portal para os testes de acesso à reserva.

O seed pode receber `SEED_DATE=YYYY-MM-DD` para concentrar os cenários em uma
data específica. Ele só executa quando `DATABASE_HOST` é `127.0.0.1` ou
`localhost` e `DATABASE_NAME` é exatamente `thewine`; não remove nem altera
outros databases do Laragon.

## Configuração

Crie um `.env` somente no servidor e defina senhas fortes para
`MYSQL_PASSWORD` e `MYSQL_ROOT_PASSWORD`. O arquivo `.env` é ignorado pelo Git
e não deve ser versionado.

O Next acessa o banco somente pela rede interna do Compose usando o host
exclusivo `thewine-db`,
porta `3306`, database `MYSQL_DATABASE` e usuário `MYSQL_USER`.

## Agendamentos

`migrations/001_create_appointments.sh` cria a base do mini sistema de
agendamento para jantar, degustação e eventos: data, horário, quantidade de
pessoas, contato, status, observações e timestamps. A camada de domínio em
`next-app/src/server/appointments/` já contém os tipos e o repositório para a
próxima etapa da API, mas nenhum formulário público é ativado nesta publicação.

`migrations/002_create_reservations_v2_foundation.sql` cria a fundação V2
isolada para clientes, salão, mesas, turnos, experiências, reservas, holds e
lista de espera. A tabela `appointments` permanece legada e não é removida nem
convertida nesta fase.

`migrations/003_add_reservation_hold_window.sql` adiciona a janela da reserva
às retenções temporárias. O hold público dura 8 minutos, é associado a um
cookie de sessão HttpOnly e precisa ser revalidado em transação antes da
confirmação. A migration é idempotente também em versões do MySQL do Laragon
que não aceitam `ADD COLUMN IF NOT EXISTS`.

## Endpoint de disponibilidade

O Next expõe `GET /api/reservations/availability` para consultas informativas.
Use `date`, `guests` e, opcionalmente, `duration` em minutos (padrão 120). Com
`time`, a resposta informa as combinações de mesas disponíveis para aquele
intervalo; sem `time`, retorna os slots de 30 minutos derivados de
`business_hours` e `service_shifts`. O cálculo considera capacidade, duração,
reservas ativas, bloqueios e combinações cadastradas. A confirmação revalida o
inventário em transação antes de gravar a reserva.

O fluxo público cria o hold com `POST /api/reservations/hold` e confirma a
reserva com `POST /api/reservations`. A confirmação sem hold ativo retorna
`409 hold_required`. Para exercitar a proteção contra dupla reserva usando o
MySQL local e o Next em execução na porta 3000, use `npm run test:reservation-db`
dentro de `next-app`; o comando cria e remove um fixture isolado no database
configurado.

## Operação local do painel

O painel protegido fica em `/admin`. Para habilitá-lo no ambiente local, defina
em `next-app/.env.local` `ADMIN_EMAIL`, `ADMIN_PASSWORD` e
`ADMIN_SESSION_SECRET` com valores próprios. As páginas administrativas não
usam fallback de credenciais.

Em `/admin/salao`, o floor manager permite posicionar mesas, acompanhar os
estados livre/reservada/bloqueada, criar combinações e registrar bloqueios por
salão, área ou mesa. Essas alterações alimentam o endpoint público de
disponibilidade.
