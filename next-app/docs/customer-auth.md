# Autenticação de clientes e reservas

## Ativação do banco

A migração `../../database/migrations/013_customer_auth.sql` precisa ser aplicada uma vez, depois das migrações `011` e `012`, no banco de destino revisado. Faça backup e confira explicitamente host e nome do banco antes de aplicar. Ela altera `customers` para permitir telefone ausente e cria as tabelas de autenticação, limite de tentativas e contexto da reserva. O executor reconhece a migração antiga `011_customer_auth.sql` como equivalente, preservando bancos locais nos quais ela já foi aplicada.

Não aplique essa migração no banco local importado com dados pessoais para testar. Use um banco de teste isolado ou um ambiente de homologação. A aplicação não executa essa migração automaticamente.

## Variáveis de ambiente

- `BETTER_AUTH_SECRET`: segredo aleatório estável com pelo menos 32 caracteres. Protege dados da sessão; não reutilize `ADMIN_SESSION_SECRET`.
- `CUSTOMER_CPF_LOOKUP_SECRET`: segredo aleatório estável e separado, com pelo menos 32 caracteres. Gera o HMAC de busca do CPF. Trocar esse valor exige recalcular os índices existentes antes de voltar a consultar contas.
- `BETTER_AUTH_URL`: origem canônica do site, incluindo protocolo e porta no ambiente local. Deve corresponder à origem usada pelo navegador.
- `CUSTOMER_AUTH_TRUST_PROXY_HEADERS`: mantenha `false` quando não houver um proxy confiável. Use `true` somente quando o proxy reverso sobrescrever `X-Real-IP` com o endereço do cliente; não confie em um cabeçalho que o visitante possa encaminhar sem alteração.
- `PUBLIC_APP_URL`: origem alternativa usada somente quando `BETTER_AUTH_URL` não está definida.

As fachadas de CPF, login e cadastro limitam tentativas usando o MySQL. Sem um proxy configurado, os visitantes compartilham o bucket de contingência; em produção, configure o proxy confiável e valide que `X-Real-IP` chega sobrescrito.

O pool MySQL usa UTC para manter compatíveis a expiração Better Auth, a expiração do contexto de reserva e os horários comparados com `UTC_TIMESTAMP()`.

## Fluxo entregue

`/acesso` é a tela única de autenticação: começa no login e alterna localmente para cadastro, sem duplicar página ou transportar CPF entre modos. `/cadastro` é apenas um alias server-side para o mesmo screen. Sem contexto explícito, o sucesso vai para `/lista-de-reservas`; a entrada anônima por `/reservas` usa `returnTo` allowlisted e volta ao wizard já autenticado, que então cria o próprio flow e abre Data.

O cadastro cria a sessão de cliente e o vínculo com `customers` antes de navegar. O cliente confirma o cookie com um GET de sessão e exige o mesmo `user.id` retornado pelo POST. Sessão administrativa e cookie anônimo de hold permanecem separados.

O CPF é guardado como HMAC-SHA-256 com chave dedicada; o browser nunca consulta SQL nem recebe dados de conta. O endpoint público antigo de lookup está aposentado e responde 410. Conflitos de CPF/e-mail retornam uma resposta genérica 409 para reduzir enumeração direta.

Novas contas exigem senha forte na fachada server (comprimento mínimo efetivo de 15 caracteres e score local maior que 2); `acceptWeakPassword` não é mais uma exceção válida. Contas históricas continuam usando a política de login do Better Auth, para não quebrar senhas antigas.

## Itens provisórios

- O modal de Termos e Condições contém texto provisório (`placeholder-v1`). Substitua pelo texto aprovado antes de oferecer o cadastro publicamente.
- O e-mail de recuperação ainda não é confirmado e nenhuma mensagem de verificação é enviada.
- `/recuperar-senha` informa que a recuperação de senha ainda não está disponível; não envia e-mail.
- O fluxo não comprova titularidade do CPF. A validação confirma somente formato e dígitos verificadores.
- Migração de clientes históricos para contas não está incluída.
- A imagem lateral do acesso usa temporariamente uma foto existente do ambiente; a referência visual de taça precisa de um asset aprovado antes da publicação final.

## Verificação segura

Para testar o fluxo completo de autenticação e reserva, aplique a migração em um banco isolado e use contas de teste. Os testes unitários e de contrato rodam com `npm test`; não use o banco pessoal importado para testes de integração.
