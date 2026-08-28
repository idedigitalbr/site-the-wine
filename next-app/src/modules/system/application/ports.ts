export const smtpSecurityOptions = ['none', 'starttls', 'ssl'] as const;
export type SmtpSecurity = typeof smtpSecurityOptions[number];

export const smtpTestStatuses = ['not_tested', 'success', 'failed'] as const;
export type SmtpTestStatus = typeof smtpTestStatuses[number];

export type SystemSmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  fromEmail: string;
  fromName: string;
  passwordConfigured: boolean;
  lastTestStatus: SmtpTestStatus;
  lastTestedAt: string | null;
};

export type SystemEmailTemplate = {
  id: number;
  key: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  active: boolean;
  updatedAt: string | null;
};

export type AdminSystem = {
  smtp: SystemSmtpSettings;
  templates: SystemEmailTemplate[];
};

export type SaveSmtpSettingsInput = {
  enabled: boolean;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export type UpdateEmailTemplateInput = {
  id: number;
  subject: string;
  body: string;
  active: boolean;
};

export interface SystemRepository {
  getSystem(): Promise<AdminSystem>;
  saveSmtpSettings(input: SaveSmtpSettingsInput): Promise<void>;
  recordSmtpTest(status: Exclude<SmtpTestStatus, 'not_tested'>): Promise<void>;
  updateEmailTemplate(input: UpdateEmailTemplateInput): Promise<void>;
  restoreEmailTemplate(id: number): Promise<void>;
}
