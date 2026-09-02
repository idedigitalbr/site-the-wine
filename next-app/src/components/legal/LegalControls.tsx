'use client';

import { useEffect, useState } from 'react';
import { ChevronUp, Printer } from 'lucide-react';

export function PrintDocumentButton() {
  return (
    <button
      type="button"
      className="btn-print-page"
      onClick={() => window.print()}
      title="Imprimir ou Salvar em PDF"
    >
      <Printer aria-hidden="true" />
      <span>Imprimir Documento</span>
    </button>
  );
}

export function LegalBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 300);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      className={`legal-back-to-top${visible ? ' visible' : ''}`}
      onClick={scrollToTop}
      aria-label="Voltar ao início da página"
    >
      <ChevronUp aria-hidden="true" />
    </button>
  );
}
