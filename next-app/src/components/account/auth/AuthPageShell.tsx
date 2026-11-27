'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import styles from './CustomerAccess.module.css';

export function AuthPageShell({ mode, children }: { mode: 'login' | 'signup'; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <Header />
      <main className={`${styles.main} ${mode === 'signup' ? styles.mainSignup : ''}`}>
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.visualOverlay} />
          <div className={styles.brandBlock}><Image src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp" alt="" width={1920} height={522} priority /><span /><p>MAIS QUE VINHO,<br />UMA EXPERIÊNCIA.</p></div>
        </div>
        <section className={styles.content} aria-live="polite">{children}</section>
      </main>
      <SiteBehaviorController />
    </div>
  );
}
