import type { EmailProvider, EmailNotification } from '../application/ports';

export class MockEmailProvider implements EmailProvider {
  async send(_notification: EmailNotification): Promise<void> {
    return Promise.resolve();
  }
}
