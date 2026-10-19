'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Calendar,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAccountSettings } from '../AccountSettingsContext';
import { VisaBadge, MastercardBadge, PixBadge } from '../PaymentBrandBadge';
import { AddPaymentModal } from '../modals/AddPaymentModal';
import styles from '../AccountSettings.module.css';

const ITEMS_PER_PAGE = 6;

export function BankingDataTab() {
  const {
    paymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    filteredTransactions,
    transactionFilter,
    setTransactionFilter,
  } = useAccountSettings();

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);
  const scrollFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
    if (scrollFieldRef.current) {
      scrollFieldRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filterLabels: Record<string, string> = {
    todos: 'Todos os tipos',
    reservas: 'Reservas',
    reembolsos: 'Reembolsos',
  };

  return (
    <div className={`${styles.tabContent} ${styles.bankingTabContent}`}>
      {/* Card 1: Formas de pagamento */}
      <section className={styles.cardSection} aria-labelledby="payment-methods-heading">
        <div className={styles.sectionHeaderWithAction}>
          <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
            <CreditCard className={styles.sectionHeaderIcon} aria-hidden="true" />
            <div className={styles.sectionHeaderText}>
              <h2 id="payment-methods-heading" className={styles.sectionTitle}>
                Formas de pagamento
              </h2>
              <p className={styles.sectionDescription}>
                Adicione e gerencie seus cartões e outras formas de pagamento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddCardOpen(true)}
            className={styles.primaryGoldButton}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Adicionar forma de pagamento</span>
          </button>
        </div>

        <div className={styles.cardList}>
          {paymentMethods.map((pm) => (
            <div key={pm.id} className={styles.paymentCardItem}>
              <div className={styles.cardItemLeft}>
                {pm.brand === 'visa' && <VisaBadge />}
                {pm.brand === 'mastercard' && <MastercardBadge />}
                {pm.brand !== 'visa' && pm.brand !== 'mastercard' && (
                  <CreditCard className="w-6 h-6 text-[#D3B97B]" />
                )}

                <div className={styles.cardItemTitleRow}>
                  <span className={styles.cardTypeName}>{pm.type}</span>
                  {pm.isPrimary && (
                    <span className={styles.cardPrimaryBadge}>Principal</span>
                  )}
                </div>
              </div>

              <div className={styles.cardItemRight}>
                <span className={styles.cardNumberMasked}>
                  •••• •••• •••• {pm.last4}
                </span>
                <span className={styles.cardExpiry}>
                  Validade {pm.expiry}
                </span>

                <button
                  type="button"
                  onClick={() => void removePaymentMethod(pm.id)}
                  className={styles.deleteCardButton}
                  title="Remover forma de pagamento"
                  aria-label={`Remover cartão final ${pm.last4}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Card 2: Histórico de transações */}
      <section
        className={`${styles.cardSection} ${styles.transactionsCardSection}`}
        aria-labelledby="transaction-history-heading"
      >
        <div className={styles.sectionHeaderWithAction}>
          <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
            <Clock className={styles.sectionHeaderIcon} aria-hidden="true" />
            <div className={styles.sectionHeaderText}>
              <h2 id="transaction-history-heading" className={styles.sectionTitle}>
                Histórico de transações
              </h2>
              <p className={styles.sectionDescription}>
                Acompanhe suas reservas, pagamentos e reembolsos.
              </p>
            </div>
          </div>

          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={styles.filterDropdownButton}
              aria-haspopup="true"
              aria-expanded={isFilterOpen}
            >
              <span>{filterLabels[transactionFilter] || 'Todos os tipos'}</span>
              <ChevronDown size={15} />
            </button>

            {isFilterOpen && (
              <div className={styles.filterMenu} role="menu">
                <button
                  type="button"
                  className={`${styles.filterMenuItem} ${transactionFilter === 'todos' ? styles.filterMenuItemActive : ''}`}
                  onClick={() => {
                    setTransactionFilter('todos');
                    setIsFilterOpen(false);
                  }}
                  role="menuitem"
                >
                  Todos os tipos
                </button>
                <button
                  type="button"
                  className={`${styles.filterMenuItem} ${transactionFilter === 'reservas' ? styles.filterMenuItemActive : ''}`}
                  onClick={() => {
                    setTransactionFilter('reservas');
                    setIsFilterOpen(false);
                  }}
                  role="menuitem"
                >
                  Reservas
                </button>
                <button
                  type="button"
                  className={`${styles.filterMenuItem} ${transactionFilter === 'reembolsos' ? styles.filterMenuItemActive : ''}`}
                  onClick={() => {
                    setTransactionFilter('reembolsos');
                    setIsFilterOpen(false);
                  }}
                  role="menuitem"
                >
                  Reembolsos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable field containing the transaction items */}
        <div ref={scrollFieldRef} className={styles.transactionsScrollField}>
          <table className={styles.transactionsTable}>
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição</th>
                <th scope="col">Tipo</th>
                <th scope="col">Forma de pagamento</th>
                <th scope="col">Status</th>
                <th scope="col">Valor</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td className={styles.tableDescriptionCell}>{tx.description}</td>
                  <td>
                    <div className={styles.tableTypeCell}>
                      {tx.type === 'Reserva' ? (
                        <Calendar className={styles.tableTypeIcon} aria-hidden="true" />
                      ) : (
                        <RotateCcw className={styles.tableTypeIcon} aria-hidden="true" />
                      )}
                      <span>{tx.type}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.tablePaymentCell}>
                      {tx.paymentBrand === 'visa' && <VisaBadge />}
                      {tx.paymentBrand === 'mastercard' && <MastercardBadge />}
                      {tx.paymentBrand === 'pix' && <PixBadge />}
                      <span>{tx.paymentDetails}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        tx.status === 'Pago'
                          ? styles.statusPaid
                          : tx.status === 'Concluído'
                          ? styles.statusCompleted
                          : styles.statusCancelled
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className={styles.tableAmount}>{tx.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls below the transactions field */}
        {totalPages > 1 && (
          <div className={styles.transactionsPagination} aria-label="Paginação de transações">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              className={styles.paginationButton}
            >
              <ChevronLeft size={15} aria-hidden="true" />
              <span>Página anterior</span>
            </button>

            <span className={styles.paginationInfo}>
              Página <strong>{safePage}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              className={styles.paginationButton}
            >
              <span>Próxima página</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* Modal to add payment method */}
      <AddPaymentModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onAdd={addPaymentMethod}
      />
    </div>
  );
}
