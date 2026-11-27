# Spec de Implementação — Fluxo de Recuperação de Senha (`/recuperar-senha`) com Código por E-mail (Hostinger SMTP)

- **Data:** 20/10/2026
- **Autor da Arquitetura:** Argon (Gemini 4 Argon)
- **Executor Alvo:** Modelo de execução guiada (zero decisões autônomas; seguir estritamente os contratos, caminhos de arquivos e blocos de código definidos neste documento).
- **Diretório da Aplicação:** `next-app/`
- **Referências Visuais Canônicas:** `docs/superpowers/specs/assets/recuperar-senha-2026-10-20/`
  1. `01-link-esqueci-minha-senha.png` — Link `"Esqueci minha senha"` na tela de login (`/acesso`).
  2. `02-etapa-1-email-ou-cpf.png` — Etapa 1: Solicitar código informando E-mail ou CPF.
  3. `03-etapa-2-digite-o-codigo.png` — Etapa 2: Inserir código de 6 dígitos enviado por e-mail (expiração de 10 minutos + opção de reenvio).
  4. `04-etapa-3-crie-nova-senha.png` — Etapa 3: Criar e confirmar nova senha definitiva com checklist de requisitos.

---

## 0. Regras Inegociáveis para o Executor

1. **Zero Decisões Autônomas:** Todas as decisões de arquitetura, segurança, banco de dados, envio SMTP, contratos Zod, rotas HTTP e componentes React já estão tomadas e escritas nesta spec. **Não** instale pacotes novos no `package.json` (isso quebraria `npm run verify:lockfile`), **não** crie migrations SQL novas (usaremos a tabela `verification` já existente em `013_customer_auth.sql`) e **não** invente variações de layout.
2. **Preservação do Repositório e Git:**
   - **NÃO** executar `git commit`, `git push`, `git reset`, `git checkout` ou criar PR sem instrução explícita do usuário.
   - **NÃO** alterar `.env` ou `.env.local` sem solicitação.
3. **Respeito Estrito aos Guards (`verify:complexity` e `verify:architecture`):**
   - **Complexidade Ciclomática Máxima por função:** `8` (`MAX_COMPLEXITY = 8`).
   - **Profundidade Máxima de Aninhamento por função:** `3` (`MAX_DEPTH = 3`).
   - *Atenção:* No script `scripts/check-complexity.mjs`, cada `if`, `?:`, `&&`, `||`, `??`, `for`, `while`, `catch` e `case` soma `+1` na complexidade da função. Todos os blocos de código desta spec já foram decompostos em funções pequenas para passarem com folga no `npm run verify:complexity`. **Copie-os fielmente sem juntar funções.**
   - **Isolamento de Camadas (`scripts/check-architecture.mjs`):**
     - `src/modules/**/domain/**` **NÃO PODE** importar `react`, `next`, `mysql2`, `@/server`, `@/app` ou `@/components`.
     - Componentes em `src/components/**` e páginas em `src/app/**` **NÃO PODEM** importar `mysql2`, `@/server/db` ou `/infrastructure/`.

---

## 1. Métricas de Cibersegurança Estabelecidas (Essenciais + Recomendadas)

Como a página deve ter lógica simples, direta e enxuta, aplicaremos **apenas o essencial indispensável de cibersegurança** somado a **duas proteções recomendadas de baixo custo**:

### 1.1 Essenciais de Cibersegurança (Obrigatórios)
1. **Anti-Enumeração de Contas na Etapa 1 (`POST /api/customer-auth/password-recovery/request`):**
   - Seja o CPF/e-mail cadastrado ou não no banco de dados, a API responde sempre `200 OK` com `{ status: 'code_sent', expiresInSeconds: 600 }` e a interface avança para a Etapa 2 sem revelar se a conta existe nem expor o endereço de e-mail associado a um CPF.
2. **Armazenamento do Código por Hash Criptográfico (Nunca em Texto Puro):**
   - O código de 6 dígitos numéricos (`000000` a `999999`, gerado com `crypto.randomInt(0, 1000000)`) **nunca** é salvo em texto puro no MySQL.
   - Salva-se na tabela `verification` apenas o `HMAC-SHA256` do código vinculado ao `user.id` e ao identificador normalizado.
3. **Expiração Estrita de 10 Minutos (`TTL = 600s`) e Uso Único:**
   - Todo código gerado expira exatamente em **10 minutos** (`DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE)`).
   - Se o usuário clicar em **"Reenviar código"**, o código anterior daquele usuário é sobrescrito/invalidado imediatamente e um novo prazo de 10 minutos se inicia.
   - A tela da Etapa 2 avisa explicitamente ao usuário: *"O código expira em 10 minutos. Caso expire, clique em Reenviar código."*
4. **Bloqueio de Força Bruta no Código de 6 Dígitos (Máximo de 5 Tentativas + Rate Limit):**
   - Como um código de 6 dígitos possui 1 milhão de combinações, cada código emitido permite no máximo **5 tentativas de verificação**. Na 5ª tentativa incorreta, o código é deletado do banco na hora, exigindo que o usuário solicite o reenvio.
   - Adicionalmente, aplicamos `recordRateLimitAttempt` (já existente em `src/server/customer-auth/rate-limit.ts`) por IP e por identificador nos endpoints de solicitação, verificação e redefinição.
5. **Token Efêmero de Passagem da Etapa 2 para a Etapa 3 (`resetToken`):**
   - A Etapa 3 (`Salvar nova senha`) não confia apenas no estado do navegador: quando o código de 6 dígitos é validado na Etapa 2, o servidor consome o código OTP e devolve um `resetToken` aleatório de 32 bytes (`base64url`), cujo hash SHA-256 fica salvo na tabela `verification` por 10 minutos. A Etapa 3 exige esse `resetToken` de uso único para gravar a nova senha.

### 1.2 Recomendados de Cibersegurança (Incluídos)
1. **Revogação de Sessões Antigas e Não-Login Automático:**
   - Ao definir a nova senha definitiva (`UPDATE account SET password = ?`), todas as sessões anteriores do usuário (`DELETE FROM session WHERE userId = ?`) são encerradas no banco.
   - Nenhuma sessão nova é criada no reset: o usuário é redirecionado para `/acesso?auth=password-reset` para fazer login manualmente com seu CPF e sua nova senha.
2. **Comparação em Tempo Constante (`timingSafeEqual`) e Proteção de Origem (`hasTrustedOrigin`):**
   - A verificação do hash do código usa `crypto.timingSafeEqual` e todas as rotas `POST` verificam `hasTrustedOrigin(request)` e `readJsonBody(request)` (limite de 16 KiB).

---

## 2. Arquitetura de Envio de E-mail via Hostinger SMTP

O projeto utiliza o SMTP da **Hostinger** (`smtp.hostinger.com`).
No banco de dados (`database/migrations/008_create_system_settings_and_email_templates.sql`), já existe a tabela `system_smtp_settings` (gerenciada em `/admin/sistema`), que armazena `host`, `port`, `security` (`ssl` | `starttls` | `none`), `username`, `password_ciphertext` (criptografado em AES-256-GCM) e `from_email`/`from_name`.

Para que o envio funcione tanto via variáveis de ambiente (`SMTP_*` no `.env.local` / Docker) quanto via configuração salva no painel Admin (`system_smtp_settings`), sem instalar bibliotecas externas no `package.json`:
- Criaremos `src/server/customer-auth/smtp-mailer.ts` usando os módulos nativos `node:tls` e `node:net` do Node.js.
- **Ordem de resolução das credenciais SMTP:**
  1. Se `process.env.SMTP_USER` e `process.env.SMTP_PASS` estiverem definidos no ambiente, usa as variáveis `SMTP_HOST` (default `'smtp.hostinger.com'`), `SMTP_PORT` (default `465`), `SMTP_SECURITY` (default `'ssl'`), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` (default igual a `SMTP_USER`) e `SMTP_FROM_NAME` (default `'The Wine Experience'`).
  2. Caso contrário, lê a linha `id = 1` da tabela `system_smtp_settings` no MySQL e descriptografa `password_ciphertext` usando a mesma chave `SYSTEM_CONFIG_ENCRYPTION_KEY || ADMIN_SESSION_SECRET` já utilizada em `MysqlSystemRepository`.

### Variáveis opcionais para `.env.example` (Documentação)
Adicionar ao final de `next-app/.env.example` (não alterar `.env.local` do usuário):
```env
# Hostinger SMTP (opcional se já configurado na tabela system_smtp_settings pelo painel Admin)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURITY=ssl
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME="The Wine Experience"
```

---

## 3. Passo a Passo de Implementação (Arquivos e Código Exato)

---

### Passo 1: Criar o Domínio Puro de Recuperação de Senha
**Arquivo a criar:** `next-app/src/modules/customer-auth/domain/password-recovery.ts`

```typescript
import { z } from 'zod';
import { isValidCpf, sanitizeCpfInput } from './cpf';
import { normalizeRecoveryEmail } from './customer-auth-schema';

export const RECOVERY_PREFILL_STORAGE_KEY = 'thewine:recovery-identifier-prefill';
export const RECOVERY_CODE_TTL_SECONDS = 600;
export const RECOVERY_CODE_LENGTH = 6;

export type ParsedRecoveryIdentifier =
  | { ok: true; kind: 'email' | 'cpf'; normalizedValue: string }
  | { ok: false; message: string };

export type PasswordChecklistState = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
};

const emailValidator = z.string().max(254).pipe(z.email());

export function parseRecoveryIdentifier(raw: string): ParsedRecoveryIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Digite seu e-mail ou CPF.' };
  }
  if (trimmed.includes('@')) {
    return parseEmailIdentifier(trimmed);
  }
  return parseCpfIdentifier(trimmed);
}

function parseEmailIdentifier(trimmed: string): ParsedRecoveryIdentifier {
  const normalized = normalizeRecoveryEmail(trimmed);
  const parsed = emailValidator.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, message: 'Informe um endereço de e-mail válido.' };
  }
  return { ok: true, kind: 'email', normalizedValue: parsed.data };
}

function parseCpfIdentifier(trimmed: string): ParsedRecoveryIdentifier {
  const digits = sanitizeCpfInput(trimmed);
  if (!isValidCpf(digits)) {
    return { ok: false, message: 'Confira os 11 números do CPF ou digite um e-mail válido.' };
  }
  return { ok: true, kind: 'cpf', normalizedValue: digits };
}

export function evaluateRecoveryPasswordRules(password: string): PasswordChecklistState {
  const chars = Array.from(password);
  return {
    minLength: chars.length >= 8 && chars.length <= 128,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function isRecoveryPasswordValid(password: string): boolean {
  if (password.trim().length === 0) return false;
  const rules = evaluateRecoveryPasswordRules(password);
  return rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber;
}

export const requestRecoveryCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Digite seu e-mail ou CPF.').max(254),
});

export const verifyRecoveryCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Identificador ausente.').max(254),
  code: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do código enviado ao seu e-mail.'),
});

export const resetRecoveredPasswordSchema = z.object({
  resetToken: z.string().trim().min(32, 'Sessão de redefinição inválida.').max(256),
  newPassword: z.string().max(128, 'A senha deve ter até 128 caracteres.'),
  confirmPassword: z.string().max(128),
});
```

---

### Passo 2: Criar o Cliente SMTP Nativo (Hostinger / `system_smtp_settings`)
**Arquivo a criar:** `next-app/src/server/customer-auth/smtp-mailer.ts`

```typescript
import 'server-only';
import { createDecipheriv, createHash } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';

export type SmtpConnectionConfig = {
  host: string;
  port: number;
  security: 'ssl' | 'starttls' | 'none';
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

type SmtpDbRow = RowDataPacket & {
  enabled: number;
  host: string;
  port: number;
  security: 'ssl' | 'starttls' | 'none';
  username: string;
  passwordCiphertext: string | null;
  fromEmail: string;
  fromName: string;
};

function getSystemEncryptionKey(): Buffer {
  const secret = process.env.SYSTEM_CONFIG_ENCRYPTION_KEY?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error('System configuration encryption key is not configured');
  return createHash('sha256').update(secret).digest();
}

function decryptStoredSmtpPassword(ciphertext: string): string {
  const parts = ciphertext.split('.');
  if (parts.length !== 3) throw new Error('Invalid SMTP password ciphertext');
  const iv = Buffer.from(parts[0], 'base64url');
  const tag = Buffer.from(parts[1], 'base64url');
  const encrypted = Buffer.from(parts[2], 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', getSystemEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function parseSmtpSecurity(raw: string): 'ssl' | 'starttls' | 'none' {
  const normalized = raw.toLowerCase();
  if (normalized === 'starttls' || normalized === 'none') return normalized;
  return 'ssl';
}

function resolveEnvSmtpConfig(): SmtpConnectionConfig | null {
  const username = envOrDefault('SMTP_USER', '');
  const password = envOrDefault('SMTP_PASS', '');
  if (!username || !password) return null;
  const port = Number(envOrDefault('SMTP_PORT', '465'));
  return {
    host: envOrDefault('SMTP_HOST', 'smtp.hostinger.com'),
    port: port > 0 ? port : 465,
    security: parseSmtpSecurity(envOrDefault('SMTP_SECURITY', 'ssl')),
    username,
    password,
    fromEmail: envOrDefault('SMTP_FROM_EMAIL', username),
    fromName: envOrDefault('SMTP_FROM_NAME', 'The Wine Experience'),
  };
}

export async function loadActiveSmtpConfig(): Promise<SmtpConnectionConfig> {
  const envConfig = resolveEnvSmtpConfig();
  if (envConfig) return envConfig;

  const [rows] = await getDatabasePool().execute<SmtpDbRow[]>(
    `SELECT enabled, host, port, security, username,
            password_ciphertext AS passwordCiphertext,
            from_email AS fromEmail, from_name AS fromName
     FROM system_smtp_settings WHERE id = 1 LIMIT 1`,
  );
  const row = rows[0];
  if (!row || !row.enabled || !row.host || !row.passwordCiphertext) {
    throw new Error('SMTP configuration is not enabled or incomplete');
  }
  return {
    host: row.host.trim(),
    port: Number(row.port) || 465,
    security: row.security,
    username: row.username.trim(),
    password: decryptStoredSmtpPassword(row.passwordCiphertext),
    fromEmail: row.fromEmail.trim() || row.username.trim(),
    fromName: row.fromName.trim() || 'The Wine Experience',
  };
}

type SmtpSocket = net.Socket | tls.TLSSocket;

function createLineReader(socket: SmtpSocket) {
  let buffer = '';
  const pending: Array<{ resolve: (line: string) => void; reject: (err: Error) => void }> = [];

  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    drainResponseBuffer();
  });
  socket.on('error', (err: Error) => {
    while (pending.length > 0) pending.shift()?.reject(err);
  });

  function drainResponseBuffer() {
    while (pending.length > 0) {
      const match = buffer.match(/^(?:(?:\d{3}-.*\r?\n)*\d{3} .*\r?\n)/);
      if (!match) return;
      const fullResponse = match[0];
      buffer = buffer.slice(fullResponse.length);
      pending.shift()?.resolve(fullResponse.trim());
    }
  }

  return () => new Promise<string>((resolve, reject) => {
    pending.push({ resolve, reject });
    drainResponseBuffer();
  });
}

async function sendCommand(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  command: string,
  expectedPrefix: string,
): Promise<void> {
  socket.write(`${command}\r\n`);
  const response = await readResponse();
  if (!response.startsWith(expectedPrefix)) {
    throw new Error(`SMTP error on ${command.split(' ')[0]}: ${response.slice(0, 80)}`);
  }
}

async function openInitialSocket(config: SmtpConnectionConfig): Promise<SmtpSocket> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    const socket = config.security === 'ssl'
      ? tls.connect({ host: config.host, port: config.port, servername: config.host }, () => {
        socket.removeListener('error', onError);
        resolve(socket);
      })
      : net.connect({ host: config.host, port: config.port }, () => {
        socket.removeListener('error', onError);
        resolve(socket);
      });
    socket.setTimeout(12_000, () => socket.destroy(new Error('SMTP connection timeout')));
    socket.once('error', onError);
  });
}

async function upgradeToTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once('error', reject);
  });
}

export async function sendSmtpMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const config = await loadActiveSmtpConfig();
  let socket = await openInitialSocket(config);
  let readResponse = createLineReader(socket);

  try {
    const greeting = await readResponse();
    if (!greeting.startsWith('220')) throw new Error('Invalid SMTP greeting');
    await sendCommand(socket, readResponse, 'EHLO thewineexperience.com.br', '250');

    if (config.security === 'starttls') {
      await sendCommand(socket, readResponse, 'STARTTLS', '220');
      socket = await upgradeToTls(socket, config.host);
      readResponse = createLineReader(socket);
      await sendCommand(socket, readResponse, 'EHLO thewineexperience.com.br', '250');
    }

    await authenticateSmtp(socket, readResponse, config);
    await transmitMessage(socket, readResponse, config, input);
    socket.write('QUIT\r\n');
  } finally {
    socket.destroy();
  }
}

async function authenticateSmtp(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  config: SmtpConnectionConfig,
): Promise<void> {
  await sendCommand(socket, readResponse, 'AUTH LOGIN', '334');
  await sendCommand(socket, readResponse, Buffer.from(config.username, 'utf8').toString('base64'), '334');
  await sendCommand(socket, readResponse, Buffer.from(config.password, 'utf8').toString('base64'), '235');
}

async function transmitMessage(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  config: SmtpConnectionConfig,
  input: { to: string; subject: string; text: string; html: string },
): Promise<void> {
  const fromAddress = sanitizeHeaderAddress(config.fromEmail);
  const toAddress = sanitizeHeaderAddress(input.to);
  await sendCommand(socket, readResponse, `MAIL FROM:<${fromAddress}>`, '250');
  await sendCommand(socket, readResponse, `RCPT TO:<${toAddress}>`, '250');
  await sendCommand(socket, readResponse, 'DATA', '354');
  const mime = buildMimePayload(config, toAddress, input.subject, input.text, input.html);
  await sendCommand(socket, readResponse, `${mime}\r\n.`, '250');
}

function sanitizeHeaderAddress(value: string): string {
  return value.replace(/[\r\n<>]/g, '').trim();
}

function buildMimePayload(
  config: SmtpConnectionConfig,
  toAddress: string,
  subject: string,
  text: string,
  html: string,
): string {
  const boundary = 'thewine_recovery_boundary_v1';
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const safeFromName = config.fromName.replace(/[\r\n"]/g, '').trim();
  return [
    `From: "${safeFromName}" <${sanitizeHeaderAddress(config.fromEmail)}>`,
    `To: <${toAddress}>`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
    `--${boundary}--`,
  ].join('\r\n');
}
```

---

### Passo 3: Criar o Serviço e Repositório de Recuperação de Senha
**Arquivo a criar:** `next-app/src/server/customer-auth/password-recovery.ts`

```typescript
import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { RowDataPacket } from 'mysql2';
import {
  isRecoveryPasswordValid,
  parseRecoveryIdentifier,
  RECOVERY_CODE_TTL_SECONDS,
  requestRecoveryCodeSchema,
  resetRecoveredPasswordSchema,
  verifyRecoveryCodeSchema,
} from '@/modules/customer-auth/domain/password-recovery';
import { getDatabasePool } from '@/server/db';
import { hashCustomerCpf } from './crypto';
import { CustomerAuthError } from './errors';
import { sendSmtpMail } from './smtp-mailer';

const MAX_CODE_VERIFY_ATTEMPTS = 5;

type UserRecoveryRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
};

type VerificationRow = RowDataPacket & {
  id: string;
  identifier: string;
  value: string;
  isExpired: number;
};

type StoredOtpValue = {
  codeHash: string;
  attempts: number;
};

function recoverySecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() || process.env.CUSTOMER_CPF_LOOKUP_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error('Recovery secret must contain at least 32 characters');
  return secret;
}

export function hashRecoveryOtp(userId: string, code: string): string {
  return createHmac('sha256', recoverySecret()).update(`otp:${userId}:${code}`).digest('hex');
}

export function hashRecoveryResetToken(rawToken: string): string {
  return createHash('sha256').update(`reset:${rawToken}`).digest('hex');
}

export function generateSixDigitRecoveryCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function findUserByRecoveryIdentifier(
  kind: 'email' | 'cpf',
  normalizedValue: string,
): Promise<UserRecoveryRow | null> {
  const pool = getDatabasePool();
  const query = kind === 'cpf'
    ? 'SELECT id, name, email FROM `user` WHERE cpf_lookup_hash = ? LIMIT 1'
    : 'SELECT id, name, email FROM `user` WHERE email = ? LIMIT 1';
  const param = kind === 'cpf' ? hashCustomerCpf(normalizedValue) : normalizedValue;
  const [rows] = await pool.execute<UserRecoveryRow[]>(query, [param]);
  return rows[0] ?? null;
}

async function saveUserRecoveryOtp(userId: string, code: string): Promise<void> {
  const pool = getDatabasePool();
  const identifier = `pwd-otp:${userId}`;
  const payload: StoredOtpValue = { codeHash: hashRecoveryOtp(userId, code), attempts: 0 };
  await pool.execute('DELETE FROM verification WHERE identifier = ?', [identifier]);
  await pool.execute(
    `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
     VALUES (UUID(), ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [identifier, JSON.stringify(payload)],
  );
}

export async function requestPasswordRecoveryCode(body: unknown): Promise<{
  status: 'code_sent';
  expiresInSeconds: number;
}> {
  const parsed = requestRecoveryCodeSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Digite seu e-mail ou CPF.', 400, 'INVALID_IDENTIFIER');
  }
  const identifier = parseRecoveryIdentifier(parsed.data.identifier);
  if (!identifier.ok) {
    throw new CustomerAuthError(identifier.message, 400, 'INVALID_IDENTIFIER');
  }

  const user = await findUserByRecoveryIdentifier(identifier.kind, identifier.normalizedValue);
  if (!user) {
    return { status: 'code_sent', expiresInSeconds: RECOVERY_CODE_TTL_SECONDS };
  }

  const code = generateSixDigitRecoveryCode();
  await saveUserRecoveryOtp(user.id, code);
  await sendRecoveryCodeEmail(user.email, user.name, code);
  return { status: 'code_sent', expiresInSeconds: RECOVERY_CODE_TTL_SECONDS };
}

async function sendRecoveryCodeEmail(email: string, name: string, code: string): Promise<void> {
  const firstName = name.trim().split(/\s+/)[0] || 'Cliente';
  const subject = `${code} é o seu código de recuperação — The Wine Experience`;
  const text = [
    `Olá, ${firstName}!`,
    '',
    `Seu código de verificação para redefinir sua senha no The Wine Experience é: ${code}`,
    '',
    'Atenção: este código expira em 10 minutos.',
    'Se você não solicitou a recuperação de senha, basta ignorar este e-mail.',
  ].join('\n');
  const html = [
    '<div style="background:#050505;color:#f7f4ef;font-family:Arial,sans-serif;padding:36px 24px;max-width:520px;margin:0 auto;border:1px solid #d3b97b;border-radius:12px;">',
    '<p style="color:#e5c06a;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;margin:0 0 12px;">The Wine Experience</p>',
    `<h1 style="font-size:26px;font-weight:400;margin:0 0 16px;color:#f7f4ef;">Olá, ${escapeHtml(firstName)}</h1>`,
    '<p style="color:#e2e0dc;font-size:15px;line-height:1.6;margin:0 0 24px;">Use o código de verificação abaixo para redefinir a senha da sua conta:</p>',
    `<div style="background:#110f0b;border:1px solid #e5c06a;border-radius:8px;padding:18px;text-align:center;font-size:32px;letter-spacing:0.32em;font-weight:700;color:#f3ca69;margin:0 0 24px;">${code}</div>`,
    '<p style="color:#b8c8d9;font-size:13px;line-height:1.5;margin:0;">Este código é válido por <strong>10 minutos</strong>. Se você não solicitou esta alteração, ignore este e-mail com segurança.</p>',
    '</div>',
  ].join('');
  await sendSmtpMail({ to: email, subject, text, html });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] ?? char));
}

export async function verifyPasswordRecoveryCode(body: unknown): Promise<{
  status: 'verified';
  resetToken: string;
}> {
  const parsed = verifyRecoveryCodeSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Digite os 6 números do código enviado ao seu e-mail.', 400, 'INVALID_CODE_FORMAT');
  }
  const identifier = parseRecoveryIdentifier(parsed.data.identifier);
  if (!identifier.ok) {
    throw new CustomerAuthError(identifier.message, 400, 'INVALID_IDENTIFIER');
  }

  const user = await findUserByRecoveryIdentifier(identifier.kind, identifier.normalizedValue);
  if (!user) throw invalidOrExpiredCodeError();

  return verifyUserOtpAndIssueResetToken(user.id, parsed.data.code);
}

async function verifyUserOtpAndIssueResetToken(userId: string, code: string): Promise<{
  status: 'verified';
  resetToken: string;
}> {
  const pool = getDatabasePool();
  const otpIdentifier = `pwd-otp:${userId}`;
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT id, identifier, value, expiresAt <= UTC_TIMESTAMP() AS isExpired
     FROM verification WHERE identifier = ? LIMIT 1`,
    [otpIdentifier],
  );
  const row = rows[0];
  if (!row || Boolean(row.isExpired)) {
    if (row) await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
    throw expiredCodeError();
  }

  const stored = parseStoredOtpValue(row.value);
  const expectedHash = hashRecoveryOtp(userId, code);
  if (!hashesMatch(stored.codeHash, expectedHash)) {
    await handleFailedOtpAttempt(row.id, stored);
  }

  await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
  const resetToken = randomBytes(32).toString('base64url');
  const resetIdentifier = `pwd-reset:${hashRecoveryResetToken(resetToken)}`;
  await pool.execute(
    `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
     VALUES (UUID(), ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [resetIdentifier, userId],
  );
  return { status: 'verified', resetToken };
}

function parseStoredOtpValue(raw: string): StoredOtpValue {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredOtpValue>;
    return {
      codeHash: typeof parsed.codeHash === 'string' ? parsed.codeHash : '',
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
    };
  } catch {
    return { codeHash: '', attempts: MAX_CODE_VERIFY_ATTEMPTS };
  }
}

function hashesMatch(hashA: string, hashB: string): boolean {
  if (hashA.length !== hashB.length || hashA.length === 0) return false;
  return timingSafeEqual(Buffer.from(hashA, 'utf8'), Buffer.from(hashB, 'utf8'));
}

async function handleFailedOtpAttempt(verificationId: string, stored: StoredOtpValue): Promise<never> {
  const pool = getDatabasePool();
  const nextAttempts = stored.attempts + 1;
  if (nextAttempts >= MAX_CODE_VERIFY_ATTEMPTS) {
    await pool.execute('DELETE FROM verification WHERE id = ?', [verificationId]);
    throw new CustomerAuthError(
      'Número máximo de tentativas excedido. Clique em "Reenviar código" para receber um novo código.',
      400,
      'CODE_MAX_ATTEMPTS',
    );
  }
  await pool.execute(
    'UPDATE verification SET value = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
    [JSON.stringify({ codeHash: stored.codeHash, attempts: nextAttempts }), verificationId],
  );
  throw invalidOrExpiredCodeError();
}

function invalidOrExpiredCodeError(): CustomerAuthError {
  return new CustomerAuthError(
    'Código inválido. Confira os 6 dígitos enviados ao seu e-mail.',
    400,
    'INVALID_RECOVERY_CODE',
  );
}

function expiredCodeError(): CustomerAuthError {
  return new CustomerAuthError(
    'Este código expirou (validade de 10 minutos). Clique em "Reenviar código" para receber um novo.',
    400,
    'RECOVERY_CODE_EXPIRED',
  );
}

export async function resetCustomerPassword(body: unknown): Promise<{ status: 'password_reset' }> {
  const parsed = resetRecoveredPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Confira os campos da nova senha.', 400, 'INVALID_PASSWORD_RESET');
  }
  const { resetToken, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    throw new CustomerAuthError('As senhas digitadas não coincidem.', 400, 'PASSWORD_MISMATCH');
  }
  if (!isRecoveryPasswordValid(newPassword)) {
    throw new CustomerAuthError(
      'A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.',
      400,
      'WEAK_PASSWORD',
    );
  }

  const resetRow = await findValidResetTokenRow(resetToken);
  const passwordHash = await hashPassword(newPassword);
  await persistNewPasswordAndRevokeSessions(resetRow.value, resetRow.id, passwordHash);
  return { status: 'password_reset' };
}

async function findValidResetTokenRow(resetToken: string): Promise<VerificationRow> {
  const pool = getDatabasePool();
  const resetIdentifier = `pwd-reset:${hashRecoveryResetToken(resetToken)}`;
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT id, identifier, value, expiresAt <= UTC_TIMESTAMP() AS isExpired
     FROM verification WHERE identifier = ? LIMIT 1`,
    [resetIdentifier],
  );
  const row = rows[0];
  if (!row || Boolean(row.isExpired)) {
    if (row) await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
    throw new CustomerAuthError(
      'O tempo para redefinir a senha expirou. Solicite um novo código.',
      400,
      'RESET_TOKEN_EXPIRED',
    );
  }
  return row;
}

async function persistNewPasswordAndRevokeSessions(
  userId: string,
  verificationId: string,
  passwordHash: string,
): Promise<void> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE account
       SET password = ?, updatedAt = UTC_TIMESTAMP()
       WHERE userId = ? AND providerId = 'credential'`,
      [passwordHash, userId],
    );
    await connection.execute('DELETE FROM verification WHERE id = ?', [verificationId]);
    await connection.execute('DELETE FROM session WHERE userId = ?', [userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

---

### Passo 4: Criar as 3 Rotas de API de Recuperação de Senha

#### 4.1 Rota 1: Solicitar / Reenviar Código
**Arquivo a criar:** `next-app/src/app/api/customer-auth/password-recovery/request/route.ts`

```typescript
import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { requestPasswordRecoveryCode } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Digite seu e-mail ou CPF.' }, 400);
  }

  const ip = getClientIpBucket(request);
  const rawId = String((body as { identifier?: unknown }).identifier ?? '').trim().toLowerCase().slice(0, 120);
  try {
    await recordRateLimitAttempt('recovery-request-ip', ip, 10, 15 * 60_000);
    if (rawId) await recordRateLimitAttempt('recovery-request-id', rawId, 5, 10 * 60_000);
    const result = await requestPasswordRecoveryCode(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível enviar o código agora. Tente novamente em instantes.' }, 503);
  }
}
```

#### 4.2 Rota 2: Verificar Código de 6 Dígitos
**Arquivo a criar:** `next-app/src/app/api/customer-auth/password-recovery/verify/route.ts`

```typescript
import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { verifyPasswordRecoveryCode } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Digite o código de 6 dígitos.' }, 400);
  }

  const ip = getClientIpBucket(request);
  const rawId = String((body as { identifier?: unknown }).identifier ?? '').trim().toLowerCase().slice(0, 120);
  try {
    await recordRateLimitAttempt('recovery-verify-ip', ip, 15, 15 * 60_000);
    if (rawId) await recordRateLimitAttempt('recovery-verify-id', rawId, 8, 10 * 60_000);
    const result = await verifyPasswordRecoveryCode(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível verificar o código agora. Tente novamente.' }, 503);
  }
}
```

#### 4.3 Rota 3: Salvar Nova Senha Definitiva
**Arquivo a criar:** `next-app/src/app/api/customer-auth/password-recovery/reset/route.ts`

```typescript
import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { resetCustomerPassword } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Confira os dados da nova senha.' }, 400);
  }

  const ip = getClientIpBucket(request);
  try {
    await recordRateLimitAttempt('recovery-reset-ip', ip, 10, 15 * 60_000);
    const result = await resetCustomerPassword(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível salvar sua nova senha agora. Tente novamente.' }, 503);
  }
}
```

---

### Passo 5: Adicionar Chamadas de Recuperação ao Cliente HTTP (`customer-auth-client.ts`)
**Arquivo a editar:** `next-app/src/lib/customer-auth-client.ts`

Adicionar ao final do arquivo `next-app/src/lib/customer-auth-client.ts` as 3 funções abaixo:

```typescript
export async function requestPasswordRecovery(identifier: string): Promise<{ status: 'code_sent'; expiresInSeconds: number }> {
  const response = await fetch('/api/customer-auth/password-recovery/request', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload & { status?: 'code_sent'; expiresInSeconds?: number };
  if (!response.ok) throw Object.assign(new Error(payload.message ?? 'Não foi possível enviar o código.'), { code: payload.error });
  return { status: 'code_sent', expiresInSeconds: payload.expiresInSeconds ?? 600 };
}

export async function verifyPasswordRecovery(identifier: string, code: string): Promise<{ status: 'verified'; resetToken: string }> {
  const response = await fetch('/api/customer-auth/password-recovery/verify', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, code }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload & { resetToken?: string };
  if (!response.ok || typeof payload.resetToken !== 'string') {
    throw Object.assign(new Error(payload.message ?? 'Código inválido ou expirado.'), { code: payload.error });
  }
  return { status: 'verified', resetToken: payload.resetToken };
}

export async function resetCustomerPasswordRequest(
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ status: 'password_reset' }> {
  const response = await fetch('/api/customer-auth/password-recovery/reset', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload;
  if (!response.ok) throw Object.assign(new Error(payload.message ?? 'Não foi possível salvar a nova senha.'), { code: payload.error });
  return { status: 'password_reset' };
}
```

---

### Passo 6: Conectar o Campo CPF de `/acesso` ao Link `"Esqueci minha senha"` e Receber o Redirecionamento Pós-Reset

1. **Em `next-app/src/components/account/auth/CustomerLoginForm.tsx`:**
   - Importar `Link` de `'next/link'` e `RECOVERY_PREFILL_STORAGE_KEY` de `'@/modules/customer-auth/domain/password-recovery'`.
   - Adicionar a função auxiliar `persistCpfPrefillForRecovery(cpf: string)`:
     ```typescript
     function persistCpfPrefillForRecovery(cpf: string) {
       try {
         if (cpf.trim()) {
           window.sessionStorage.setItem(RECOVERY_PREFILL_STORAGE_KEY, cpf.trim());
         } else {
           window.sessionStorage.removeItem(RECOVERY_PREFILL_STORAGE_KEY);
         }
       } catch {
         // Ignorar bloqueio de storage do navegador
       }
     }
     ```
   - No `CustomerLoginForm` (onde hoje está `<a className={styles.textLink} href="/recuperar-senha">Esqueci minha senha</a>`), substituir por:
     ```tsx
     <Link
       className={styles.textLink}
       href="/recuperar-senha"
       onClick={() => persistCpfPrefillForRecovery(cpf)}
     >
       Esqueci minha senha
     </Link>
     ```
   - Aceitar a prop opcional `notice?: string` em `CustomerLoginForm`:
     ```tsx
     export function CustomerLoginForm({
       onSuccess,
       onModeChange,
       notice,
     }: {
       onSuccess: (user: AuthUser) => Promise<void>;
       onModeChange: () => void;
       notice?: string;
     })
     ```
     E logo acima de `{error && <div className={styles.formError} role="alert">{error}</div>}`, renderizar (quando `notice` existir e `!error`):
     ```tsx
     {notice && !error && <div className={styles.formSuccess} role="status">{notice}</div>}
     ```
   - Adicionar em `next-app/src/components/account/auth/CustomerAccess.module.css` (após `.formError`):
     ```css
     .formSuccess { margin-bottom: 18px; padding: 11px 13px; border: 1px solid rgb(229 192 106 / 60%); border-radius: 6px; background: rgb(229 192 106 / 14%); color: #f3eee6; font-size: 14px; }
     ```
2. **Em `next-app/src/app/acesso/page.tsx` e `next-app/src/components/account/auth/CustomerAccessScreen.tsx`:**
   - Em `src/app/acesso/page.tsx`, permitir `auth === 'password-reset'` em `reason`:
     ```typescript
     const reason = auth === 'expired' || auth === 'changed' || auth === 'password-reset' ? auth : undefined;
     ```
   - Em `CustomerAccessScreen.tsx`, atualizar o tipo `reason?: 'expired' | 'changed' | 'password-reset'` e passar `notice={reason === 'password-reset' ? 'Senha redefinida com sucesso. Digite seu CPF e sua nova senha para entrar.' : undefined}` para `<CustomerLoginForm />`.

---

### Passo 7: Criar o CSS e os Componentes das 3 Etapas em `/recuperar-senha`

#### 7.1 Arquivo de Estilo (`PasswordRecovery.module.css`)
**Arquivo a criar:** `next-app/src/components/account/auth/recovery/PasswordRecovery.module.css`

```css
.page {
  min-height: 100svh;
  padding-top: 90px;
  color: #f8f3e9;
  background: radial-gradient(circle at 50% 24%, rgb(138 102 38 / 12%) 0%, rgb(5 5 5 / 96%) 54%, #050505 100%);
  font-family: var(--font-body, 'Albert Sans', sans-serif);
}

.page :global(.header) { height: 90px; }
.page :global(.header-container) { max-width: none; padding-inline: 80px; }
.page :global(.header-logo) { width: 185px; }
.page :global(.nav-menu) { gap: 2rem; }

.main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100svh - 90px);
  padding: 48px 20px 72px;
}

.container {
  width: min(100%, 500px);
  margin-inline: auto;
}

.backButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 0;
  color: #e5c06a;
  background: none;
  border: 0;
  cursor: pointer;
  font: 500 15px var(--font-body, sans-serif);
  transition: opacity 0.15s ease;
}

.backButton:hover { opacity: 0.82; }

.headerBlock {
  text-align: center;
  margin-bottom: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #e5c06a;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.title {
  margin: 0 0 14px;
  color: #f7f4ef;
  font-family: var(--font-display, 'Cormorant Garamond', serif);
  font-size: clamp(40px, 4.2vw, 54px);
  font-weight: 400;
  line-height: 1.02;
}

.subtitle {
  max-width: 420px;
  margin: 0 auto;
  color: #c8ced7;
  font-size: 15px;
  line-height: 1.55;
}

.expiryBadge {
  margin: 10px auto 0;
  color: #e5c06a;
  font-size: 13px;
  line-height: 1.4;
}

.card {
  padding: 30px 32px;
  background: rgb(12 11 9 / 90%);
  border: 1px solid rgb(229 192 106 / 42%);
  border-radius: 14px;
  box-shadow: 0 24px 64px rgb(0 0 0 / 65%);
}

.alertError {
  margin-bottom: 18px;
  padding: 11px 13px;
  border: 1px solid rgb(233 135 127 / 55%);
  border-radius: 8px;
  background: rgb(120 30 26 / 28%);
  color: #f2a29a;
  font-size: 13.5px;
  line-height: 1.4;
}

.alertInfo {
  margin-bottom: 18px;
  padding: 11px 13px;
  border: 1px solid rgb(229 192 106 / 50%);
  border-radius: 8px;
  background: rgb(229 192 106 / 12%);
  color: #f3eee6;
  font-size: 13.5px;
  line-height: 1.4;
}

.fieldGroup {
  margin-bottom: 20px;
}

.labelRow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.label {
  display: block;
  margin-bottom: 9px;
  color: #e5c06a;
  font-size: 14px;
  font-weight: 600;
}

.labelRow .label {
  margin-bottom: 0;
}

.resendBox {
  text-align: right;
  font-size: 12px;
  line-height: 1.35;
}

.resendPrompt {
  display: block;
  color: #9aa2af;
}

.resendButton {
  padding: 0;
  color: #e5c06a;
  background: none;
  border: 0;
  cursor: pointer;
  font: 600 12.5px var(--font-body, sans-serif);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.resendButton:disabled {
  color: #7b7f87;
  cursor: not-allowed;
  text-decoration: none;
}

.inputControl {
  display: flex;
  align-items: center;
  min-height: 52px;
  background: rgb(255 255 255 / 3%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 8px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.inputControl:focus-within {
  border-color: #e5c06a;
  box-shadow: 0 0 0 2px rgb(229 192 106 / 25%);
}

.inputIcon {
  display: inline-flex;
  margin-left: 15px;
  color: #e5c06a;
  flex-shrink: 0;
}

.input {
  flex: 1;
  min-width: 0;
  height: 50px;
  padding: 0 14px;
  color: #fff;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 15px;
}

.input::placeholder {
  color: #7c7f87;
}

.input::selection {
  background: rgb(229 192 106 / 35%);
  color: #fff;
}

.passwordToggle {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  color: #9aa2af;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.passwordToggle:hover {
  color: #e5c06a;
}

.otpGrid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}

.otpInput {
  width: 100%;
  height: 62px;
  text-align: center;
  color: #f7f4ef;
  background: rgb(255 255 255 / 3%);
  border: 1px solid rgb(229 192 106 / 28%);
  border-radius: 8px;
  outline: 0;
  font: 600 22px var(--font-body, sans-serif);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.otpInput::placeholder {
  color: #6c6f78;
  font-weight: 400;
}

.otpInput:focus {
  border-color: #f3ca69;
  box-shadow: 0 0 0 2px rgb(243 202 105 / 32%);
}

.checklist {
  list-style: none;
  margin: 12px 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.checklistItem {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #8e95a2;
  font-size: 13px;
  transition: color 0.15s ease;
}

.checklistItemMet {
  color: #e5c06a;
}

.checkBullet {
  display: inline-flex;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1.5px solid currentColor;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checklistItemMet .checkBullet {
  background: rgb(229 192 106 / 22%);
}

.submitButton {
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  align-items: center;
  width: 100%;
  min-height: 50px;
  margin-top: 22px;
  padding: 0 18px;
  color: #15110a;
  background: linear-gradient(95deg, #8f7338 0%, #d8b66a 48%, #f3ca69 100%);
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font: 600 15px var(--font-body, sans-serif);
  text-align: center;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.submitButton:hover:not(:disabled) {
  filter: brightness(1.07);
}

.submitButton:disabled {
  cursor: wait;
  opacity: 0.65;
}

.divider {
  height: 1px;
  margin: 22px 0 18px;
  background: rgb(255 255 255 / 10%);
  border: 0;
}

.footerLinkWrap {
  text-align: center;
}

.footerLink {
  color: #e5c06a;
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 4px;
}

@media (max-width: 760px) {
  .page { padding-top: 76px; }
  .page :global(.header) { height: 76px; }
  .page :global(.header-container) { padding-inline: 24px; }
  .page :global(.header-logo) { width: 130px; }
  .card { padding: 24px 20px; }
  .otpInput { height: 54px; font-size: 19px; }
}
```

---

#### 7.2 Etapa 2: Componente de Código de 6 Dígitos (`RecoveryCodeStep.tsx`)
**Arquivo a criar:** `next-app/src/components/account/auth/recovery/RecoveryCodeStep.tsx`

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { RECOVERY_CODE_LENGTH } from '@/modules/customer-auth/domain/password-recovery';
import styles from './PasswordRecovery.module.css';

type Props = {
  pending: boolean;
  error: string;
  info: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
};

export function RecoveryCodeStep({ pending, error, info, onBack, onVerify, onResend }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(RECOVERY_CODE_LENGTH).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    const target = inputRefs.current[index];
    if (target) target.focus();
  }

  function handleDigitChange(index: number, rawValue: string) {
    const cleanDigit = rawValue.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleanDigit;
    setDigits(next);
    if (cleanDigit && index < RECOVERY_CODE_LENGTH - 1) {
      focusBox(index + 1);
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) focusBox(index - 1);
    if (event.key === 'ArrowRight' && index < RECOVERY_CODE_LENGTH - 1) focusBox(index + 1);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: RECOVERY_CODE_LENGTH }, (_, idx) => pasted[idx] ?? '');
    setDigits(next);
    focusBox(Math.min(pasted.length, RECOVERY_CODE_LENGTH - 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerify(digits.join(''));
  }

  async function handleResendClick() {
    setDigits(Array(RECOVERY_CODE_LENGTH).fill(''));
    await onResend();
    focusBox(0);
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backButton} onClick={onBack} disabled={pending}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </button>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Digite o código</h1>
        <p className={styles.subtitle}>
          Enviamos um código de verificação para o seu e-mail.<br />
          Digite o código abaixo para redefinir sua senha.
        </p>
        <p className={styles.expiryBadge}>
          O código expira em 10 minutos. Após esse prazo, clique em Reenviar código.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}
        {info && !error && <div className={styles.alertInfo} role="status">{info}</div>}

        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="recovery-otp-0">Código de verificação</label>
            <div className={styles.resendBox}>
              <span className={styles.resendPrompt}>Não recebeu o código?</span>
              <button
                type="button"
                className={styles.resendButton}
                onClick={() => void handleResendClick()}
                disabled={pending}
              >
                Reenviar código
              </button>
            </div>
          </div>

          <div className={styles.otpGrid}>
            {digits.map((digit, index) => (
              <input
                key={`otp-${index}`}
                id={`recovery-otp-${index}`}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                placeholder="—"
                aria-label={`Dígito ${index + 1} do código`}
                className={styles.otpInput}
                value={digit}
                disabled={pending}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Verificando…' : 'Verificar código'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <hr className={styles.divider} />
        <div className={styles.footerLinkWrap}>
          <Link href="/acesso" className={styles.footerLink}>Voltar para o login</Link>
        </div>
      </form>
    </div>
  );
}
```

---

#### 7.3 Etapa 3: Componente de Criação da Nova Senha (`RecoveryNewPasswordStep.tsx`)
**Arquivo a criar:** `next-app/src/components/account/auth/recovery/RecoveryNewPasswordStep.tsx`

```tsx
'use client';

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { evaluateRecoveryPasswordRules } from '@/modules/customer-auth/domain/password-recovery';
import styles from './PasswordRecovery.module.css';

type Props = {
  pending: boolean;
  error: string;
  onBack: () => void;
  onSubmitNewPassword: (newPassword: string, confirmPassword: string) => Promise<void>;
};

export function RecoveryNewPasswordStep({ pending, error, onBack, onSubmitNewPassword }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const rules = evaluateRecoveryPasswordRules(newPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitNewPassword(newPassword, confirmPassword);
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backButton} onClick={onBack} disabled={pending}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </button>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Crie uma nova senha</h1>
        <p className={styles.subtitle}>
          Digite sua nova senha abaixo para acessar sua conta.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}

        <div className={styles.fieldGroup}>
          <PasswordInputBox
            id="recovery-new-password"
            label="Nova senha"
            placeholder="Digite sua nova senha"
            value={newPassword}
            disabled={pending}
            onChange={setNewPassword}
          />
          <PasswordRulesChecklist rules={rules} />
        </div>

        <div className={styles.fieldGroup}>
          <PasswordInputBox
            id="recovery-confirm-password"
            label="Confirmar nova senha"
            placeholder="Digite novamente sua nova senha"
            value={confirmPassword}
            disabled={pending}
            onChange={setConfirmPassword}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Salvando…' : 'Salvar nova senha'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function PasswordInputBox({
  id,
  label,
  placeholder,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.inputControl}>
        <span className={styles.inputIcon} aria-hidden="true"><LockKeyhole size={18} /></span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={128}
          placeholder={placeholder}
          className={styles.input}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}

function PasswordRulesChecklist({
  rules,
}: {
  rules: { minLength: boolean; hasUppercase: boolean; hasLowercase: boolean; hasNumber: boolean };
}) {
  const items = [
    { label: 'Pelo menos 8 caracteres', met: rules.minLength },
    { label: 'Uma letra maiúscula', met: rules.hasUppercase },
    { label: 'Uma letra minúscula', met: rules.hasLowercase },
    { label: 'Um número', met: rules.hasNumber },
  ];
  return (
    <ul className={styles.checklist} aria-label="Requisitos da nova senha">
      {items.map((item) => (
        <li
          key={item.label}
          className={`${styles.checklistItem} ${item.met ? styles.checklistItemMet : ''}`}
        >
          <span className={styles.checkBullet} aria-hidden="true">
            {item.met && <Check size={10} strokeWidth={3} />}
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
```

---

#### 7.4 Componente Orquestrador das 3 Etapas (`PasswordRecoveryScreen.tsx`)
**Arquivo a criar:** `next-app/src/components/account/auth/recovery/PasswordRecoveryScreen.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import {
  requestPasswordRecovery,
  resetCustomerPasswordRequest,
  verifyPasswordRecovery,
} from '@/lib/customer-auth-client';
import {
  isRecoveryPasswordValid,
  parseRecoveryIdentifier,
  RECOVERY_PREFILL_STORAGE_KEY,
} from '@/modules/customer-auth/domain/password-recovery';
import { RecoveryCodeStep } from './RecoveryCodeStep';
import { RecoveryNewPasswordStep } from './RecoveryNewPasswordStep';
import styles from './PasswordRecovery.module.css';

type Step = 'request' | 'verify' | 'reset';

function readStoredRecoveryPrefill(): string {
  if (typeof window === 'undefined') return '';
  try {
    const prefilled = window.sessionStorage.getItem(RECOVERY_PREFILL_STORAGE_KEY);
    if (prefilled) {
      window.sessionStorage.removeItem(RECOVERY_PREFILL_STORAGE_KEY);
      return prefilled;
    }
  } catch {
    // Ignorar caso sessionStorage esteja indisponível
  }
  return '';
}

export function PasswordRecoveryScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(() => readStoredRecoveryPrefill());
  const [resetToken, setResetToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const submitLock = useRef(false);

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const parsed = parseRecoveryIdentifier(identifier);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordRecovery(identifier);
      setStep('verify');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o código.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleResendCode() {
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordRecovery(identifier);
      setInfo('Um novo código foi enviado para o seu e-mail (válido por 10 minutos).');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reenviar o código.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleVerifyCode(code: string) {
    if (submitLock.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Digite os 6 números do código de verificação.');
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      const result = await verifyPasswordRecovery(identifier, code);
      setResetToken(result.resetToken);
      setStep('reset');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Código inválido ou expirado.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleResetPassword(newPassword: string, confirmPassword: string) {
    if (submitLock.current) return;
    const validationError = validateNewPasswordClient(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    try {
      await resetCustomerPasswordRequest(resetToken, newPassword, confirmPassword);
      router.replace('/acesso?auth=password-reset');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a nova senha.');
      submitLock.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {step === 'request' && (
          <RequestCodeCard
            identifier={identifier}
            pending={pending}
            error={error}
            onIdentifierChange={setIdentifier}
            onSubmit={handleRequestCode}
          />
        )}
        {step === 'verify' && (
          <RecoveryCodeStep
            pending={pending}
            error={error}
            info={info}
            onBack={() => { setError(''); setInfo(''); setStep('request'); }}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
          />
        )}
        {step === 'reset' && (
          <RecoveryNewPasswordStep
            pending={pending}
            error={error}
            onBack={() => { setError(''); setInfo(''); setStep('verify'); }}
            onSubmitNewPassword={handleResetPassword}
          />
        )}
      </main>
      <SiteBehaviorController />
    </div>
  );
}

function validateNewPasswordClient(newPassword: string, confirmPassword: string): string {
  if (!isRecoveryPasswordValid(newPassword)) {
    return 'A nova senha deve atender a todos os 4 requisitos listados abaixo.';
  }
  if (newPassword !== confirmPassword) {
    return 'As senhas digitadas não coincidem.';
  }
  return '';
}

function RequestCodeCard({
  identifier,
  pending,
  error,
  onIdentifierChange,
  onSubmit,
}: {
  identifier: string;
  pending: boolean;
  error: string;
  onIdentifierChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Recuperar sua senha</h1>
        <p className={styles.subtitle}>
          Informe seu e-mail ou CPF para enviarmos um código de recuperação para o e-mail cadastrado.
        </p>
      </div>

      <form className={styles.card} onSubmit={onSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="recovery-identifier">E-mail ou CPF</label>
          <div className={styles.inputControl}>
            <span className={styles.inputIcon} aria-hidden="true"><Mail size={18} /></span>
            <input
              id="recovery-identifier"
              type="text"
              autoComplete="username"
              maxLength={254}
              placeholder="Digite seu e-mail ou CPF"
              className={styles.input}
              value={identifier}
              disabled={pending}
              onClick={(event) => event.currentTarget.select()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => onIdentifierChange(event.target.value)}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Enviando…' : 'Enviar código'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <hr className={styles.divider} />
        <div className={styles.footerLinkWrap}>
          <Link href="/acesso" className={styles.footerLink}>Voltar para o login</Link>
        </div>
      </form>
    </div>
  );
}
```

---

#### 7.5 Atualizar a Rota `/recuperar-senha` (`src/app/recuperar-senha/page.tsx`)
**Arquivo a substituir:** `next-app/src/app/recuperar-senha/page.tsx`

```tsx
import type { Metadata } from 'next';
import '../../../public/style.css';
import { PasswordRecoveryScreen } from '@/components/account/auth/recovery/PasswordRecoveryScreen';

export const metadata: Metadata = {
  title: 'Recuperar senha | The Wine Experience',
  description: 'Recupere o acesso à sua conta no The Wine Experience.',
  robots: { index: false, follow: false },
};

export default function RecoverPasswordPage() {
  return <PasswordRecoveryScreen />;
}
```

---

## 4. Testes Automatizados de Domínio (`next-app/tests/password-recovery.test.mjs`)

**Arquivo a criar:** `next-app/tests/password-recovery.test.mjs`

```javascript
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const ts = requireFromTest('typescript');
const moduleCache = new Map();

function loadTypeScript(relativePath) {
  const filename = isAbsolute(relativePath)
    ? relativePath
    : fileURLToPath(new URL(relativePath, import.meta.url));
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const loaded = { exports: {} };
  moduleCache.set(filename, loaded);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      let dependency = resolve(dirname(filename), specifier);
      if (!extname(dependency)) dependency += '.ts';
      return loadTypeScript(dependency);
    }
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('parseRecoveryIdentifier validates CPF (with or without mask) and email addresses', () => {
  const { parseRecoveryIdentifier } = loadTypeScript(
    '../src/modules/customer-auth/domain/password-recovery.ts',
  );

  assert.deepEqual(parseRecoveryIdentifier('529.982.247-25'), {
    ok: true,
    kind: 'cpf',
    normalizedValue: '52998224725',
  });
  assert.deepEqual(parseRecoveryIdentifier('  Cliente@TheWine.com.br '), {
    ok: true,
    kind: 'email',
    normalizedValue: 'cliente@thewine.com.br',
  });
  assert.equal(parseRecoveryIdentifier('').ok, false);
  assert.equal(parseRecoveryIdentifier('111.111.111-11').ok, false);
  assert.equal(parseRecoveryIdentifier('invalido@').ok, false);
});

test('evaluateRecoveryPasswordRules and isRecoveryPasswordValid enforce the 4 password rules', () => {
  const {
    evaluateRecoveryPasswordRules,
    isRecoveryPasswordValid,
  } = loadTypeScript('../src/modules/customer-auth/domain/password-recovery.ts');

  assert.deepEqual(evaluateRecoveryPasswordRules('Abc12345'), {
    minLength: true,
    hasUppercase: true,
    hasLowercase: true,
    hasNumber: true,
  });
  assert.equal(isRecoveryPasswordValid('Abc12345'), true);
  assert.equal(isRecoveryPasswordValid('Abc1234'), false);
  assert.equal(isRecoveryPasswordValid('abc12345'), false);
  assert.equal(isRecoveryPasswordValid('ABC12345'), false);
  assert.equal(isRecoveryPasswordValid('Abcdefgh'), false);
});
```

---

## 5. Checklist de Verificação Obrigatória para o Executor

Ao concluir a criação/edição dos arquivos acima, o modelo executor deve rodar dentro de `next-app/`:

```bash
npm run verify:complexity
npm run verify:architecture
npm run typecheck
npm run lint
```

Todos os 4 comandos devem terminar com **código de saída `0`** e sem nenhum warning.
