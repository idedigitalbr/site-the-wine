# Spec de implementação — política de validação do acesso

Status: implementada no checkout `main` em 2026-10-22.

## Objetivo

Aplicar a mesma política de validação no frontend e no backend do cadastro de cliente, mantendo o login de contas existentes compatível. O frontend deve fornecer feedback imediato e limitar entradas obviamente inválidas; o backend é a autoridade final e deve repetir todas as regras antes de consultar ou alterar o banco.

Não fazer chamadas de API enquanto o usuário digita. O cadastro só deve fazer uma requisição ao enviar um formulário localmente válido. A senha é a única exceção de verificação externa: a consulta de comprometimento ocorre no servidor, somente no envio, e nunca expõe a senha ou seu hash.

## Regras de campos

- Nome: normalizar Unicode em NFC, remover caracteres de controle/formatação, compactar espaços e remover espaços externos. Aceitar apenas letras Unicode, marcas Unicode, espaço, hífen e apóstrofo. Mínimo de 2 e máximo de 160 caracteres Unicode.
- CPF: aceitar somente os 11 dígitos, usando o sanitizador compartilhado no frontend e o schema/validador no backend. `maxLength` deve ser 11.
- Data de nascimento: manter o formato visual `DD/MM/AAAA`, converter para ISO antes do envio e rejeitar datas inexistentes ou futuras.
- E-mail: máximo de 254 caracteres em ambos os campos, sem controles ou espaços internos, com trim externo e comparação normalizada em minúsculas. O cliente e o servidor devem usar o mesmo validador; a confirmação também deve ser limitada.
- Senha: não sanitizar, não aparar e não remover caracteres. Permitir colar, espaços, símbolos, caracteres Unicode e gerenciadores de senha.

## Política de senha de cadastro

- Mínimo de 8 caracteres Unicode e máximo de 20 caracteres Unicode.
- Não exigir maiúscula, minúscula, número ou símbolo.
- A confirmação deve ser exatamente igual à senha, inclusive espaços, símbolos e Unicode.
- Não exigir troca periódica.
- O login deve continuar aceitando senhas históricas válidas; não aplicar nele a faixa de 8–20 usada no cadastro.
- Senhas vazias ou compostas apenas por espaços são inválidas.

## Senhas fracas, previsíveis ou comprometidas

O cliente pode usar `zxcvbn` para feedback local, sem bloquear o usuário por si só e sem fazer request. Depois que o campo de senha principal perder foco, se a senha for localmente fraca, mostrar um checkbox de confirmação estilizado com a página. O checkbox começa desmarcado e, enquanto não estiver marcado, o envio deve ser bloqueado.

O backend deve repetir a análise no envio. Para verificar vazamentos, consultar a API Pwned Passwords por k-anonymity: calcular SHA-1 localmente, enviar apenas os primeiros cinco caracteres do hash, usar timeout de 2,5 segundos e não registrar a senha, o hash completo ou o sufixo. Resposta não-2xx, timeout ou corpo inválido devem falhar fechado com `PASSWORD_POLICY_UNAVAILABLE` (503), sem criar conta.

Se a análise local ou server-side indicar senha fraca/comprometida, retornar `WEAK_PASSWORD` quando `acceptWeakPassword` não for `true`. O cliente deve exibir o checkbox somente após o campo de senha principal ser finalizado; a confirmação não dispara essa etapa. Com o checkbox marcado, o cliente pode reenviar uma única vez, e o servidor só aceita `acceptWeakPassword: true` depois de validar estruturalmente todos os demais campos.

## Contrato server-side

1. Ler e validar o JSON com limite de corpo existente.
2. Executar o schema compartilhado e rejeitar qualquer divergência, mesmo que o frontend tenha aceitado o valor.
3. Normalizar nome/e-mail somente pelos helpers definidos no domínio.
4. Verificar a política da senha e o comprometimento apenas no submit.
5. Verificar CPF disponível antes de criar a conta.
6. Persistir e iniciar a sessão usando somente os valores normalizados; nunca persistir senha em texto claro.
7. Preservar códigos de erro genéricos para conflitos de conta e não revelar se CPF/e-mail de terceiro existe.

## Privacidade e recuperação

O CPF usado no login pode continuar sendo mantido em `sessionStorage` exclusivamente para pré-preencher a recuperação de senha, pois esse é um requisito funcional do fluxo atual. Não armazenar senha, token de sessão ou hash de senha no storage acessível ao JavaScript.

## Arquivos e ordem de implementação

1. Criar helpers de nome, e-mail e comprometimento de senha.
2. Atualizar `password-policy.ts` e o schema de cadastro.
3. Atualizar o serviço server-side para aguardar a análise e respeitar o aceite de senha fraca.
4. Atualizar campos e formulário de cadastro; manter a senha literal e limitar apenas por quantidade de pontos Unicode.
5. Ajustar CPF do login e estilos do checkbox de senha fraca.
6. Adicionar testes de domínio, schema e consulta k-anônima.

## Critérios de aceite

- Frontend e backend rejeitam os mesmos nomes, CPFs e e-mails inválidos.
- O backend rejeita payload adulterado que contorne o frontend.
- Nenhuma chamada externa ocorre durante a digitação.
- Senha forte válida conclui o cadastro sem checkbox.
- Senha fraca/comprometida mostra checkbox apenas após finalizar o campo principal, bloqueia sem aceite e permite prosseguir após aceite.
- Falha do serviço de comprometimento não cria conta.
- Confirmação de senha exige igualdade exata.
- Login e recuperação existentes não sofrem mudança indevida de política.
- Desktop continua sem scroll da página no acesso/cadastro; mobile pode rolar quando necessário.

## Verificação obrigatória

Executar na pasta `next-app`:

- `npm test`
- `npm run typecheck`
- `npm run verify:complexity`
- `npm run lint` (registrar somente violações preexistentes fora do escopo)
- `npm run build`
- `git diff --check`
