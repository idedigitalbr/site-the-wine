import { z } from 'zod';
import { smtpSecurityOptions } from '@/modules/system/application/ports';

const email = z.string().trim().email('Informe um e-mail válido.').max(254);

export const saveSmtpSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  security: z.enum(smtpSecurityOptions),
  username: z.string().trim().max(254),
  password: z.string().max(255),
  fromEmail: email.or(z.literal('')),
  fromName: z.string().trim().min(2).max(160),
}).superRefine((input, context) => {
  if (input.enabled && input.host.length < 2) {
    context.addIssue({ code: 'custom', path: ['host'], message: 'Informe o servidor SMTP.' });
  }
  if (input.enabled && !input.fromEmail) {
    context.addIssue({ code: 'custom', path: ['fromEmail'], message: 'Informe o e-mail remetente.' });
  }
});

export const testSmtpSettingsSchema = z.object({
  recipientEmail: email,
});

export const updateEmailTemplateSchema = z.object({
  subject: z.string().trim().min(2).max(255),
  body: z.string().trim().min(10).max(20000),
  active: z.boolean(),
});
