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
