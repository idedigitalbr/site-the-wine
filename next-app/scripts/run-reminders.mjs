import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return readFileSync(path, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return values;
    return { ...values, [match[1]]: match[2].replace(/^['"]|['"]$/g, '') };
  }, {});
}

const fileEnvironment = readEnvFile(resolve('.env.local'));
const value = (name, fallback = '') => process.env[name] ?? fileEnvironment[name] ?? fallback;
const secret = value('NOTIFICATION_JOB_SECRET');
const baseUrl = value('PUBLIC_APP_URL', 'http://127.0.0.1:3000').replace(/\/$/, '');

if (!secret) {
  console.error('NOTIFICATION_JOB_SECRET não configurado.');
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(`${baseUrl}/api/internal/jobs/notifications/reminders`, {
      method: 'POST',
      headers: { 'x-notification-job-secret': secret },
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`Job de lembretes falhou (${response.status}).`);
      process.exitCode = 1;
    } else {
      console.log(`Job de lembretes concluído: ${body}`);
    }
  } catch (error) {
    console.error(`Não foi possível executar o job de lembretes: ${error.message}`);
    process.exitCode = 1;
  }
}
