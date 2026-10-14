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

Em `/reservas`, visitantes informam CPF, acessam uma conta existente ou cadastram uma nova. O cadastro cria a sessão de cliente e o vínculo com `customers` antes de abrir Data. Contas com sessão válida começam diretamente em Data. Sessão administrativa e cookie anônimo de hold permanecem separados.

O CPF é guardado como HMAC-SHA-256 com chave dedicada; as rotas públicas não retornam e-mail ou outros dados da conta. A resposta de consulta informa se há cadastro para permitir o fluxo solicitado.

## Itens provisórios

- O modal de Termos e Condições contém texto provisório (`placeholder-v1`). Substitua pelo texto aprovado antes de oferecer o cadastro publicamente.
- O e-mail de recuperação ainda não é confirmado e nenhuma mensagem de verificação é enviada.
- `/recuperar-senha` informa que a recuperação de senha ainda não está disponível; não envia e-mail.
- O fluxo não comprova titularidade do CPF. A validação confirma somente formato e dígitos verificadores.
- Migração de clientes históricos para contas não está incluída.

## Verificação segura

Para testar o fluxo completo de autenticação e reserva, aplique a migração em um banco isolado e use contas de teste. Os testes unitários e de contrato rodam com `npm test`; não use o banco pessoal importado para testes de integração.
