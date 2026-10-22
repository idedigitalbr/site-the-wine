# Spec de Implementação — Abas de Notificações (Hostinger SMTP + Checkbox de Cadastro) e Dados Bancários (Histórico de Transações das Reservas)

- **Data:** 21/10/2026
- **Autor da Arquitetura:** Argon
- **Executor Alvo:** Modelo de execução guiada (zero decisões autônomas; seguir estritamente os contratos, caminhos de arquivos e blocos de código definidos neste documento).
- **Diretório da Aplicação:** `next-app/`
- **Referências Visuais Canônicas:** `docs/superpowers/specs/assets/configuracoes-notificacoes-bancarios-2026-10-21/`
  1. `01-checkbox-cadastro-novidades.png` — Checkbox no cadastro (`/acesso` / `/cadastro`): *"Quero receber novidades e experiências do The Wine por e-mail. (opcional)"*.
  2. `02-notificacoes-checkbox-marcado.png` — Estado inicial da aba **Notificações** quando o usuário **marca** a checkbox no cadastro (todos os 4 switches ligados: *Confirmações de reserva*, *Lembretes de reserva*, *Novidades e eventos* e *Promoções*).
  3. `03-notificacoes-checkbox-desmarcado.png` — Estado inicial da aba **Notificações** quando o usuário **deixa desmarcada** a checkbox no cadastro (*Confirmações de reserva* e *Lembretes de reserva* ligados; *Novidades e eventos* e *Promoções* desligados).

---

## 0. Regras Inegociáveis para o Executor

1. **Zero Decisões Autônomas:** Todas as decisões de arquitetura, segurança, persistência no MySQL, integração SMTP com a Hostinger, simulação determinística de transações, debounce de API e componentes React já estão tomadas e escritas nesta spec. **Não** instale pacotes novos no `package.json` (isso quebraria `npm run verify:lockfile`), **não** crie migrations SQL novas (usaremos as tabelas já existentes `user`, `customers`, `verification`, `reservations`, `experiences`, `payments`, `notification_outbox`, `system_smtp_settings` e `system_email_templates`) e **não** invente variações de layout.
2. **Preservação do Repositório e Git:**
   - **NÃO** executar `git commit`, `git push`, `git reset`, `git checkout` ou criar PR sem instrução explícita do usuário.
   - **NÃO** alterar `.env` ou `.env.local` sem solicitação.
3. **Respeito Estrito aos Guards (`verify:complexity` e `verify:architecture`):**
   - **Complexidade Ciclomática Máxima por função:** `8` (`MAX_COMPLEXITY = 8`).
   - **Profundidade Máxima de Aninhamento por função:** `3` (`MAX_DEPTH = 3`).
   - *Atenção:* No script `scripts/check-complexity.mjs`, cada `if`, `?:`, `&&`, `||`, `??`, `for`, `while`, `catch` e `case` soma `+1` na complexidade da função. Todos os blocos de código desta spec já foram decompostos e verificados para passarem com folga no `npm run verify:complexity`. **Copie-os fielmente sem fundir funções.**
   - **Isolamento de Camadas (`scripts/check-architecture.mjs`):**
     - `src/modules/**/domain/**` **NÃO PODE** importar `react`, `next`, `mysql2`, `@/server`, `@/app` ou `@/components`.
     - Componentes em `src/components/**` e páginas em `src/app/**` **NÃO PODEM** importar `mysql2`, `@/server/db` ou `/infrastructure/`.

---

## 1. Arquitetura de Segurança, Economia de API e Regras de Negócio

### 1.1 Regra do Checkbox de Cadastro (Anexo 1 $\rightarrow$ Anexo 2 vs. Anexo 3) e Persistência Granular
1. **Estado Inicial Determinado pelo Cadastro (`marketingConsent`):**
   - Quando o cliente cria sua conta marcando a checkbox do **Anexo 1** (`marketingConsent = true`), sua conta inicia exatamente como no **Anexo 2**:
     - `reservationConfirmations: true`
     - `reservationReminders: true`
     - `newsAndEvents: true`
     - `promotions: true`
   - Quando o cliente cria sua conta deixando a checkbox do **Anexo 1** desmarcada (`marketingConsent = false`), sua conta inicia exatamente como no **Anexo 3**:
     - `reservationConfirmations: true`
     - `reservationReminders: true`
     - `newsAndEvents: false`
     - `promotions: false`
2. **Persistência Individual dos 4 Switches no MySQL (Sem Nova Migration SQL):**
   - As tabelas `user` e `customers` possuem apenas a coluna booleana `marketing_consent`. Para que os 4 switches (`reservationConfirmations`, `reservationReminders`, `newsAndEvents`, `promotions`) sejam persistidos individualmente no servidor (sem depender de `localStorage` do navegador e sem criar nova migration SQL), gravamos o JSON validado das 4 preferências na tabela `verification` (já existente em `013_customer_auth.sql`) usando:
     - `identifier = CONCAT('account_notif_prefs:', userId)`
     - `id = SUBSTRING(SHA2(CONCAT('account_notif_prefs:', userId), 256), 1, 36)`
   - Se a conta acabou de ser criada (ou ainda não possui registro customizado em `verification`), a função pura `resolveNotificationPreferences(userMarketingConsent, storedJson)` deriva automaticamente o estado do **Anexo 2** (se `userMarketingConsent` for verdadeiro) ou do **Anexo 3** (se `userMarketingConsent` for falso).
   - Sempre que o usuário altera qualquer switch na aba **Notificações**, o backend salva os 4 booleans na tabela `verification` **e** atualiza `marketing_consent = (newsAndEvents || promotions)` nas tabelas `user` e `customers` dentro da mesma transação.

### 1.2 Integração de E-mail com a Hostinger (`smtp.hostinger.com`)
1. **Cliente SMTP Nativo Zero-Dependência (`src/server/customer-auth/smtp-mailer.ts`):**
   - Conecta via TLS/STARTTLS usando `node:tls` e `node:net` (sem `nodemailer`), lendo prioritariamente as variáveis de ambiente da Hostinger (`SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SECURITY=ssl`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`) ou a configuração criptografada (AES-256-GCM) salva na tabela `system_smtp_settings` (`/admin/sistema`).
2. **Provedor de E-mail de Notificações (`src/server/notifications/hostinger-email-provider.ts`):**
   - Substitui o `MockEmailProvider` isolado em `src/server/notifications/composition.ts` por um provedor híbrido que:
     - Busca o template ativo em `system_email_templates` (`reservation_confirmation`, `reservation_reminder_24h`, `reservation_reminder_3h`, `reservation_cancellation`, `waitlist_available`), interpola as variáveis e dispara o e-mail real via Hostinger SMTP quando o SMTP está configurado.
     - Caso o ambiente de desenvolvimento/teste (CI) não possua credenciais SMTP configuradas, opera em fallback silencioso (modo simulado) sem quebrar testes automatizados.
3. **Respeito Estrito ao Opt-Out do Cliente (Economia de Cota SMTP):**
   - Antes de enfileirar ou disparar um e-mail de confirmação/cancelamento (`reservation_confirmation` / `reservation_cancellation`), o servidor verifica se o cliente mantém `reservationConfirmations === true`. Se o cliente desligou essa chave na aba **Notificações**, o e-mail **não** é enfileirado nem enviado.
   - Na varredura de lembretes (`24h` e `3h`), reservas de clientes que desligaram `reservationReminders` são filtradas diretamente na consulta, poupando processamento e envios SMTP.

### 1.3 Aba "Dados Bancários" — Histórico de Transações a partir das Compras/Reservas Reais
1. **Consulta Baseada em `reservations` (com `LEFT JOIN payments` e `LEFT JOIN experiences`):**
   - Como o checkout de pagamento ainda não está concluído no fluxo público, a tabela `payments` pode estar vazia mesmo quando o cliente já realizou reservas.
   - Portanto, `listCustomerTransactionsByUserId(userId)` consulta as reservas reais da conta autenticada (`FROM reservations r INNER JOIN customers c ON c.id = r.customer_id LEFT JOIN experiences e ON e.id = r.experience_id LEFT JOIN payments p ON p.reservation_id = r.id WHERE c.auth_user_id = ? AND r.status NOT IN ('draft', 'hold')`).
2. **Dados Reais Extraídos vs. Dados Simulados Determinísticos:**
   - **Dados Reais da Reserva/Compra:**
     - **Data (`date`):** Data real em que a reserva/pagamento foi registrada (`DATE_FORMAT(COALESCE(p.paid_at, r.created_at), '%d/%m/%Y')`).
     - **Descrição (`description`):** Código público real (`r.public_code`), nome da experiência (`e.name`, se houver) ou quantidade real de pessoas (`r.guest_count`) + data/hora reais da reserva (`dd/mm` às `HH:mm`). Ex.: `Reserva TW-8F3A1B2C – 4 pessoas (24/10 às 20:00)`.
     - **Tipo (`type`) e Status (`status`):** Derivados do status real da reserva (`r.status`) e do pagamento (`p.status`). Reservas confirmadas/ativas aparecem como `Reserva` / `Pago`; reservas concluídas (`completed`) aparecem como `Reserva` / `Concluído`; reservas canceladas (`cancelled`) geram o registro da reserva cancelada (`Reserva` / `Cancelado`) **e** um registro de estorno (`Reembolso` / `Concluído` na data de `cancelled_at`), alimentando todos os filtros da aba (*Todos os tipos*, *Reservas* e *Reembolsos*).
   - **Dados Simulados Determinísticos (quando `p.id IS NULL`):**
     - **Valor (`amount`):** Simulado deterministicamente em **R$ 95,00 por pessoa** (`r.guest_count * 95`, formatado em `BRL`, ex.: 2 pessoas = `R$ 190,00`, 4 pessoas = `R$ 380,00`). Se houver `p.amount` real na tabela `payments`, utiliza o valor real.
     - **Forma de pagamento (`paymentBrand` e `paymentDetails`):** Se houver `p.method` real em `payments`, usa o método real; caso contrário, simula deterministicamente a partir do `r.id` (`r.id % 3 === 0` $\rightarrow$ `PIX`; `r.id % 3 === 1` $\rightarrow$ `Visa •••• 4821`; `r.id % 3 === 2` $\rightarrow$ `Mastercard •••• 5678`), garantindo que os dados nunca mudem a cada refresh.

### 1.4 Controle de Gasto de API e Segurança (Anti-Abuso, Anti-IDOR e Coalescência)
1. **Eliminação de Requisição Duplicada no Mount (`AccountSettingsContext.tsx`):**
   - O cliente faz **apenas 1 requisição `GET /api/account/settings`** ao abrir `/configuracoes` (removendo a chamada paralela desnecessária a `/api/customer-auth/session` e eliminando o cache inseguro em `localStorage`).
2. **Debounce de 400ms + `AbortController` + No-Op Guard nos Toggles de Notificação:**
   - Ao clicar rapidamente em múltiplos switches na aba **Notificações**, o estado visual muda instantaneamente (*Optimistic UI*), mas a chamada `PUT /api/account/notifications/preferences` aguarda `400ms` de inatividade para enviar **1 único payload consolidado** (e cancela a requisição se o usuário voltar o switch para o mesmo valor já salvo no servidor).
3. **Rate Limiting Server-Side em Todas as Rotas de Conta:**
   - `GET /api/account/settings`: máx. `60` requisições por usuário a cada 15 minutos.
   - `PUT /api/account/notifications/preferences`: máx. `25` requisições por usuário a cada 15 minutos.
   - `PUT /api/account/notifications/whatsapp`: máx. `10` requisições por usuário a cada 15 minutos.
   - `PUT /api/account/profile`: máx. `15` requisições por usuário a cada 15 minutos.
   - `POST /api/account/password`: máx. `8` requisições por usuário a cada 15 minutos.
4. **Proteção contra CSRF (`hasTrustedOrigin`), Anti-IDOR (`session.user.id`) e Remoção de Superfície PCI-DSS:**
   - Nenhuma rota aceita `userId` vindo do cliente; toda query SQL filtra estritamente por `session.user.id`.
   - O estado inicial `initialNotifications` no cliente começa alinhado ao padrão seguro (`newsAndEvents: false, promotions: false`) e os switches ficam desabilitados durante `isProfileLoading` para evitar cliques cegos antes da hidratação.

---

## 2. Contratos de Tipos e Domínio

### 2.1 Atualizar `next-app/src/types/account-settings.ts`
**Arquivo a substituir:** `next-app/src/types/account-settings.ts`

```typescript
export type AccountTab = 'dados' | 'notificacoes' | 'dados-bancarios';

export interface UserProfile {
  name: string;
  email: string;
  cpf: string;
  avatarUrl?: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailNotificationPreferences {
  reservationConfirmations: boolean;
  reservationReminders: boolean;
  newsAndEvents: boolean;
  promotions: boolean;
}

export interface NotificationPreferences extends EmailNotificationPreferences {
  whatsAppConfigured: boolean;
  whatsAppNumber?: string;
}

export interface PaymentMethod {
  id: string;
  brand: 'visa' | 'mastercard' | 'elo' | 'amex';
  type: string;
  last4: string;
  expiry: string;
  isPrimary?: boolean;
}

export type TransactionType = 'Reserva' | 'Reembolso';
export type TransactionStatus = 'Pago' | 'Cancelado' | 'Concluído';

export interface AccountTransaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  paymentBrand: 'visa' | 'mastercard' | 'pix';
  paymentDetails: string;
  status: TransactionStatus;
  amount: string;
}

export interface AccountSettingsContextValue {
  activeTab: AccountTab;
  setActiveTab: (tab: AccountTab) => void;
  profile: UserProfile;
  isProfileLoading: boolean;
  isProfileSaving: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (input: PasswordChangeInput) => Promise<{ success: boolean; message?: string }>;
  notifications: NotificationPreferences;
  toggleNotification: (key: keyof EmailNotificationPreferences, value: boolean) => Promise<void>;
  saveWhatsAppNumber: (number: string) => Promise<{ success: boolean; message?: string }>;
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (card: Omit<PaymentMethod, 'id'>) => Promise<{ success: boolean; message?: string }>;
  removePaymentMethod: (id: string) => Promise<{ success: boolean; message?: string }>;
  transactions: AccountTransaction[];
  transactionFilter: string;
  setTransactionFilter: (filter: string) => void;
  filteredTransactions: AccountTransaction[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearToast: () => void;
}
```

---

### 2.2 Atualizar `next-app/src/modules/account-settings/domain/account-settings-schema.ts`
**Arquivo a substituir:** `next-app/src/modules/account-settings/domain/account-settings-schema.ts`

Este módulo de domínio contém a validação Zod, a regra determinística que transforma o checkbox do **Anexo 1** (`marketingConsent`) nas preferências iniciais do **Anexo 2** ou **Anexo 3** (`resolveNotificationPreferences`), e o mapeador determinístico que converte reservas reais (com ou sem pagamento concluído) em linhas do Histórico de Transações (`mapReservationRowToTransactions`).

```typescript
import { z } from 'zod';
import { validatePasswordBasics } from '@/modules/customer-auth/domain/password-policy';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import type { AccountTransaction, EmailNotificationPreferences } from '@/types/account-settings';

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;
const SIMULATED_PRICE_PER_GUEST_BRL = 95;

export type ReservationTransactionSource = {
  reservationId: number;
  publicCode: string;
  reservationDateFormatted: string;
  startTimeFormatted: string;
  guestCount: number;
  reservationStatus: string;
  experienceName: string | null;
  createdDateFormatted: string;
  cancelledDateFormatted: string | null;
  paymentId: number | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentAmount: number | string | null;
  paymentDescription: string | null;
};

export function sanitizeTextInput(value: string, maxLength = 160): string {
  return value
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

export function sanitizeNameForSubmit(value: string): string {
  return sanitizeTextInput(value, 160).trim();
}

export function sanitizeEmailInput(value: string): string {
  return value
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .slice(0, 254);
}

export function sanitizePasswordInput(value: string): string {
  return value.replace(/\0/g, '').slice(0, 128);
}

export function extractNationalPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2, 13);
  }
  return digits.slice(0, 11);
}

export function formatWhatsAppPhoneInput(raw: string): string {
  const digits = extractNationalPhoneDigits(raw);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (subscriber.length <= 4) return `(${ddd}) ${subscriber}`;
  if (subscriber.length <= 8) {
    return `(${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  }
  return `(${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5, 9)}`;
}

export function isValidBrazilianWhatsAppDigits(digits: string): boolean {
  if (!/^[1-9]{2}(?:9\d{8}|[2-8]\d{7})$/.test(digits)) return false;
  const subscriber = digits.slice(2);
  if (/^(\d)\1+$/.test(subscriber)) return false;
  return true;
}

export const updateProfileSchema = z.object({
  name: z
    .string()
    .transform(sanitizeNameForSubmit)
    .pipe(
      z
        .string()
        .min(2, 'Informe seu nome completo (mínimo de 2 caracteres).')
        .max(160, 'O nome deve ter no máximo 160 caracteres.'),
    ),
  email: z
    .string()
    .transform(sanitizeEmailInput)
    .pipe(
      z
        .string()
        .max(254, 'O e-mail deve ter no máximo 254 caracteres.')
        .pipe(z.email('Informe um endereço de e-mail válido.')),
    ),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .transform(sanitizePasswordInput)
      .refine(validatePasswordBasics, 'Digite sua senha atual.'),
    newPassword: z
      .string()
      .transform(sanitizePasswordInput)
      .refine(
        validatePasswordBasics,
        'A nova senha não pode estar vazia e deve ter até 128 caracteres.',
      ),
    confirmPassword: z.string().transform(sanitizePasswordInput),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'As senhas digitadas não coincidem.',
      });
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'A nova senha deve ser diferente da senha atual.',
      });
    }
  });

export function validateNewPasswordStrength(
  password: string,
  userInputs: string[],
): { valid: boolean; score: number; message?: string } {
  if (!validatePasswordBasics(password)) {
    return { valid: false, score: 0, message: 'Digite uma nova senha válida.' };
  }
  const assessment = assessPassword(password, userInputs);
  if (assessment.weak) {
    return {
      valid: false,
      score: assessment.score,
      message: 'Use pelo menos 15 caracteres e evite senhas previsíveis.',
    };
  }
  return { valid: true, score: assessment.score };
}

export const updateWhatsAppSchema = z.object({
  phone: z
    .string()
    .transform(extractNationalPhoneDigits)
    .refine(
      isValidBrazilianWhatsAppDigits,
      'Informe um número com DDD válido (ex: (91) 98765-4321).',
    )
    .transform((digits) => ({
      normalizedPhone: digits,
      formattedPhone: formatWhatsAppPhoneInput(digits),
    })),
});

export const updateNotificationPreferencesSchema = z.object({
  reservationConfirmations: z.boolean(),
  reservationReminders: z.boolean(),
  newsAndEvents: z.boolean(),
  promotions: z.boolean(),
});

export function buildInitialNotificationPreferences(
  marketingConsent: boolean | number | null | undefined,
): EmailNotificationPreferences {
  const optedIn = Boolean(marketingConsent);
  return {
    reservationConfirmations: true,
    reservationReminders: true,
    newsAndEvents: optedIn,
    promotions: optedIn,
  };
}

export function resolveNotificationPreferences(
  marketingConsent: boolean | number | null | undefined,
  storedJson: string | null | undefined,
): EmailNotificationPreferences {
  const fallback = buildInitialNotificationPreferences(marketingConsent);
  if (!storedJson) return fallback;
  try {
    const parsed = updateNotificationPreferencesSchema.safeParse(JSON.parse(storedJson));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function formatBrlCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

function resolveSimulatedPaymentMethod(
  reservationId: number,
  paymentMethod: string | null,
): { paymentBrand: AccountTransaction['paymentBrand']; paymentDetails: string } {
  if (paymentMethod === 'pix') return { paymentBrand: 'pix', paymentDetails: 'PIX' };
  if (paymentMethod === 'card') return { paymentBrand: 'visa', paymentDetails: '•••• 4821' };
  const slot = Math.abs(Math.trunc(reservationId)) % 3;
  if (slot === 0) return { paymentBrand: 'pix', paymentDetails: 'PIX' };
  if (slot === 1) return { paymentBrand: 'visa', paymentDetails: '•••• 4821' };
  return { paymentBrand: 'mastercard', paymentDetails: '•••• 5678' };
}

function resolveTransactionAmount(guestCount: number, paymentAmount: number | string | null): string {
  const numericPayment = Number(paymentAmount);
  if ( numericPayment > 0 ) return formatBrlCurrency(numericPayment);
  const safeGuests = Math.max(1, Math.trunc(guestCount));
  return formatBrlCurrency(safeGuests * SIMULATED_PRICE_PER_GUEST_BRL);
}

function buildReservationDescription(source: ReservationTransactionSource): string {
  if (source.paymentDescription) return source.paymentDescription;
  const guestsLabel = source.guestCount === 1 ? '1 pessoa' : `${source.guestCount} pessoas`;
  const title = source.experienceName ? source.experienceName : `Mesa para ${guestsLabel}`;
  return `Reserva ${source.publicCode} – ${title} (${source.reservationDateFormatted} às ${source.startTimeFormatted})`;
}

function isCancelledOrFailedReservation(source: ReservationTransactionSource): boolean {
  if (source.paymentStatus === 'cancelled' || source.paymentStatus === 'failed') return true;
  return ['cancelled', 'expired', 'no_show'].includes(source.reservationStatus);
}

function isRefundEligible(source: ReservationTransactionSource): boolean {
  if (source.paymentStatus === 'refunded' || source.paymentStatus === 'partially_refunded') return true;
  return source.reservationStatus === 'cancelled';
}

function resolvePurchaseStatus(source: ReservationTransactionSource): AccountTransaction['status'] {
  if (isCancelledOrFailedReservation(source)) return 'Cancelado';
  if (source.reservationStatus === 'completed') return 'Concluído';
  return 'Pago';
}

export function mapReservationRowToTransactions(
  source: ReservationTransactionSource,
): AccountTransaction[] {
  const payment = resolveSimulatedPaymentMethod(source.reservationId, source.paymentMethod);
  const amount = resolveTransactionAmount(source.guestCount, source.paymentAmount);
  const purchaseRow: AccountTransaction = {
    id: source.paymentId ? `pay-${source.paymentId}` : `res-${source.reservationId}`,
    date: source.createdDateFormatted,
    description: buildReservationDescription(source),
    type: 'Reserva',
    paymentBrand: payment.paymentBrand,
    paymentDetails: payment.paymentDetails,
    status: resolvePurchaseStatus(source),
    amount,
  };
  if (!isRefundEligible(source)) return [purchaseRow];
  const refundRow: AccountTransaction = {
    id: `ref-${source.reservationId}`,
    date: source.cancelledDateFormatted || source.createdDateFormatted,
    description: `Reembolso – Reserva ${source.publicCode}`,
    type: 'Reembolso',
    paymentBrand: payment.paymentBrand,
    paymentDetails: payment.paymentDetails,
    status: 'Concluído',
    amount,
  };
  return [refundRow, purchaseRow];
}
```

---

## 3. Camada de Servidor: SMTP Hostinger, Notificações e Repositório de Configurações

### 3.1 Garantir o Cliente SMTP da Hostinger (`next-app/src/server/customer-auth/smtp-mailer.ts`)
**Arquivo a criar ou substituir:** `next-app/src/server/customer-auth/smtp-mailer.ts`

Este módulo implementa o disparo real via `smtp.hostinger.com` (ou via tabela `system_smtp_settings` gerenciada em `/admin/sistema`), com proteção contra *SMTP Header Injection* e timeout de 12 segundos.

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

function isSmtpRowComplete(row: SmtpDbRow | undefined): row is SmtpDbRow & { passwordCiphertext: string } {
  if (!row) return false;
  if (!row.enabled || !row.host) return false;
  return typeof row.passwordCiphertext === 'string' && row.passwordCiphertext.length > 0;
}

function mapDbSmtpRow(row: SmtpDbRow & { passwordCiphertext: string }): SmtpConnectionConfig {
  const host = row.host.trim();
  const username = row.username.trim();
  const fromEmail = row.fromEmail.trim();
  return {
    host,
    port: Number(row.port) > 0 ? Number(row.port) : 465,
    security: row.security,
    username,
    password: decryptStoredSmtpPassword(row.passwordCiphertext),
    fromEmail: fromEmail ? fromEmail : username,
    fromName: row.fromName.trim() ? row.fromName.trim() : 'The Wine Experience',
  };
}

export async function findActiveSmtpConfig(): Promise<SmtpConnectionConfig | null> {
  const envConfig = resolveEnvSmtpConfig();
  if (envConfig) return envConfig;
  try {
    const [rows] = await getDatabasePool().execute<SmtpDbRow[]>(
      `SELECT enabled, host, port, security, username,
              password_ciphertext AS passwordCiphertext,
              from_email AS fromEmail, from_name AS fromName
       FROM system_smtp_settings WHERE id = 1 LIMIT 1`,
    );
    const row = rows[0];
    return isSmtpRowComplete(row) ? mapDbSmtpRow(row) : null;
  } catch {
    return null;
  }
}

export async function loadActiveSmtpConfig(): Promise<SmtpConnectionConfig> {
  const config = await findActiveSmtpConfig();
  if (!config) throw new Error('SMTP configuration is not enabled or incomplete');
  return config;
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
  const boundary = 'thewine_mail_boundary_v1';
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

### 3.2 Criar o Provedor de Notificações via Hostinger (`next-app/src/server/notifications/hostinger-email-provider.ts`)
**Arquivo a criar:** `next-app/src/server/notifications/hostinger-email-provider.ts`

```typescript
import 'server-only';
import type { RowDataPacket } from 'mysql2';
import type { EmailNotification, EmailProvider, NotificationPayload } from '@/modules/notifications/application/ports';
import type { NotificationTemplate } from '@/modules/notifications/domain/notification';
import { getDatabasePool } from '@/server/db';
import { findActiveSmtpConfig, sendSmtpMail } from '@/server/customer-auth/smtp-mailer';

type EmailTemplateDbRow = RowDataPacket & {
  subject: string;
  body: string;
  active: number;
};

const fallbackTemplates: Record<NotificationTemplate, { subject: string; body: string }> = {
  reservation_confirmation: {
    subject: 'Sua reserva está confirmada — {{reservation_code}}',
    body: 'Olá, {{customer_name}}!\n\nSua reserva no The Wine está confirmada para {{reservation_date}} às {{reservation_time}}.\n\nCódigo da reserva: {{reservation_code}}\nPessoas: {{guest_count}}\n\nAcesse sua conta para acompanhar os detalhes.',
  },
  reservation_reminder_24h: {
    subject: 'Lembrete: esperamos você amanhã no The Wine',
    body: 'Olá, {{customer_name}}!\n\nPassando para lembrar que esperamos você amanhã, {{reservation_date}}, às {{reservation_time}}.\n\nCódigo da reserva: {{reservation_code}}\nPessoas: {{guest_count}}',
  },
  reservation_reminder_3h: {
    subject: 'Até logo: sua experiência começa em breve',
    body: 'Olá, {{customer_name}}!\n\nSua experiência no The Wine começa hoje às {{reservation_time}}. Estamos esperando por você.\n\nCódigo da reserva: {{reservation_code}}',
  },
  reservation_cancellation: {
    subject: 'Atualização da sua reserva — {{reservation_code}}',
    body: 'Olá, {{customer_name}}!\n\nSua reserva {{reservation_code}} foi cancelada.\n\nQuando quiser viver uma nova experiência, estaremos esperando por você no The Wine.',
  },
  waitlist_available: {
    subject: 'Uma mesa ficou disponível para você',
    body: 'Olá, {{customer_name}}!\n\nUma mesa ficou disponível para a data {{reservation_date}}. Fale com nossa equipe para confirmar sua experiência no The Wine.\n\nReferência: {{waitlist_code}}',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildVariablesMap(payload: NotificationPayload): Record<string, string> {
  return {
    customer_name: String(payload.customerName ?? 'Cliente The Wine'),
    reservation_code: String(payload.publicCode ?? ''),
    reservation_date: String(payload.reservationDate ?? ''),
    reservation_time: String(payload.startTime ?? ''),
    guest_count: String(payload.guestCount ?? ''),
    private_link: 'https://thewineexperience.com.br/lista-de-reservas',
    waitlist_code: String(payload.waitlistCode ?? ''),
  };
}

function interpolateTemplate(templateText: string, variables: Record<string, string>): string {
  return templateText
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_, key: string) => variables[key] ?? '');
}

function renderHtmlEmail(subject: string, textBody: string): string {
  const paragraphs = textBody
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;color:#DDD8D0;font-size:15px;line-height:1.6;">${escapeHtml(line)}</p>` : '<div style="height:8px;"></div>'))
    .join('');

  return [
    '<div style="background:#0A0A0A;padding:32px 16px;font-family:Georgia,serif;color:#F3EFEA;">',
    '<div style="max-width:540px;margin:0 auto;background:#141312;border:1px solid rgba(211,185,123,0.28);border-radius:14px;padding:32px;">',
    '<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#D3B97B;">THE WINE EXPERIENCE</p>',
    `<h1 style="margin:0 0 20px;font-size:22px;color:#F3EFEA;">${escapeHtml(subject)}</h1>`,
    paragraphs,
    '<hr style="border:none;border-top:1px solid rgba(211,185,123,0.18);margin:24px 0 14px;" />',
    '<p style="margin:0;font-size:12px;color:#8E8980;">Você pode gerenciar suas preferências de notificação a qualquer momento nas configurações da sua conta.</p>',
    '</div></div>',
  ].join('');
}

async function loadTemplateDefinition(
  templateKey: NotificationTemplate,
): Promise<{ subject: string; body: string; active: boolean }> {
  const fallback = fallbackTemplates[templateKey];
  try {
    const [rows] = await getDatabasePool().execute<EmailTemplateDbRow[]>(
      `SELECT subject, body, active
       FROM system_email_templates
       WHERE template_key = ?
       LIMIT 1`,
      [templateKey],
    );
    const row = rows[0];
    if (!row) return { ...fallback, active: true };
    return { subject: row.subject, body: row.body, active: Boolean(row.active) };
  } catch {
    return { ...fallback, active: true };
  }
}

export class HostingerSmtpEmailProvider implements EmailProvider {
  async send(notification: EmailNotification): Promise<void> {
    const smtpConfig = await findActiveSmtpConfig();
    if (!smtpConfig) return;

    const template = await loadTemplateDefinition(notification.template);
    if (!template.active) return;

    const variables = buildVariablesMap(notification.payload);
    const subject = interpolateTemplate(template.subject, variables);
    const text = interpolateTemplate(template.body, variables);
    const html = renderHtmlEmail(subject, text);

    await sendSmtpMail({
      to: notification.recipient,
      subject,
      text,
      html,
    });
  }
}
```

---

### 3.3 Atualizar Repositório de Configurações da Conta (`next-app/src/server/account-settings/repository.ts`)
**Arquivo a substituir:** `next-app/src/server/account-settings/repository.ts`

Este repositório:
1. Lê em **uma única query** (`findAccountSettingsByUserId`) os dados do usuário (`user`), do perfil de cliente (`customers`) e o JSON de preferências granulares salvo em `verification` (`account_notif_prefs:${userId}`).
2. Grava no cadastro (`seedInitialAccountNotificationPreferences`) ou ao alterar os switches (`updateCustomerNotificationPreferencesInTransaction`) o JSON das 4 preferências em `verification` e sincroniza `marketing_consent` em `user` e `customers`.
3. Expõe `getCustomerEmailPreferencesByEmail(email)` para que o módulo de notificações consulte se o destinatário aceita receber confirmações (`reservationConfirmations`) ou lembretes (`reservationReminders`) antes de disparar e-mails pela Hostinger.
4. Consulta as compras/reservas reais (`listCustomerTransactionsByUserId`) em `reservations` com `LEFT JOIN experiences` e `LEFT JOIN payments`, mapeando tanto os dados reais quanto as informações simuladas de preço/pagamento via `mapReservationRowToTransactions`.

```typescript
import 'server-only';

import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import {
  buildInitialNotificationPreferences,
  mapReservationRowToTransactions,
  resolveNotificationPreferences,
} from '@/modules/account-settings/domain/account-settings-schema';
import { getDatabasePool } from '@/server/db';
import { ensureCustomerForAuthUser } from '@/server/customer-auth/repository';
import { CustomerAuthError } from '@/server/customer-auth/errors';
import type { AccountTransaction, EmailNotificationPreferences } from '@/types/account-settings';

export type AccountSettingsRow = RowDataPacket & {
  userId: string;
  userName: string;
  userEmail: string;
  userMarketingConsent: number | boolean;
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNormalizedPhone: string | null;
  customerMarketingConsent: number | boolean | null;
  storedPreferencesJson: string | null;
};

type CustomerPhoneConflictRow = RowDataPacket & {
  id: number;
  authUserId: string | null;
};

type RecipientPreferenceRow = RowDataPacket & {
  userId: string | null;
  userMarketingConsent: number | boolean | null;
  customerMarketingConsent: number | boolean | null;
  storedPreferencesJson: string | null;
};

type ReservationTransactionDbRow = RowDataPacket & {
  reservationId: number;
  publicCode: string;
  reservationDateFormatted: string;
  startTimeFormatted: string;
  guestCount: number;
  reservationStatus: string;
  experienceName: string | null;
  createdDateFormatted: string;
  cancelledDateFormatted: string | null;
  paymentId: number | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  paymentAmount: number | string | null;
  paymentDescription: string | null;
};

export function notificationPreferenceIdentifier(userId: string): string {
  return `account_notif_prefs:${userId}`;
}

function notificationPreferenceRowId(userId: string): string {
  return createHash('sha256')
    .update(notificationPreferenceIdentifier(userId))
    .digest('hex')
    .slice(0, 36);
}

export async function seedInitialAccountNotificationPreferences(
  userId: string,
  marketingConsent: boolean,
): Promise<void> {
  const initial = buildInitialNotificationPreferences(marketingConsent);
  const identifier = notificationPreferenceIdentifier(userId);
  const rowId = notificationPreferenceRowId(userId);
  await getDatabasePool().execute(
    `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
     VALUES (?, ?, ?, '2099-12-31 23:59:59', UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE
       value = VALUES(value),
       updatedAt = UTC_TIMESTAMP()`,
    [rowId, identifier, JSON.stringify(initial)],
  );
}

export async function findAccountSettingsByUserId(userId: string): Promise<AccountSettingsRow> {
  await ensureCustomerForAuthUser(userId);
  const identifier = notificationPreferenceIdentifier(userId);
  const [rows] = await getDatabasePool().execute<AccountSettingsRow[]>(
    `SELECT u.id AS userId, u.name AS userName, u.email AS userEmail,
            u.marketing_consent AS userMarketingConsent,
            c.id AS customerId, c.name AS customerName, c.email AS customerEmail,
            c.phone AS customerPhone, c.normalized_phone AS customerNormalizedPhone,
            c.marketing_consent AS customerMarketingConsent,
            v.value AS storedPreferencesJson
     FROM \`user\` u
     LEFT JOIN customers c ON c.auth_user_id = u.id
     LEFT JOIN verification v ON v.identifier = ?
     WHERE u.id = ?
     LIMIT 1`,
    [identifier, userId],
  );
  if (!rows[0]) throw new Error('Account settings could not be found');
  return rows[0];
}

export async function updateCustomerProfileInTransaction(
  userId: string,
  input: { name: string; email: string },
): Promise<void> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE \`user\`
       SET name = ?, email = ?, updatedAt = UTC_TIMESTAMP()
       WHERE id = ?`,
      [input.name, input.email, userId],
    );
    await connection.execute(
      `UPDATE customers
       SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE auth_user_id = ?`,
      [input.name, input.email, userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomerWhatsAppInTransaction(
  userId: string,
  input: { formattedPhone: string; normalizedPhone: string },
): Promise<void> {
  await ensureCustomerForAuthUser(userId);
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<CustomerPhoneConflictRow[]>(
      `SELECT id, auth_user_id AS authUserId
       FROM customers
       WHERE normalized_phone = ?
       LIMIT 1 FOR UPDATE`,
      [input.normalizedPhone],
    );
    const conflict = rows[0];
    if (conflict && conflict.authUserId !== userId) {
      throw new CustomerAuthError(
        'Este número de WhatsApp já está vinculado a outro cadastro.',
        409,
        'PHONE_UNAVAILABLE',
      );
    }
    await connection.execute(
      `UPDATE customers
       SET phone = ?, normalized_phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE auth_user_id = ?`,
      [input.formattedPhone, input.normalizedPhone, userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomerNotificationPreferencesInTransaction(
  userId: string,
  preferences: EmailNotificationPreferences,
): Promise<void> {
  const marketingConsent = preferences.newsAndEvents || preferences.promotions;
  const identifier = notificationPreferenceIdentifier(userId);
  const rowId = notificationPreferenceRowId(userId);
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, '2099-12-31 23:59:59', UTC_TIMESTAMP(), UTC_TIMESTAMP())
       ON DUPLICATE KEY UPDATE
         value = VALUES(value),
         updatedAt = UTC_TIMESTAMP()`,
      [rowId, identifier, JSON.stringify(preferences)],
    );
    await connection.execute(
      'UPDATE `user` SET marketing_consent = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
      [marketingConsent, userId],
    );
    await connection.execute(
      'UPDATE customers SET marketing_consent = ?, updated_at = CURRENT_TIMESTAMP WHERE auth_user_id = ?',
      [marketingConsent, userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getCustomerEmailPreferencesByEmail(
  recipientEmail: string,
): Promise<EmailNotificationPreferences> {
  const normalized = recipientEmail.trim().toLowerCase();
  if (!normalized) return buildInitialNotificationPreferences(false);
  try {
    const [rows] = await getDatabasePool().execute<RecipientPreferenceRow[]>(
      `SELECT u.id AS userId,
              u.marketing_consent AS userMarketingConsent,
              c.marketing_consent AS customerMarketingConsent,
              v.value AS storedPreferencesJson
       FROM customers c
       LEFT JOIN \`user\` u ON u.id = c.auth_user_id
       LEFT JOIN verification v ON v.identifier = CONCAT('account_notif_prefs:', u.id)
       WHERE LOWER(c.email) = ? OR LOWER(u.email) = ?
       ORDER BY u.id IS NULL ASC, c.id DESC
       LIMIT 1`,
      [normalized, normalized],
    );
    const row = rows[0];
    if (!row) return buildInitialNotificationPreferences(false);
    const consent = row.userMarketingConsent ?? row.customerMarketingConsent;
    return resolveNotificationPreferences(consent, row.storedPreferencesJson);
  } catch {
    return buildInitialNotificationPreferences(false);
  }
}

export async function listCustomerTransactionsByUserId(userId: string): Promise<AccountTransaction[]> {
  const [rows] = await getDatabasePool().execute<ReservationTransactionDbRow[]>(
    `SELECT
       r.id AS reservationId,
       r.public_code AS publicCode,
       DATE_FORMAT(r.reservation_date, '%d/%m/%Y') AS reservationDateFormatted,
       TIME_FORMAT(r.start_time, '%H:%i') AS startTimeFormatted,
       r.guest_count AS guestCount,
       r.status AS reservationStatus,
       e.name AS experienceName,
       DATE_FORMAT(COALESCE(p.paid_at, r.created_at), '%d/%m/%Y') AS createdDateFormatted,
       DATE_FORMAT(COALESCE(p.refunded_at, r.cancelled_at, r.updated_at), '%d/%m/%Y') AS cancelledDateFormatted,
       p.id AS paymentId,
       p.method AS paymentMethod,
       p.status AS paymentStatus,
       p.amount AS paymentAmount,
       p.description AS paymentDescription
     FROM reservations r
     INNER JOIN customers c ON c.id = r.customer_id
     LEFT JOIN experiences e ON e.id = r.experience_id
     LEFT JOIN payments p ON p.reservation_id = r.id
     WHERE c.auth_user_id = ?
       AND r.status NOT IN ('draft', 'hold')
     ORDER BY COALESCE(p.paid_at, r.created_at) DESC, r.id DESC
     LIMIT 100`,
    [userId],
  );
  return rows.flatMap((row) => mapReservationRowToTransactions({
    reservationId: Number(row.reservationId),
    publicCode: row.publicCode,
    reservationDateFormatted: row.reservationDateFormatted,
    startTimeFormatted: row.startTimeFormatted,
    guestCount: Number(row.guestCount),
    reservationStatus: row.reservationStatus,
    experienceName: row.experienceName,
    createdDateFormatted: row.createdDateFormatted,
    cancelledDateFormatted: row.cancelledDateFormatted,
    paymentId: row.paymentId ? Number(row.paymentId) : null,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    paymentAmount: row.paymentAmount,
    paymentDescription: row.paymentDescription,
  }));
}
```

---

### 3.4 Atualizar o Serviço de Configurações da Conta (`next-app/src/server/account-settings/service.ts`)
**Arquivo a substituir:** `next-app/src/server/account-settings/service.ts`

```typescript
import 'server-only';

import { isAPIError } from 'better-auth/api';
import {
  changePasswordSchema,
  formatWhatsAppPhoneInput,
  resolveNotificationPreferences,
  updateNotificationPreferencesSchema,
  updateProfileSchema,
  updateWhatsAppSchema,
  validateNewPasswordStrength,
} from '@/modules/account-settings/domain/account-settings-schema';
import { CustomerAuthError, isDuplicateKey } from '@/server/customer-auth/errors';
import { getCustomerAuth } from '@/server/customer-auth/provider';
import { getCustomerSession } from '@/server/customer-auth/service';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';
import {
  findAccountSettingsByUserId,
  listCustomerTransactionsByUserId,
  updateCustomerNotificationPreferencesInTransaction,
  updateCustomerProfileInTransaction,
  updateCustomerWhatsAppInTransaction,
} from './repository';

export async function requireAuthenticatedSession(request: Request) {
  const session = await getCustomerSession(request);
  if (!session?.user?.id) {
    throw new CustomerAuthError(
      'Sua sessão expirou. Entre novamente para continuar.',
      401,
      'UNAUTHORIZED',
    );
  }
  return session;
}

export async function listCustomerAccountTransactions(userId: string) {
  return listCustomerTransactionsByUserId(userId);
}

export async function getAccountSettingsForRequest(request: Request) {
  const session = await requireAuthenticatedSession(request);
  await recordRateLimitAttempt('account-settings-read', session.user.id, 60, 15 * 60_000);
  const [row, transactions] = await Promise.all([
    findAccountSettingsByUserId(session.user.id),
    listCustomerAccountTransactions(session.user.id),
  ]);
  const formattedPhone = formatWhatsAppPhoneInput(row.customerPhone ?? row.customerNormalizedPhone ?? '');
  const emailPrefs = resolveNotificationPreferences(row.userMarketingConsent, row.storedPreferencesJson);

  return {
    profile: {
      name: row.customerName || row.userName,
      email: row.customerEmail || row.userEmail,
      cpf: '***.***.***-**',
    },
    notifications: {
      ...emailPrefs,
      whatsAppConfigured: Boolean(formattedPhone),
      whatsAppNumber: formattedPhone,
    },
    transactions,
  };
}

export async function updateAccountProfileForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Dados inválidos.',
      400,
      'INVALID_PROFILE_INPUT',
    );
  }
  await recordRateLimitAttempt('account-profile', session.user.id, 15, 15 * 60_000);
  try {
    await updateCustomerProfileInTransaction(session.user.id, parsed.data);
  } catch (error) {
    if (isDuplicateKey(error, 'customer_auth_user_email_uq')) {
      throw new CustomerAuthError(
        'Não foi possível usar este e-mail. Verifique os dados ou informe outro endereço.',
        409,
        'EMAIL_UNAVAILABLE',
      );
    }
    throw error;
  }
  return { profile: { ...parsed.data, cpf: '***.***.***-**' } };
}

export async function changeAccountPasswordForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Dados de senha inválidos.',
      400,
      'INVALID_PASSWORD_INPUT',
    );
  }
  const strength = validateNewPasswordStrength(parsed.data.newPassword, [session.user.name, session.user.email]);
  if (!strength.valid) {
    throw new CustomerAuthError(strength.message!, 400, 'WEAK_PASSWORD_NOT_ALLOWED');
  }
  await recordRateLimitAttempt('account-password', session.user.id, 8, 15 * 60_000);
  try {
    const result = await getCustomerAuth().api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: false,
      },
      headers: request.headers,
      returnHeaders: true,
    });
    return { headers: result.headers, response: { status: 'password_updated' as const } };
  } catch (error) {
    if (isInvalidCurrentPasswordError(error)) {
      throw new CustomerAuthError(
        'A senha atual informada está incorreta.',
        400,
        'INVALID_CURRENT_PASSWORD',
      );
    }
    throw error;
  }
}

function isInvalidCurrentPasswordError(error: unknown): boolean {
  return isAPIError(error) && (error.statusCode === 400 || error.statusCode === 401);
}

export async function updateAccountWhatsAppForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateWhatsAppSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      parsed.error.issues[0]?.message ?? 'Informe um número de WhatsApp válido.',
      400,
      'INVALID_WHATSAPP_NUMBER',
    );
  }
  await recordRateLimitAttempt('account-whatsapp', session.user.id, 10, 15 * 60_000);
  try {
    await updateCustomerWhatsAppInTransaction(session.user.id, parsed.data.phone);
  } catch (error) {
    if (isDuplicateKey(error, 'customers_normalized_phone_uq')) {
      throw new CustomerAuthError(
        'Este número de WhatsApp já está vinculado a outro cadastro.',
        409,
        'PHONE_UNAVAILABLE',
      );
    }
    throw error;
  }
  return { whatsAppConfigured: true, whatsAppNumber: parsed.data.phone.formattedPhone };
}

export async function updateAccountNotificationPreferencesForRequest(request: Request, body: unknown) {
  const session = await requireAuthenticatedSession(request);
  const parsed = updateNotificationPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError(
      'Preferências de notificação inválidas.',
      400,
      'INVALID_NOTIFICATION_PREFERENCES',
    );
  }
  await recordRateLimitAttempt('account-notifications', session.user.id, 25, 15 * 60_000);
  await updateCustomerNotificationPreferencesInTransaction(session.user.id, parsed.data);
  return { preferences: parsed.data };
}
```

---

### 3.5 Semear as Preferências Iniciais no Cadastro (`next-app/src/server/customer-auth/service.ts`)
**Arquivo a editar:** `next-app/src/server/customer-auth/service.ts`

Na função `signUpCustomer`, logo após `const profile = await ensureCustomerForAuthUser(created.response.user.id);`, gravar explicitamente as preferências iniciais correspondentes ao **Anexo 2** (`input.marketingConsent === true`) ou **Anexo 3** (`input.marketingConsent === false`):

1. No topo de `next-app/src/server/customer-auth/service.ts`, adicionar o import:
```typescript
import { seedInitialAccountNotificationPreferences } from '@/server/account-settings/repository';
```
2. Dentro de `signUpCustomer`, logo abaixo de `const profile = await ensureCustomerForAuthUser(created.response.user.id);`:
```typescript
    const profile = await ensureCustomerForAuthUser(created.response.user.id);
    await seedInitialAccountNotificationPreferences(created.response.user.id, input.marketingConsent);
```

---

### 3.6 Conectar a Composição de Notificações ao SMTP da Hostinger e às Preferências do Cliente (`next-app/src/server/notifications/composition.ts` e `mysql-reservation-reminder-repository.ts`)

#### 3.6.1 Atualizar `next-app/src/server/notifications/composition.ts`
**Arquivo a substituir:** `next-app/src/server/notifications/composition.ts`

```typescript
import { enqueueNotification } from '@/modules/notifications/application/enqueue-notification';
import { processNotification } from '@/modules/notifications/application/process-notification';
import { queueDueReservationReminders } from '@/modules/notifications/application/queue-due-reminders';
import type { NotificationOutboxEntry, NotificationPayload } from '@/modules/notifications/application/ports';
import type { NotificationTemplate } from '@/modules/notifications/domain/notification';
import { MysqlNotificationRepository } from '@/modules/notifications/infrastructure/mysql-notification-repository';
import { MysqlReservationReminderRepository } from '@/modules/notifications/infrastructure/mysql-reservation-reminder-repository';
import { getCustomerEmailPreferencesByEmail } from '@/server/account-settings/repository';
import { HostingerSmtpEmailProvider } from './hostinger-email-provider';

const notificationRepository = new MysqlNotificationRepository();
const reminderRepository = new MysqlReservationReminderRepository();
const emailProvider = new HostingerSmtpEmailProvider();

type QueueReservationNotificationInput = {
  email: string;
  template: Extract<NotificationTemplate, 'reservation_confirmation' | 'reservation_cancellation'>;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  dedupeKey?: string;
};

export async function queueReservationNotification(
  input: QueueReservationNotificationInput,
): Promise<number> {
  const preferences = await getCustomerEmailPreferencesByEmail(input.email);
  if (!preferences.reservationConfirmations) return 0;

  const payload: NotificationPayload = {
    publicCode: input.publicCode,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
    guestCount: input.guestCount,
  };
  const notificationId = await enqueueNotification({
    channel: 'email',
    template: input.template,
    recipient: input.email,
    dedupeKey: input.dedupeKey,
    payload,
  }, { notifications: notificationRepository });

  if (notificationId > 0) {
    void processNotification(notificationId, {
      notifications: notificationRepository,
      emailProvider,
    }).catch((error) => {
      console.error('Background SMTP delivery deferred to outbox retry', error);
    });
  }
  return notificationId;
}

export function listNotifications(limit = 100): Promise<NotificationOutboxEntry[]> {
  return notificationRepository.list(limit);
}

export function simulateNotificationDelivery(id: number): Promise<void> {
  return processNotification(id, { notifications: notificationRepository, emailProvider });
}

export function runReservationReminderCycle(now = new Date()) {
  return queueDueReservationReminders(now, {
    notifications: notificationRepository,
    reservations: reminderRepository,
  });
}
```

#### 3.6.2 Filtrar Lembretes Desativados em `next-app/src/modules/notifications/infrastructure/mysql-reservation-reminder-repository.ts`
**Arquivo a substituir:** `next-app/src/modules/notifications/infrastructure/mysql-reservation-reminder-repository.ts`

Filtra diretamente no SQL candidatos cujo cliente tenha desativado `reservationReminders` em `verification` (`JSON_EXTRACT(v.value, '$.reservationReminders') = false`), além de limitar Tentativas no repositório de notificações:

```typescript
import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type {
  ReminderReservationCandidate,
  ReservationReminderRepository,
} from '../application/ports';

type ReminderCandidateRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  email: string;
};

function mapCandidate(row: ReminderCandidateRow): ReminderReservationCandidate {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    email: row.email,
  };
}

export class MysqlReservationReminderRepository implements ReservationReminderRepository {
  async listUpcoming(): Promise<ReminderReservationCandidate[]> {
    const [rows] = await getDatabasePool().query<ReminderCandidateRow[]>(
      `SELECT
         r.id,
         r.public_code AS publicCode,
         DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
         TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
         TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
         r.guest_count AS guestCount,
         c.email
       FROM reservations r
       INNER JOIN customers c ON c.id = r.customer_id
       LEFT JOIN verification v ON v.identifier = CONCAT('account_notif_prefs:', c.auth_user_id)
       WHERE r.status = 'confirmed'
         AND c.email IS NOT NULL
         AND TRIM(c.email) <> ''
         AND r.reservation_date >= CURDATE()
         AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(v.value, '$.reservationReminders')), 'true') <> 'false'
       ORDER BY r.reservation_date, r.start_time
       LIMIT 200`,
    );
    return rows.map(mapCandidate);
  }
}
```

---

## 4. Camada de Cliente: Contexto com Debounce de API e Componentes das Abas

### 4.1 Atualizar `next-app/src/lib/account-settings-client.ts`
**Arquivo a substituir:** `next-app/src/lib/account-settings-client.ts`

```typescript
import type {
  AccountTransaction,
  EmailNotificationPreferences,
  NotificationPreferences,
  PasswordChangeInput,
  UserProfile,
} from '@/types/account-settings';

export type AccountSettingsPayload = {
  profile: UserProfile;
  notifications: NotificationPreferences;
  transactions: AccountTransaction[];
};

type ClientError = Error & { isUnauthorized?: boolean };

async function readResponseData(response: Response): Promise<{ message?: string } | null> {
  return response.json().catch(() => null) as Promise<{ message?: string } | null>;
}

function assertResponseIsSuccessful(response: Response, data: { message?: string } | null): void {
  if (response.status === 401) {
    const error = new Error(data?.message ?? 'Sua sessão expirou.') as ClientError;
    error.isUnauthorized = true;
    throw error;
  }
  if (!response.ok) throw new Error(data?.message ?? 'Não foi possível concluir agora.');
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const data = await readResponseData(response);
  assertResponseIsSuccessful(response, data);
  return data as T;
}

export function fetchAccountSettings(signal?: AbortSignal): Promise<AccountSettingsPayload> {
  return requestJson<AccountSettingsPayload>('/api/account/settings', { method: 'GET', signal });
}

export function requestUpdateProfile(input: { name: string; email: string }) {
  return requestJson<{ profile: UserProfile }>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function requestChangePassword(input: PasswordChangeInput) {
  return requestJson<{ status: 'password_updated' }>('/api/account/password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function requestSaveWhatsApp(phone: string) {
  return requestJson<{ whatsAppConfigured: boolean; whatsAppNumber: string }>(
    '/api/account/notifications/whatsapp',
    { method: 'PUT', body: JSON.stringify({ phone }) },
  );
}

export function requestUpdateNotificationPreferences(
  prefs: EmailNotificationPreferences,
  signal?: AbortSignal,
) {
  return requestJson<{ preferences: EmailNotificationPreferences }>(
    '/api/account/notifications/preferences',
    {
      method: 'PUT',
      body: JSON.stringify(prefs),
      signal,
    },
  );
}

export function isAccountSettingsUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'isUnauthorized' in error && error.isUnauthorized === true);
}
```

---

### 4.2 Atualizar `next-app/src/components/account/settings/AccountSettingsContext.tsx`
**Arquivo a substituir:** `next-app/src/components/account/settings/AccountSettingsContext.tsx`

Principais melhorias de segurança e economia de API neste arquivo:
1. **1 única chamada `GET /api/account/settings` na montagem** (remove a requisição duplicada para `/api/customer-auth/session` e remove o uso de `localStorage`).
2. **Debounce de `400ms` + `AbortController` + No-Op Guard em `toggleNotification`**: Se o usuário alternar vários switches rapidamente na aba **Notificações**, o estado visual responde em `0ms`, mas o cliente consolida todas as mudanças em **uma única chamada `PUT`** após `400ms` (e não dispara nenhuma chamada de rede se o estado resultante for idêntico ao último estado salvo no servidor).

```tsx
'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  changePasswordSchema,
  sanitizeNameForSubmit,
  updateProfileSchema,
  updateWhatsAppSchema,
  validateNewPasswordStrength,
} from '@/modules/account-settings/domain/account-settings-schema';
import {
  fetchAccountSettings,
  isAccountSettingsUnauthorized,
  requestChangePassword,
  requestSaveWhatsApp,
  requestUpdateNotificationPreferences,
  requestUpdateProfile,
} from '@/lib/account-settings-client';
import type {
  AccountSettingsContextValue,
  AccountTab,
  AccountTransaction,
  EmailNotificationPreferences,
  NotificationPreferences,
  PasswordChangeInput,
  PaymentMethod,
  UserProfile,
} from '@/types/account-settings';

const PREFERENCES_DEBOUNCE_MS = 400;

const initialProfile: UserProfile = {
  name: '',
  email: '',
  cpf: '***.***.***-**',
};

const initialNotifications: NotificationPreferences = {
  reservationConfirmations: true,
  reservationReminders: true,
  newsAndEvents: false,
  promotions: false,
  whatsAppConfigured: false,
  whatsAppNumber: '',
};

const initialTransactions: AccountTransaction[] = [];
const validTabs: AccountTab[] = ['dados', 'notificacoes', 'dados-bancarios'];
const preferenceKeys = ['reservationConfirmations', 'reservationReminders', 'newsAndEvents', 'promotions'] as const;

const AccountSettingsContext = createContext<AccountSettingsContextValue | undefined>(undefined);

function toEmailPreferences(preferences: NotificationPreferences): EmailNotificationPreferences {
  return {
    reservationConfirmations: preferences.reservationConfirmations,
    reservationReminders: preferences.reservationReminders,
    newsAndEvents: preferences.newsAndEvents,
    promotions: preferences.promotions,
  };
}

function areEmailPreferencesEqual(a: EmailNotificationPreferences, b: EmailNotificationPreferences): boolean {
  return preferenceKeys.every((key) => a[key] === b[key]);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function AccountSettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as AccountTab | null;
  const urlTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : null;
  const [selectedTab, setSelectedTab] = useState<AccountTab>(urlTab ?? 'dados');
  const activeTab = urlTab ?? selectedTab;

  const setActiveTab = useCallback(
    (tab: AccountTab) => {
      setSelectedTab(tab);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>(initialNotifications);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>(initialTransactions);
  const [transactionFilter, setTransactionFilter] = useState<string>('todos');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const committedEmailPrefsRef = useRef<EmailNotificationPreferences>(toEmailPreferences(initialNotifications));
  const pendingEmailPrefsRef = useRef<EmailNotificationPreferences>(toEmailPreferences(initialNotifications));
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsAbortRef = useRef<AbortController | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function hydrateSettings() {
      try {
        const settings = await fetchAccountSettings(controller.signal);
        if (!isMounted) return;
        const serverPrefs = toEmailPreferences(settings.notifications);
        committedEmailPrefsRef.current = serverPrefs;
        pendingEmailPrefsRef.current = serverPrefs;
        setProfile(settings.profile);
        setNotifications(settings.notifications);
        setTransactions(settings.transactions);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return;
        if (isAccountSettingsUnauthorized(error)) {
          router.replace('/acesso?auth=expired');
          return;
        }
        showToast(errorMessage(error, 'Não foi possível carregar suas configurações.'), 'error');
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }

    void hydrateSettings();
    return () => {
      isMounted = false;
      controller.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      prefsAbortRef.current?.abort();
    };
  }, [router, showToast]);

  const flushNotificationPreferences = useCallback(async () => {
    const nextPrefs = pendingEmailPrefsRef.current;
    if (areEmailPreferencesEqual(nextPrefs, committedEmailPrefsRef.current)) return;

    prefsAbortRef.current?.abort();
    const controller = new AbortController();
    prefsAbortRef.current = controller;

    try {
      const saved = await requestUpdateNotificationPreferences(nextPrefs, controller.signal);
      committedEmailPrefsRef.current = saved.preferences;
    } catch (error) {
      if (isAbortError(error)) return;
      const fallback = committedEmailPrefsRef.current;
      pendingEmailPrefsRef.current = fallback;
      setNotifications((current) => ({ ...current, ...fallback }));
      if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
      showToast(errorMessage(error, 'Não foi possível salvar sua preferência de notificação.'), 'error');
    }
  }, [router, showToast]);

  const toggleNotification = useCallback(
    async (key: keyof EmailNotificationPreferences, value: boolean) => {
      const updatedPrefs = { ...pendingEmailPrefsRef.current, [key]: value };
      pendingEmailPrefsRef.current = updatedPrefs;
      setNotifications((current) => ({ ...current, [key]: value }));

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        void flushNotificationPreferences();
      }, PREFERENCES_DEBOUNCE_MS);
    },
    [flushNotificationPreferences],
  );

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<{ success: boolean; message?: string }> => {
      const parsed = updateProfileSchema.safeParse({
        name: sanitizeNameForSubmit(data.name ?? profile.name),
        email: data.email ?? profile.email,
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Dados inválidos.';
        showToast(message, 'error');
        return { success: false, message };
      }
      setIsProfileSaving(true);
      try {
        const result = await requestUpdateProfile(parsed.data);
        setProfile(result.profile);
        showToast('Informações pessoais atualizadas com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Erro ao atualizar informações pessoais.');
        showToast(message, 'error');
        return { success: false, message };
      } finally {
        setIsProfileSaving(false);
      }
    },
    [profile.email, profile.name, router, showToast],
  );

  const changePassword = useCallback(
    async (input: PasswordChangeInput): Promise<{ success: boolean; message?: string }> => {
      const parsed = changePasswordSchema.safeParse(input);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Dados de senha inválidos.';
        showToast(message, 'error');
        return { success: false, message };
      }
      const strength = validateNewPasswordStrength(parsed.data.newPassword, [profile.name, profile.email]);
      if (!strength.valid) {
        showToast(strength.message ?? 'Escolha uma senha mais forte.', 'error');
        return { success: false, message: strength.message };
      }
      try {
        await requestChangePassword(parsed.data);
        showToast('Senha alterada com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Não foi possível alterar a senha. Tente novamente.');
        showToast(message, 'error');
        return { success: false, message };
      }
    },
    [profile.email, profile.name, router, showToast],
  );

  const saveWhatsAppNumber = useCallback(
    async (number: string): Promise<{ success: boolean; message?: string }> => {
      const parsed = updateWhatsAppSchema.safeParse({ phone: number });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Informe um número de WhatsApp válido.';
        showToast(message, 'error');
        return { success: false, message };
      }
      try {
        const result = await requestSaveWhatsApp(number);
        setNotifications((current) => ({
          ...current,
          whatsAppConfigured: result.whatsAppConfigured,
          whatsAppNumber: result.whatsAppNumber,
        }));
        showToast('Número de WhatsApp salvo com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Não foi possível salvar o número.');
        showToast(message, 'error');
        return { success: false, message };
      }
    },
    [router, showToast],
  );

  const addPaymentMethod = useCallback(
    async (card: Omit<PaymentMethod, 'id'>): Promise<{ success: boolean; message?: string }> => {
      setPaymentMethods((previous) => [...previous, { ...card, id: `pm-${Date.now()}` }]);
      return { success: true };
    },
    [],
  );

  const removePaymentMethod = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      setPaymentMethods((previous) => previous.filter((card) => card.id !== id));
      return { success: true };
    },
    [],
  );

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'reservas') return transactions.filter((transaction) => transaction.type === 'Reserva');
    if (transactionFilter === 'reembolsos') return transactions.filter((transaction) => transaction.type === 'Reembolso');
    return transactions;
  }, [transactionFilter, transactions]);

  const value = useMemo<AccountSettingsContextValue>(() => ({
    activeTab,
    setActiveTab,
    profile,
    isProfileLoading,
    isProfileSaving,
    updateProfile,
    changePassword,
    notifications,
    toggleNotification,
    saveWhatsAppNumber,
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    transactions,
    transactionFilter,
    setTransactionFilter,
    filteredTransactions,
    toast,
    clearToast,
  }), [
    activeTab,
    addPaymentMethod,
    changePassword,
    clearToast,
    filteredTransactions,
    isProfileLoading,
    isProfileSaving,
    notifications,
    paymentMethods,
    profile,
    removePaymentMethod,
    saveWhatsAppNumber,
    setActiveTab,
    toggleNotification,
    toast,
    transactionFilter,
    transactions,
    updateProfile,
  ]);

  return <AccountSettingsContext.Provider value={value}>{children}</AccountSettingsContext.Provider>;
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext);
  if (!context) throw new Error('useAccountSettings must be used within an AccountSettingsProvider');
  return context;
}
```

---

### 4.3 Atualizar `next-app/src/components/account/settings/tabs/NotificationsTab.tsx`
**Arquivo a substituir:** `next-app/src/components/account/settings/tabs/NotificationsTab.tsx`

Desabilita os switches enquanto `isProfileLoading` for verdadeiro (evitando disparos acidentais antes da hidratação do estado real vindo do banco) e mantém a fidelidade visual exata dos **Anexos 2 e 3**.

```tsx
'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/SocialIcons';
import type { EmailNotificationPreferences } from '@/types/account-settings';
import { useAccountSettings } from '../AccountSettingsContext';
import { AddWhatsAppModal } from '../modals/AddWhatsAppModal';
import styles from '../AccountSettings.module.css';

interface EmailNotificationItem {
  key: keyof EmailNotificationPreferences;
  title: string;
  description: string;
}

const emailNotificationItems: EmailNotificationItem[] = [
  {
    key: 'reservationConfirmations',
    title: 'Confirmações de reserva',
    description: 'Receba o comprovante e os detalhes das suas reservas.',
  },
  {
    key: 'reservationReminders',
    title: 'Lembretes de reserva',
    description: 'Receba um lembrete antes da data da sua reserva.',
  },
  {
    key: 'newsAndEvents',
    title: 'Novidades e eventos',
    description: 'Fique por dentro de eventos especiais, degustações e experiências exclusivas.',
  },
  {
    key: 'promotions',
    title: 'Promoções',
    description: 'Receba ofertas e conteúdos especiais do The Wine Experience.',
  },
];

export function NotificationsTab() {
  const { notifications, isProfileLoading, toggleNotification, saveWhatsAppNumber } = useAccountSettings();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  return (
    <div className={styles.tabContent}>
      <section className={styles.cardSection} aria-labelledby="email-notifications-heading">
        <div className={styles.sectionHeader}>
          <Bell className={styles.sectionHeaderIcon} aria-hidden="true" />
          <div className={styles.sectionHeaderText}>
            <h2 id="email-notifications-heading" className={styles.sectionTitle}>
              Notificações por e-mail
            </h2>
            <p className={styles.sectionDescription}>
              Receba informações sobre suas reservas, eventos e novidades do The Wine Experience.
            </p>
          </div>
        </div>

        <div className={styles.toggleList}>
          {emailNotificationItems.map((item) => {
            const isChecked = notifications[item.key];
            return (
              <div key={item.key} className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>{item.title}</span>
                  <span className={styles.toggleDesc}>{item.description}</span>
                </div>

                <label className={styles.switchToggle} aria-label={item.title}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isProfileLoading}
                    onChange={(e) => void toggleNotification(item.key, e.target.checked)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.cardSection} aria-labelledby="whatsapp-notifications-heading">
        <div className={styles.sectionHeader}>
          <WhatsAppIcon className={styles.sectionHeaderIcon} aria-hidden="true" />
          <div className={styles.sectionHeaderText}>
            <h2 id="whatsapp-notifications-heading" className={styles.sectionTitle}>
              Notificações por WhatsApp
            </h2>
            <p className={styles.sectionDescription}>
              Receba confirmações e lembretes importantes também pelo WhatsApp.
            </p>
          </div>
        </div>

        <div className={styles.whatsAppBox}>
          <div className={styles.whatsAppLeft}>
            <div className={styles.whatsAppIconCircle}>
              <WhatsAppIcon className="w-5 h-5 text-[#D3B97B]" />
            </div>
            <div>
              <div className={styles.whatsAppTitle}>
                {notifications.whatsAppConfigured
                  ? 'WhatsApp configurado'
                  : 'WhatsApp não configurado'}
              </div>
              <div className={styles.whatsAppSubtitle}>
                {notifications.whatsAppConfigured
                  ? `Número ativo: ${notifications.whatsAppNumber || 'Configurado'}`
                  : 'Adicione seu número de WhatsApp para receber notificações.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isProfileLoading}
            onClick={() => setIsWhatsAppModalOpen(true)}
            className={styles.goldOutlineButton}
          >
            {notifications.whatsAppConfigured ? 'Alterar número' : 'Adicionar número'}
          </button>
        </div>
      </section>

      <AddWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        currentNumber={notifications.whatsAppNumber}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSave={saveWhatsAppNumber}
      />
    </div>
  );
}
```

---

## 5. Testes Automatizados de Domínio e Serviço

### 5.1 Atualizar `next-app/tests/account-settings-domain.test.mjs`
**Arquivo a substituir:** `next-app/tests/account-settings-domain.test.mjs`

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
    if (specifier === '@/modules/customer-auth/domain/password-policy') {
      return loadTypeScript('../src/modules/customer-auth/domain/password-policy.ts');
    }
    if (specifier === '@/modules/customer-auth/domain/password-strength') {
      return loadTypeScript('../src/modules/customer-auth/domain/password-strength.ts');
    }
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('sanitizes profile text and validates names and email addresses', () => {
  const {
    sanitizeTextInput,
    sanitizeNameForSubmit,
    sanitizeEmailInput,
    updateProfileSchema,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  assert.equal(sanitizeTextInput('  Ana\n\t  Wine\0  '), ' Ana Wine ');
  assert.equal(sanitizeNameForSubmit('  Ana\n\t  Wine\0  '), 'Ana Wine');
  assert.equal(sanitizeEmailInput('  ANA @Example.COM\n'), 'ana@example.com');
  assert.equal(updateProfileSchema.safeParse({ name: 'A', email: 'ana@example.com' }).success, false);
  assert.equal(updateProfileSchema.safeParse({ name: 'Ana Wine', email: 'ANA@EXAMPLE.COM' }).success, true);
  assert.equal(updateProfileSchema.safeParse({ name: 'Ana Wine', email: 'invalid' }).success, false);
});

test('resolves initial notification preferences from signup marketingConsent (Anexo 2 vs Anexo 3)', () => {
  const {
    buildInitialNotificationPreferences,
    resolveNotificationPreferences,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  // Anexo 2: checkbox marcada no cadastro -> todas as 4 opções ligadas
  assert.deepEqual(buildInitialNotificationPreferences(true), {
    reservationConfirmations: true,
    reservationReminders: true,
    newsAndEvents: true,
    promotions: true,
  });

  // Anexo 3: checkbox desmarcada no cadastro -> confirmações e lembretes ligados, novidades e promoções desligadas
  assert.deepEqual(buildInitialNotificationPreferences(false), {
    reservationConfirmations: true,
    reservationReminders: true,
    newsAndEvents: false,
    promotions: false,
  });

  // Preferências granulares persistidas sobrescrevem o default inicial
  const customJson = JSON.stringify({
    reservationConfirmations: true,
    reservationReminders: false,
    newsAndEvents: true,
    promotions: false,
  });
  assert.deepEqual(resolveNotificationPreferences(false, customJson), {
    reservationConfirmations: true,
    reservationReminders: false,
    newsAndEvents: true,
    promotions: false,
  });
});

test('maps real reservation records into transaction history with deterministic simulated pricing', () => {
  const {
    mapReservationRowToTransactions,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  const confirmedRows = mapReservationRowToTransactions({
    reservationId: 10,
    publicCode: 'TW-ABC12345',
    reservationDateFormatted: '24/10/2026',
    startTimeFormatted: '20:00',
    guestCount: 4,
    reservationStatus: 'confirmed',
    experienceName: null,
    createdDateFormatted: '21/10/2026',
    cancelledDateFormatted: null,
    paymentId: null,
    paymentMethod: null,
    paymentStatus: null,
    paymentAmount: null,
    paymentDescription: null,
  });

  assert.equal(confirmedRows.length, 1);
  assert.equal(confirmedRows[0].id, 'res-10');
  assert.equal(confirmedRows[0].type, 'Reserva');
  assert.equal(confirmedRows[0].status, 'Pago');
  assert.match(confirmedRows[0].description, /TW-ABC12345/);
  assert.match(confirmedRows[0].amount, /380,00/);

  const cancelledRows = mapReservationRowToTransactions({
    reservationId: 11,
    publicCode: 'TW-CANCEL99',
    reservationDateFormatted: '25/10/2026',
    startTimeFormatted: '21:00',
    guestCount: 2,
    reservationStatus: 'cancelled',
    experienceName: 'Menu Degustação',
    createdDateFormatted: '20/10/2026',
    cancelledDateFormatted: '21/10/2026',
    paymentId: null,
    paymentMethod: null,
    paymentStatus: null,
    paymentAmount: null,
    paymentDescription: null,
  });

  assert.equal(cancelledRows.length, 2);
  assert.equal(cancelledRows[0].type, 'Reembolso');
  assert.equal(cancelledRows[0].status, 'Concluído');
  assert.equal(cancelledRows[1].type, 'Reserva');
  assert.equal(cancelledRows[1].status, 'Cancelado');
});
```

---

### 5.2 Atualizar `next-app/tests/account-settings-service.test.mjs`
**Arquivo a substituir:** `next-app/tests/account-settings-service.test.mjs`

```javascript
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const ts = requireFromTest('typescript');

class TestCustomerAuthError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const mocks = {
  customerAuth: { getCustomerSession: async () => ({ user: { id: 'user-1', name: 'Ana Wine', email: 'ana@example.com' } }) },
  errors: {
    CustomerAuthError: TestCustomerAuthError,
    isDuplicateKey: (error, keyName) => error?.code === 'ER_DUP_ENTRY' && `${error.sqlMessage ?? ''} ${error.message ?? ''}`.includes(keyName),
  },
  repository: {
    findAccountSettingsByUserId: async () => ({
      userName: 'Ana Wine',
      userEmail: 'ana@example.com',
      userMarketingConsent: 1,
      customerName: 'Ana Wine',
      customerEmail: 'ana@example.com',
      customerPhone: '(91) 98765-4321',
      customerNormalizedPhone: '91987654321',
      storedPreferencesJson: null,
    }),
    listCustomerTransactionsByUserId: async () => [],
    updateCustomerProfileInTransaction: async () => undefined,
    updateCustomerWhatsAppInTransaction: async () => undefined,
    updateCustomerNotificationPreferencesInTransaction: async () => undefined,
  },
  rate: { recordRateLimitAttempt: async () => undefined },
  provider: { getCustomerAuth: () => ({ api: { changePassword: async () => ({ headers: new Headers() }) } }) },
  betterAuthApi: { isAPIError: (error) => Boolean(error?.statusCode) },
};

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
    const aliases = {
      '@/modules/account-settings/domain/account-settings-schema': '../src/modules/account-settings/domain/account-settings-schema.ts',
      '@/modules/customer-auth/domain/password-policy': '../src/modules/customer-auth/domain/password-policy.ts',
      '@/modules/customer-auth/domain/password-strength': '../src/modules/customer-auth/domain/password-strength.ts',
    };
    if (Object.hasOwn(aliases, specifier)) return loadTypeScript(aliases[specifier]);
    if (specifier === './repository') return mocks.repository;
    if (specifier.startsWith('.')) {
      let dependency = resolve(dirname(filename), specifier);
      if (!extname(dependency)) dependency += '.ts';
      return loadTypeScript(dependency);
    }
    if (specifier === '@/server/customer-auth/service') return mocks.customerAuth;
    if (specifier === '@/server/customer-auth/errors') return mocks.errors;
    if (specifier === '@/server/customer-auth/repository') return mocks.repository;
    if (specifier === '@/server/customer-auth/rate-limit') return mocks.rate;
    if (specifier === '@/server/customer-auth/provider') return mocks.provider;
    if (specifier === 'better-auth/api') return mocks.betterAuthApi;
    if (specifier === 'server-only') return {};
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

const service = loadTypeScript('../src/server/account-settings/service.ts');

function request(body = undefined) {
  return new Request('https://thewineexperience.com.br/api/account/settings', body === undefined
    ? { headers: { cookie: 'session=1' } }
    : { method: 'PUT', headers: { cookie: 'session=1', 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

test('returns Anexo 2 notification defaults when userMarketingConsent is 1 and Anexo 3 when 0', async () => {
  const resultConsentTrue = await service.getAccountSettingsForRequest(request());
  assert.equal(resultConsentTrue.notifications.reservationConfirmations, true);
  assert.equal(resultConsentTrue.notifications.reservationReminders, true);
  assert.equal(resultConsentTrue.notifications.newsAndEvents, true);
  assert.equal(resultConsentTrue.notifications.promotions, true);

  mocks.repository.findAccountSettingsByUserId = async () => ({
    userName: 'Ana Wine',
    userEmail: 'ana@example.com',
    userMarketingConsent: 0,
    customerName: 'Ana Wine',
    customerEmail: 'ana@example.com',
    customerPhone: null,
    customerNormalizedPhone: null,
    storedPreferencesJson: null,
  });

  const resultConsentFalse = await service.getAccountSettingsForRequest(request());
  assert.equal(resultConsentFalse.notifications.reservationConfirmations, true);
  assert.equal(resultConsentFalse.notifications.reservationReminders, true);
  assert.equal(resultConsentFalse.notifications.newsAndEvents, false);
  assert.equal(resultConsentFalse.notifications.promotions, false);
});

test('persists granular notification preferences with rate limiting', async () => {
  let savedArgs = null;
  mocks.repository.updateCustomerNotificationPreferencesInTransaction = async (userId, prefs) => {
    savedArgs = { userId, prefs };
  };

  const payload = {
    reservationConfirmations: true,
    reservationReminders: false,
    newsAndEvents: true,
    promotions: false,
  };
  const response = await service.updateAccountNotificationPreferencesForRequest(request(payload), payload);
  assert.deepEqual(response.preferences, payload);
  assert.deepEqual(savedArgs, { userId: 'user-1', prefs: payload });
});
```

---

## 6. Checklist de Verificação Obrigatória para o Executor

Ao concluir a criação/edição dos arquivos acima, o executor deve rodar dentro de `next-app/`:

```bash
node --test tests/account-settings-domain.test.mjs tests/account-settings-service.test.mjs
npm run verify:complexity
npm run verify:architecture
npm run typecheck
npm run lint
```

Todos os comandos devem terminar com **código de saída `0`** e sem violações.
