import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import styles from './not-found.module.css';

export const metadata = {
  title: '404 | Página não encontrada | The Wine Experience',
  description: 'A página que você procura não existe ou foi removida.',
};

function BrokenWineGlass() {
  return (
    <svg className={styles.glass} viewBox="0 0 140 170" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="wine-glass-ground" x1="37" y1="160" x2="133" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9ad42" stopOpacity="0.55" />
          <stop offset="1" stopColor="#d9ad42" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="m66 8 24 11-5 12 8 10-5 10 3 7-3 16c-5 14-19 24-33 20-20-4-23-22-16-42L66 8Z" />
      <path d="M51 91 29 139c-4 9-1 14 13 20-15-3-28-9-38-17 10 4 18 5 25-3" />
      <path d="m98 55 16 47-19-20m-1-24 8 26M103 28l2-7m7 12 13-10m-12 22 13 6m-20 3 8 9" />
      <path className={styles.glassBase} d="M37 160h96" stroke="url(#wine-glass-ground)" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className={styles.page}>
      <link rel="stylesheet" href="/style.css" />
      <Header />
      <main className={styles.main}>
        <div className={styles.content}>
          <BrokenWineGlass />
          <h1 className={styles.code}>404</h1>
          <h2 className={styles.title}>Página não encontrada</h2>
          <p className={styles.message}>
            A página que você está procurando não existe ou foi removida.
            <br />
            {' '}Que tal voltar para o início e continuar explorando nossas experiências?
          </p>
          <Link className={styles.homeLink} href="/#home">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z" />
            </svg>
            <span>Retornar para o início</span>
            <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 12h16m-7-7 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
