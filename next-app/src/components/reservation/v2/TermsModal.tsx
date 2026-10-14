'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type TermsModalProps = {
  open: boolean;
  onClose: () => void;
};

function trapDialogTab(event: KeyboardEvent, dialog: HTMLDivElement | null) {
  const focusable = dialog?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleDialogKeyDown(event: KeyboardEvent, dialog: HTMLDivElement | null, close: () => void) {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key === 'Tab') trapDialogTab(event, dialog);
}

export function TermsModal({ open, onClose }: TermsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => handleDialogKeyDown(event, dialogRef.current, onClose);

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-terms-title"
        className="flex max-h-[min(88dvh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-lg)] border border-primary/40 bg-surface shadow-[0_24px_80px_rgba(0,0,0,.55)]"
      >
        <header className="flex items-start justify-between gap-5 border-b border-border px-5 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Texto provisório</p>
            <h2 id="customer-terms-title" className="mt-2 font-display text-3xl text-foreground">Termos e Condições</h2>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="rounded-full p-2 text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Fechar Termos e Condições">
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 text-sm leading-7 text-muted sm:px-7" tabIndex={0}>
          <p className="mb-5 rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-4 text-primary">
            Este conteúdo é um placeholder para desenvolvimento. Os termos oficiais do The Wine ainda serão definidos e publicados.
          </p>
          <section className="space-y-3">
            <h3 className="font-semibold text-foreground">1. Uso do site</h3>
            <p>Este espaço descreve, de forma provisória, as condições de navegação e utilização dos recursos digitais do The Wine. Ao usar o site, a pessoa deve fornecer informações verdadeiras, manter seus dados de acesso em segurança e utilizar os recursos de forma responsável.</p>
            <p>O site pode apresentar informações sobre o restaurante, experiências, disponibilidade de mesas e outros serviços. Horários, opções e condições podem mudar conforme a operação do estabelecimento e a confirmação apresentada no momento da reserva.</p>
          </section>
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold text-foreground">2. Conta e acesso</h3>
            <p>O cadastro permite que a pessoa acesse recursos associados à sua conta e informe dados necessários para uma reserva. Cada pessoa deve proteger sua senha e avisar o estabelecimento quando suspeitar de uso não autorizado. O The Wine não solicitará que a senha seja enviada por e-mail ou por mensagem.</p>
            <p>O acesso poderá ser interrompido temporariamente para manutenção, segurança ou correção de falhas. Uma sessão pode expirar e exigir que a pessoa entre novamente antes de continuar uma operação.</p>
          </section>
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold text-foreground">3. Reservas</h3>
            <p>Uma solicitação de reserva depende da disponibilidade exibida e da confirmação registrada pelo sistema. A pessoa deve conferir data, horário, quantidade de pessoas e observações antes de concluir. O envio de uma solicitação não cria condições diferentes das informações apresentadas no site.</p>
            <p>Necessidades de acessibilidade, restrições alimentares e outros pedidos serão encaminhados à equipe para organização. O envio de uma observação não garante, por si só, que um pedido específico possa ser atendido; a equipe poderá entrar em contato quando necessário.</p>
          </section>
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold text-foreground">4. Dados pessoais</h3>
            <p>As informações fornecidas no cadastro e na reserva são utilizadas para administrar o acesso, atender solicitações e organizar o atendimento. O conteúdo definitivo sobre tratamento, retenção, direitos e canais de contato será apresentado em uma política própria, que ainda será publicada.</p>
            <p>O aceite de comunicações sobre novidades é opcional e separado da criação da conta. A pessoa poderá alterar essa preferência pelos canais que forem disponibilizados pelo The Wine.</p>
          </section>
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold text-foreground">5. Responsabilidades</h3>
            <p>A pessoa usuária deve utilizar o site sem tentar acessar contas alheias, interferir no funcionamento dos serviços ou enviar conteúdo ilegal. O The Wine adotará medidas razoáveis para manter o serviço disponível e proteger as informações, respeitando as obrigações que forem definidas nos documentos oficiais.</p>
          </section>
          <section className="mt-6 space-y-3">
            <h3 className="font-semibold text-foreground">6. Atualizações e contato</h3>
            <p>Este placeholder não constitui o texto final e não substitui os documentos jurídicos oficiais. Quando forem publicados, os termos indicarão sua versão, a data de vigência e os meios para esclarecimento de dúvidas. As alterações futuras serão exibidas no próprio site.</p>
          </section>
          <p className="mt-8 border-t border-border pt-5 text-xs">Versão provisória usada apenas para permitir a implementação da etapa de cadastro.</p>
        </div>
        <footer className="flex justify-end border-t border-border px-5 py-4 sm:px-7">
          <button type="button" onClick={onClose} className="reservation-primary-button">Fechar</button>
        </footer>
      </div>
    </div>
  );
}
