import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function RecoverPasswordPage() {
  return (
    <main className="reservation-theme min-h-screen bg-background font-sans text-foreground">
      <Header />
      <section className="mx-auto flex min-h-[65vh] max-w-3xl items-center px-5 py-16 sm:px-8">
        <div className="w-full rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center shadow-sm sm:p-10">
          <LockKeyhole aria-hidden="true" className="mx-auto text-primary" size={28} />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Acesso à sua conta</p>
          <h1 className="mt-3 font-display text-4xl text-foreground">Recuperação de senha</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">A recuperação de senha ainda não está disponível. Nenhum e-mail será enviado por esta página. Você pode voltar à reserva e tentar acessar novamente ou falar com a equipe do The Wine.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/reservas" className="reservation-primary-button justify-center"><ArrowLeft aria-hidden="true" size={16} /> Voltar para a reserva</Link>
            <Link href="/" className="reservation-secondary-button justify-center">Voltar ao site</Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
