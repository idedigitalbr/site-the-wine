'use client';

import { LoaderCircle, LogIn, Mail, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    if (response.ok) {
      router.push('/admin');
      return;
    }
    setError(response.status === 503 ? 'O acesso administrativo ainda não foi configurado.' : 'E-mail ou senha inválidos.');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail aria-hidden="true" size={16} /> E-mail</span>
        <input name="email" type="email" required autoComplete="username" className="admin-input" placeholder="admin@thewine.local" />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" className="admin-input" />
      </label>
      {error && <p role="alert" className="flex items-center gap-2 text-sm text-status-danger"><ShieldAlert aria-hidden="true" size={16} /> {error}</p>}
      <button type="submit" disabled={isSubmitting} className="admin-primary-button w-full">
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <LogIn aria-hidden="true" size={17} />}
        {isSubmitting ? 'Entrando...' : 'Entrar no painel'}
      </button>
    </form>
  );
}
