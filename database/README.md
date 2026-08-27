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
```

O executor cria o database configurado caso ele não exista e registra as
migrations aplicadas em `schema_migrations`. Ele nunca remove tabelas e não
altera outros databases do servidor local.

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
