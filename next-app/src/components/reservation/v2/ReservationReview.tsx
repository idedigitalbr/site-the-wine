'use client';

import { Armchair, CalendarDays, Clock3, FileText, Pencil, SlidersHorizontal, Users } from 'lucide-react';
import Image from 'next/image';
import type { AuthenticatedPublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';

type ReservationReviewProps = { values: AuthenticatedPublicReservationInput; holdExpiresAt: number | null; user: { name: string } | null; onEdit: (step: number) => void };
const needLabels: Record<string, string> = { accessibility: 'Acessibilidade', high_chair: 'Cadeira infantil', dietary_restriction: 'Restrição alimentar', food_allergy: 'Alergia alimentar', reduced_mobility: 'Mobilidade reduzida', other: 'Outra necessidade' };

function formatDate(value: string) { const [year, month, day] = value.split('-').map(Number); return year && month && day ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day, 12)) : 'Data não informada'; }
function formatExpiry(value: number) { return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function needText(values: AuthenticatedPublicReservationInput) { return values.specialNeeds.length ? values.specialNeeds.map((need) => needLabels[need] ?? need).join(', ') : 'Nenhuma necessidade informada'; }

function ReviewRow({ icon: Icon, label, value, detail, step, onEdit }: { icon: typeof CalendarDays; label: string; value: string; detail?: string; step?: number; onEdit?: (step: number) => void }) {
  return <div className="reservation-review-row"><Icon aria-hidden="true" size={22} /><div className="reservation-review-row-copy"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>{step && onEdit && <button type="button" className="reservation-review-edit" onClick={() => onEdit(step)}><Pencil aria-hidden="true" size={12} />Editar</button>}</div>;
}

export function ReservationReview({ values, holdExpiresAt, user, onEdit }: ReservationReviewProps) {
  return <div className="reservation-review-shell"><div className="reservation-review-grid"><ReviewRows values={values} user={user} onEdit={onEdit} /><ReviewSummary values={values} holdExpiresAt={holdExpiresAt} /></div></div>;
}

function ReviewRows({ values, user, onEdit }: { values: AuthenticatedPublicReservationInput; user: { name: string } | null; onEdit: (step: number) => void }) {
  const preferences = needText(values);
  const personLabel = values.guests === 1 ? 'pessoa' : 'pessoas';
  const tableDetail = values.tableIds.length ? `${values.tableIds.length} mesas alocadas pelo salão` : 'Alocação confirmada ao continuar';
  return <div className="reservation-review-main"><div className="reservation-review-heading"><FileText aria-hidden="true" size={24} /><div><h2>Confira sua reserva</h2><p>Verifique os detalhes da sua reserva antes de confirmar.</p></div></div><div className="reservation-review-rows"><ReviewRow icon={Users} label="Seus dados" value={user?.name ?? 'Conta autenticada'} detail="Dados da sua sessão" /><ReviewRow icon={CalendarDays} label="Data e horário" value={formatDate(values.date)} detail={`${values.time || 'Horário não informado'} · ${values.duration} minutos`} step={2} onEdit={onEdit} /><ReviewRow icon={Users} label="Pessoas" value={`${values.guests} ${personLabel}`} detail={tableDetail} step={3} onEdit={onEdit} /><ReviewRow icon={SlidersHorizontal} label="Preferências" value={preferences} detail={values.notes.trim() || 'Sem observações adicionais.'} step={4} onEdit={onEdit} /></div></div>;
}

function SummaryItem({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div><Icon aria-hidden="true" size={16} /><span>{label}</span><strong>{value}</strong></div>;
}

function ReviewSummary({ values, holdExpiresAt }: { values: AuthenticatedPublicReservationInput; holdExpiresAt: number | null }) {
  const preferences = needText(values);
  const personLabel = values.guests === 1 ? 'pessoa' : 'pessoas';
  const holdLabel = holdExpiresAt ? ` · mesa mantida até ${formatExpiry(holdExpiresAt)}` : '';
  return <aside className="reservation-review-summary" aria-label="Resumo da reserva"><Image src="/assets/Ambiente/mesa-reservada-adega.webp" alt="" className="reservation-review-summary-photo" width={640} height={107} sizes="(max-width: 899px) 100vw, 36vw" unoptimized /><div className="reservation-review-summary-body"><h3>Resumo da reserva<span className="reservation-review-inline-hold" role={holdExpiresAt ? 'status' : undefined}>{holdLabel}</span></h3><SummaryItem icon={CalendarDays} label="Data" value={formatDate(values.date)} /><SummaryItem icon={Clock3} label="Horário" value={values.time || 'Não informado'} /><SummaryItem icon={Users} label="Pessoas" value={`${values.guests} ${personLabel}`} /><SummaryItem icon={Armchair} label="Preferências" value={preferences} /></div></aside>;
}
