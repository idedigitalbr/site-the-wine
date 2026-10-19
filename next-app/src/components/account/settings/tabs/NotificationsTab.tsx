'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/SocialIcons';
import { useAccountSettings } from '../AccountSettingsContext';
import { AddWhatsAppModal } from '../modals/AddWhatsAppModal';
import styles from '../AccountSettings.module.css';

interface EmailNotificationItem {
  key: 'reservationConfirmations' | 'reservationReminders' | 'newsAndEvents' | 'promotions';
  title: string;
  description: string;
}

const emailNotificationItems: EmailNotificationItem[] = [
  {
    key: 'reservationConfirmations',
    title: 'Confirmações de reserva',
    description: 'Receba o comprovante e os detalhes das suas reservas.',
  },
  {
    key: 'reservationReminders',
    title: 'Lembretes de reserva',
    description: 'Receba um lembrete antes da data da sua reserva.',
  },
  {
    key: 'newsAndEvents',
    title: 'Novidades e eventos',
    description: 'Fique por dentro de eventos especiais, degustações e experiências exclusivas.',
  },
  {
    key: 'promotions',
    title: 'Promoções',
    description: 'Receba ofertas e conteúdos especiais do The Wine Experience.',
  },
];

export function NotificationsTab() {
  const { notifications, toggleNotification, saveWhatsAppNumber } = useAccountSettings();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  return (
    <div className={styles.tabContent}>
      {/* Card 1: Notificações por e-mail */}
      <section className={styles.cardSection} aria-labelledby="email-notifications-heading">
        <div className={styles.sectionHeader}>
          <Bell className={styles.sectionHeaderIcon} aria-hidden="true" />
          <div className={styles.sectionHeaderText}>
            <h2 id="email-notifications-heading" className={styles.sectionTitle}>
              Notificações por e-mail
            </h2>
            <p className={styles.sectionDescription}>
              Receba informações sobre suas reservas, eventos e novidades do The Wine Experience.
            </p>
          </div>
        </div>

        <div className={styles.toggleList}>
          {emailNotificationItems.map((item) => {
            const isChecked = notifications[item.key];
            return (
              <div key={item.key} className={styles.toggleRow}>
                <div className={styles.toggleInfo}>
                  <span className={styles.toggleTitle}>{item.title}</span>
                  <span className={styles.toggleDesc}>{item.description}</span>
                </div>

                <label className={styles.switchToggle} aria-label={item.title}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => void toggleNotification(item.key, e.target.checked)}
                  />
                  <span className={styles.switchSlider} />
                </label>
              </div>
            );
          })}
        </div>
      </section>

      {/* Card 2: Notificações por WhatsApp */}
      <section className={styles.cardSection} aria-labelledby="whatsapp-notifications-heading">
        <div className={styles.sectionHeader}>
          <WhatsAppIcon className={styles.sectionHeaderIcon} aria-hidden="true" />
          <div className={styles.sectionHeaderText}>
            <h2 id="whatsapp-notifications-heading" className={styles.sectionTitle}>
              Notificações por WhatsApp
            </h2>
            <p className={styles.sectionDescription}>
              Receba confirmações e lembretes importantes também pelo WhatsApp.
            </p>
          </div>
        </div>

        <div className={styles.whatsAppBox}>
          <div className={styles.whatsAppLeft}>
            <div className={styles.whatsAppIconCircle}>
              <WhatsAppIcon className="w-5 h-5 text-[#D3B97B]" />
            </div>
            <div>
              <div className={styles.whatsAppTitle}>
                {notifications.whatsAppConfigured
                  ? 'WhatsApp configurado'
                  : 'WhatsApp não configurado'}
              </div>
              <div className={styles.whatsAppSubtitle}>
                {notifications.whatsAppConfigured
                  ? `Número ativo: ${notifications.whatsAppNumber || 'Configurado'}`
                  : 'Adicione seu número de WhatsApp para receber notificações.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className={styles.goldOutlineButton}
          >
            {notifications.whatsAppConfigured ? 'Alterar número' : 'Adicionar número'}
          </button>
        </div>
      </section>

      {/* WhatsApp Modal */}
      <AddWhatsAppModal
        isOpen={isWhatsAppModalOpen}
        currentNumber={notifications.whatsAppNumber}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSave={saveWhatsAppNumber}
      />
    </div>
  );
}
