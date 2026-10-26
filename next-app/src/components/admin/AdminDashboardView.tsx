"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Eye,
  Filter,
  Hourglass,
  LayoutGrid,
  LoaderCircle,
  MoreVertical,
  Plus,
  Search,
  UsersRound,
  Utensils,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  AdminDashboard,
  AdminDashboardReservation,
} from "@/modules/admin/application/ports";
import { reservationStatusLabel } from "@/lib/admin-labels";

/* eslint-disable complexity */

type Props = { initialDashboard: AdminDashboard };
const statusOptions = [
  "payment_pending",
  "pending",
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
  "expired",
] as const;
const chartColours = [
  "#4caa71",
  "#f5bf1f",
  "#f39934",
  "#f04a45",
  "#f4a5aa",
  "#8090a5",
  "#ad7d3c",
  "#6874a7",
];

function donutSegments(distribution: AdminDashboard["distribution"]): string {
  return distribution
    .map((item, index) => {
      const start = distribution
        .slice(0, index)
        .reduce((total, entry) => total + entry.percentage, 0);
      return `${chartColours[index % chartColours.length]} ${start}% ${start + item.percentage}%`;
    })
    .join(", ");
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

function periodLabel(from: string, to: string): string {
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const yesterdayDate = new Date(`${today}T12:00:00Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);
  if (from === to && from === today) return "Hoje";
  if (from === to && from === yesterday) return "Ontem";
  if (from === to) return formatDate(from);
  if (to === today) return `${formatDate(from)} – hoje`;
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function number(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}
function statusTone(status: string): string {
  if (status === "confirmed" || status === "seated" || status === "completed")
    return "bg-[#4caa71]";
  if (status === "cancelled" || status === "no_show" || status === "expired")
    return "bg-[#f04a45]";
  return "bg-[#f5bf1f]";
}
function paymentTone(
  status: AdminDashboardReservation["paymentStatus"],
): string {
  if (status === "paid") return "text-[#4caa71]";
  if (status === "pending") return "text-[#f04a45]";
  return "text-muted";
}

type DashboardRequest = {
  from: string;
  to: string;
  page: number;
  search: string;
  status: string;
  time: string;
  areaId: string;
};

async function requestDashboard(
  request: DashboardRequest,
): Promise<AdminDashboard> {
  const summaryParams = new URLSearchParams({
    from: request.from,
    to: request.to,
    page: "1",
    pageSize: "9",
  });
  const reservationParams = new URLSearchParams({
    from: request.from,
    to: request.to,
    page: String(request.page),
    pageSize: "9",
  });
  if (request.search) reservationParams.set("search", request.search);
  if (request.status) reservationParams.set("status", request.status);
  if (request.time) reservationParams.set("time", request.time);
  if (request.areaId !== "") reservationParams.set("areaId", request.areaId);
  const [summaryResponse, reservationsResponse] = await Promise.all([
    fetch(`/api/admin/dashboard?${summaryParams.toString()}`, {
      cache: "no-store",
    }),
    fetch(`/api/admin/dashboard/reservations?${reservationParams.toString()}`, {
      cache: "no-store",
    }),
  ]);
  if (!summaryResponse.ok || !reservationsResponse.ok)
    throw new Error("dashboard_failed");
  const summary = (await summaryResponse.json()) as AdminDashboard;
  const reservations =
    (await reservationsResponse.json()) as AdminDashboard["reservations"];
  return { ...summary, reservations };
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
  progress,
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  helper?: string;
  progress?: number;
}) {
  return (
    <article className="rounded-[var(--radius-md)] border border-border bg-surface px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-foreground/90">
          {label}
        </span>
        <Icon
          aria-hidden="true"
          className="text-primary"
          size={22}
          strokeWidth={1.8}
        />
      </div>
      <strong className="mt-2 block font-display text-[32px] leading-none text-foreground">
        {value}
      </strong>
      {progress !== undefined ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#eee9df]">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{helper}</p>
        </div>
      ) : helper ? (
        <p className="mt-2 text-xs text-muted">{helper}</p>
      ) : null}
    </article>
  );
}

function ReservationDetails({
  reservation,
  onClose,
}: {
  reservation: AdminDashboardReservation;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-lg rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-reservation-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Consulta da reserva
            </p>
            <h2
              id="dashboard-reservation-title"
              className="mt-1 font-display text-3xl text-foreground"
            >
              {reservation.customerName}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatDate(reservation.reservationDate)} ·{" "}
              {reservation.startTime}–{reservation.endTime}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-muted">Grupo</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {number(reservation.guestCount)}{" "}
              {reservation.guestCount === 1 ? "pessoa" : "pessoas"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Status</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {reservationStatusLabel(reservation.status)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Mesas estimadas</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {reservation.estimatedTableLabel ?? "A definir"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Pagamento</dt>
            <dd
              className={`mt-1 font-semibold ${paymentTone(reservation.paymentStatus)}`}
            >
              {reservation.paymentLabel}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Telefone</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {reservation.customerPhone}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Código</dt>
            <dd className="mt-1 font-semibold text-foreground">
              {reservation.publicCode}
            </dd>
          </div>
        </dl>
        <p className="mt-6 rounded border border-primary/25 bg-primary/5 p-3 text-xs text-muted">
          Consulta somente leitura. Alterações continuam disponíveis em
          Reservas.
        </p>
      </section>
    </div>
  );
}

function DashboardRangePopover({
  open,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApply,
}: {
  open: boolean;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApply: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute right-0 top-12 z-20 w-72 rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-lg">
      <p className="text-xs font-semibold text-foreground">Período analisado</p>
      <div className="mt-3 grid gap-3">
        <label className="text-xs text-muted">
          De
          <input
            type="date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="admin-input mt-1"
          />
        </label>
        <label className="text-xs text-muted">
          Até
          <input
            type="date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            className="admin-input mt-1"
          />
        </label>
        <button
          type="button"
          onClick={onApply}
          className="admin-primary-button justify-center"
        >
          Aplicar período
        </button>
      </div>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <p
      hidden={!message}
      role="alert"
      className="mt-4 rounded border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger"
    >
      {message}
    </p>
  );
}

function DashboardLoadingNotice({ loading }: { loading: boolean }) {
  return (
    <div
      hidden={!loading}
      className="flex items-center gap-2 border-b border-border bg-primary/5 px-5 py-2 text-xs text-primary"
    >
      <LoaderCircle size={14} className="animate-spin" /> Atualizando dados...
    </div>
  );
}

function EmptyReservationsNotice({ visible }: { visible: boolean }) {
  return (
    <p hidden={!visible} className="px-6 py-12 text-center text-sm text-muted">
      Nenhuma reserva encontrada para os filtros atuais.
    </p>
  );
}

function PendingAlerts({
  alerts,
  reservations,
  onSelect,
}: {
  alerts: AdminDashboard["alerts"];
  reservations: AdminDashboardReservation[];
  onSelect: (reservation: AdminDashboardReservation) => void;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-[26px] leading-none text-foreground">
          Ações pendentes
        </h2>
        <span className="rounded-full bg-[#f04a45] px-2 py-0.5 text-xs font-bold text-white">
          {alerts.length}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="mt-5 text-sm text-muted">Nenhum pagamento pendente.</p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {alerts.map((alert) => (
            <button
              type="button"
              key={alert.id}
              onClick={() => {
                const row = reservations.find((item) => item.id === alert.id);
                if (row) onSelect(row);
              }}
              className="flex w-full items-start gap-3 py-3 text-left first:pt-0"
            >
              <CreditCard
                className="mt-0.5 shrink-0 text-[#f04a45]"
                size={19}
              />
              <span className="min-w-0 flex-1">
                <strong className="block text-sm text-foreground">
                  {alert.title}
                </strong>
                <span className="mt-0.5 block text-xs text-muted">
                  {alert.customerName} · {alert.startTime}
                </span>
                <span className="mt-1 block text-xs text-[#f04a45]">
                  {alert.detail}
                </span>
              </span>
              <ChevronRight className="mt-1 shrink-0 text-primary" size={17} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function LatestUpdates({ updates }: { updates: AdminDashboard["updates"] }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-display text-[26px] leading-none text-foreground">
        Últimas atualizações
      </h2>
      {updates.length === 0 ? (
        <p className="mt-5 text-sm text-muted">
          Nenhuma atualização no período.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {updates.map((update) => (
            <div key={update.id} className="flex gap-3 py-3 first:pt-0">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusTone(update.toStatus ?? "pending")}`}
              />
              <span className="w-10 shrink-0 text-xs text-muted">
                {update.createdAt.slice(11, 16)}
              </span>
              <span className="min-w-0">
                <strong className="block text-sm text-foreground">
                  {update.eventLabel}
                </strong>
                <span className="block text-xs text-muted">
                  {update.customerName}
                  {update.estimatedTableLabel
                    ? ` · ${update.estimatedTableLabel}`
                    : ""}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SelectedReservation({
  reservation,
  onClose,
}: {
  reservation: AdminDashboardReservation | null;
  onClose: () => void;
}) {
  if (!reservation) return null;
  return <ReservationDetails reservation={reservation} onClose={onClose} />;
}

export function AdminDashboardView({ initialDashboard }: Props) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [fromDate, setFromDate] = useState(initialDashboard.fromDate);
  const [toDate, setToDate] = useState(initialDashboard.toDate);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [time, setTime] = useState("");
  const [areaId, setAreaId] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminDashboardReservation | null>(
    null,
  );

  const fetchDashboard = async (
    page = 1,
    overrides: {
      from?: string;
      to?: string;
      search?: string;
      status?: string;
      time?: string;
      areaId?: string;
    } = {},
  ) => {
    setIsLoading(true);
    setError("");
    const nextFrom = overrides.from ?? fromDate;
    const nextTo = overrides.to ?? toDate;
    const nextSearch = overrides.search ?? search;
    const nextStatus = overrides.status ?? status;
    const nextTime = overrides.time ?? time;
    const nextArea = overrides.areaId ?? areaId;
    try {
      setDashboard(
        await requestDashboard({
          from: nextFrom,
          to: nextTo,
          page,
          search: nextSearch,
          status: nextStatus,
          time: nextTime,
          areaId: nextArea,
        }),
      );
    } catch {
      setError("Não foi possível atualizar a Central de operações.");
    } finally {
      setIsLoading(false);
    }
  };
  const chartMax = Math.max(
    1,
    ...dashboard.availability.map((slot) => slot.committed + slot.available),
  );
  const displayedPeriodLabel =
    fromDate === dashboard.fromDate && toDate === dashboard.toDate
      ? dashboard.periodLabel
      : periodLabel(fromDate, toDate);
  const donut = useMemo(
    () => donutSegments(dashboard.distribution),
    [dashboard.distribution],
  );
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setTime("");
    setAreaId("");
    void fetchDashboard(1, { search: "", status: "", time: "", areaId: "" });
  };

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="font-display text-[42px] leading-none text-foreground sm:text-5xl">
            Central de operações
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Acompanhe as reservas do dia, mesas e garantias de vaga em tempo
            real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRangeOpen((value) => !value)}
              className="admin-secondary-button min-h-10 bg-surface px-4"
            >
              <CalendarDays size={17} />
              {displayedPeriodLabel}
              <ChevronDown size={15} />
            </button>
            <DashboardRangePopover
              open={rangeOpen}
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onApply={() => {
                setRangeOpen(false);
                void fetchDashboard(1, { from: fromDate, to: toDate });
              }}
            />
          </div>
          <button
            type="button"
            className="admin-secondary-button min-h-10 bg-surface px-3"
            aria-label="Filtros"
          >
            <Filter size={18} />
          </button>
          <button
            type="button"
            disabled
            className="admin-primary-button min-h-10 opacity-90"
          >
            <Plus size={17} /> Nova reserva{" "}
            <span className="text-xs opacity-75">Em breve</span>
          </button>
        </div>
      </header>
      <DashboardError message={error} />
      <section
        aria-label="Indicadores do período"
        className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      >
        <MetricCard
          label="Reservas do dia"
          value={number(dashboard.metrics.reservations)}
          icon={CalendarDays}
          helper="no período selecionado"
        />
        <MetricCard
          label="Pessoas esperadas"
          value={number(dashboard.metrics.expectedGuests)}
          icon={UsersRound}
          helper="reservas ainda válidas"
        />
        <MetricCard
          label="Mesas reservadas"
          value={number(dashboard.metrics.reservedTables)}
          icon={Utensils}
          helper={`de ${dashboard.metrics.totalTables} mesas · estimativa`}
        />
        <MetricCard
          label="Garantias ativas"
          value={number(dashboard.metrics.activeGuarantees)}
          icon={Hourglass}
          helper="prazo em andamento"
        />
        <MetricCard
          label="Pagamentos pendentes"
          value={number(dashboard.metrics.pendingPayments)}
          icon={CreditCard}
          helper="aguardando confirmação"
        />
        <MetricCard
          label="Ocupação prevista"
          value={`${dashboard.metrics.occupancyRate}%`}
          icon={CircleDollarSign}
          progress={dashboard.metrics.occupancyRate}
          helper="estimativa provisória"
        />
      </section>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,2.05fr)_minmax(300px,0.95fr)]">
        <section
          className="min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm"
          aria-labelledby="reservas-dia-title"
        >
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2
                  id="reservas-dia-title"
                  className="font-display text-[29px] leading-none text-foreground"
                >
                  Reservas do dia
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Lista completa de reservas para o dia selecionado.
                </p>
              </div>
              <label className="relative block w-full max-w-[290px]">
                <span className="sr-only">
                  Buscar por nome, mesa ou telefone
                </span>
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void fetchDashboard(1);
                  }}
                  className="admin-input h-10 pl-9 text-sm"
                  placeholder="Buscar por nome, mesa ou telefone..."
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="relative">
                <span className="sr-only">Horário</span>
                <select
                  value={time}
                  onChange={(event) => {
                    setTime(event.target.value);
                    void fetchDashboard(1, { time: event.target.value });
                  }}
                  className="admin-input h-9 min-w-[145px] appearance-none pr-8 text-xs"
                >
                  <option value="">Todos os horários</option>
                  {dashboard.availability.map((slot) => (
                    <option key={slot.label} value={slot.label}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                  size={14}
                />
              </label>
              <label className="relative">
                <span className="sr-only">Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    void fetchDashboard(1, { status: event.target.value });
                  }}
                  className="admin-input h-9 min-w-[145px] appearance-none pr-8 text-xs"
                >
                  <option value="">Todos os status</option>
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {reservationStatusLabel(item)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                  size={14}
                />
              </label>
              <label className="relative">
                <span className="sr-only">Área</span>
                <select
                  value={areaId}
                  onChange={(event) => {
                    setAreaId(event.target.value);
                    void fetchDashboard(1, { areaId: event.target.value });
                  }}
                  className="admin-input h-9 min-w-[145px] appearance-none pr-8 text-xs"
                >
                  <option value="">Todas as áreas</option>
                  <option value="0">Sem área</option>
                  {dashboard.areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary"
                  size={14}
                />
              </label>
              <button
                type="button"
                onClick={clearFilters}
                className="admin-secondary-button h-9 px-3 text-xs"
              >
                <Filter size={14} /> Limpar filtros
              </button>
            </div>
          </div>
          <DashboardLoadingNotice loading={isLoading} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead className="bg-[#fbfaf7] text-xs text-muted">
                <tr>
                  {[
                    "Horário",
                    "Cliente",
                    "Grupo",
                    "Mesas",
                    "Status",
                    "Pagamento",
                    "Ações",
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 font-medium first:pl-5 last:pr-5"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.reservations.items.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-t border-border/80 text-sm"
                  >
                    <td className="px-4 py-3.5 pl-5 text-muted">
                      {reservation.startTime}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground">
                        {reservation.customerName}
                      </span>
                      <span className="block text-xs text-muted">
                        {reservation.customerPhone}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {reservation.guestCount}
                    </td>
                    <td className="max-w-[135px] px-4 py-3.5 text-muted">
                      {reservation.estimatedTableLabel ?? "A definir"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${statusTone(reservation.status)}`}
                        />
                        <span className="text-xs text-foreground">
                          {reservationStatusLabel(reservation.status)}
                        </span>
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3.5 text-xs font-medium ${paymentTone(reservation.paymentStatus)}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-current" />
                        {reservation.paymentLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelected(reservation)}
                          className="inline-flex items-center gap-1 rounded border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
                        >
                          <Eye size={13} /> Abrir
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelected(reservation)}
                          className="rounded p-2 text-primary hover:bg-primary/5"
                          aria-label="Mais ações"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EmptyReservationsNotice
            visible={dashboard.reservations.items.length === 0}
          />
          <footer className="flex flex-col justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted sm:flex-row sm:items-center">
            <span>
              Mostrando {dashboard.reservations.items.length} de{" "}
              {dashboard.reservations.total} reservas
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={dashboard.reservations.page <= 1 || isLoading}
                onClick={() =>
                  void fetchDashboard(dashboard.reservations.page - 1)
                }
                className="rounded border border-border p-2 disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="rounded bg-primary px-3 py-2 font-semibold text-primary-foreground">
                {dashboard.reservations.page}
              </span>
              <button
                type="button"
                disabled={
                  dashboard.reservations.page *
                    dashboard.reservations.pageSize >=
                    dashboard.reservations.total || isLoading
                }
                onClick={() =>
                  void fetchDashboard(dashboard.reservations.page + 1)
                }
                className="rounded border border-border p-2 disabled:opacity-40"
                aria-label="Próxima página"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>
        <aside className="grid gap-5" aria-label="Acompanhamento operacional">
          <PendingAlerts
            alerts={dashboard.alerts}
            reservations={dashboard.reservations.items}
            onSelect={setSelected}
          />
          <LatestUpdates updates={dashboard.updates} />
        </aside>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[26px] leading-none text-foreground">
                Disponibilidade por horário
              </h2>
              <p className="mt-2 text-sm text-muted">
                Mesas comprometidas e mesas disponíveis no período.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-primary" />
              Mesas comprometidas
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[#eee9df]" />
              Mesas disponíveis
            </span>
          </div>
          <p
            hidden={dashboard.availability.length !== 0}
            className="mt-8 rounded border border-dashed border-border p-6 text-center text-sm text-muted"
          >
            Não há horários de reserva no período selecionado.
          </p>
          <div hidden={dashboard.availability.length === 0}>
            <div className="mt-4 flex gap-3">
              <div className="flex h-40 flex-col justify-between text-[10px] text-muted">
                <span>{dashboard.metrics.totalTables}</span>
                <span>{Math.round(dashboard.metrics.totalTables / 2)}</span>
                <span>0</span>
              </div>
              <div className="relative flex min-w-0 flex-1 items-end gap-1 border-b border-l border-border px-2 pb-0">
                {dashboard.availability.map((slot) => (
                  <div
                    key={slot.label}
                    className="group flex min-w-0 flex-1 items-end gap-0.5"
                    title={`${slot.label}: ${slot.committed} comprometidas, ${slot.available} disponíveis`}
                  >
                    <div
                      className="w-1/2 rounded-t bg-primary"
                      style={{
                        height: `${Math.max(2, (slot.committed / chartMax) * 100)}%`,
                      }}
                    />
                    <div
                      className="w-1/2 rounded-t bg-[#eee9df]"
                      style={{
                        height: `${Math.max(2, (slot.available / chartMax) * 100)}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-between pl-8 text-[10px] text-muted">
              <span>{dashboard.availability[0]?.label}</span>
              <span>
                {
                  dashboard.availability[
                    Math.floor(dashboard.availability.length / 2)
                  ]?.label
                }
              </span>
              <span>{dashboard.availability.at(-1)?.label}</span>
            </div>
          </div>
        </section>
        <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
          <h2 className="font-display text-[26px] leading-none text-foreground">
            Distribuição das reservas
          </h2>
          <div className="mt-5 flex items-center gap-5">
            <div
              className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${donut || "#e9e4d9 0 100%"})`,
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-surface text-center">
                <strong className="font-display text-2xl leading-none text-foreground">
                  {number(dashboard.metrics.reservations)}
                </strong>
                <span className="text-[11px] text-muted">reservas</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {dashboard.distribution.map((item, index) => (
                <div
                  key={item.status}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        chartColours[index % chartColours.length],
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {item.label}
                  </span>
                  <span className="font-semibold text-foreground">
                    {item.count}
                  </span>
                  <span className="w-8 text-right text-muted">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[26px] leading-none text-foreground">
              Mesas ocupadas por tipo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Estimativa baseada no inventário temporário do Dashboard.
            </p>
          </div>
          <LayoutGrid className="text-primary" size={23} />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboard.tableTypes.map((item) => (
            <article
              key={item.capacity}
              className="rounded border border-border bg-[#fffefa] p-4"
            >
              <div className="flex items-start gap-3">
                <Utensils className="mt-1 text-primary" size={28} />
                <div>
                  <p className="text-sm text-muted">
                    Mesas de {item.capacity} pessoas
                  </p>
                  <strong className="mt-1 block font-display text-3xl leading-none text-foreground">
                    {item.occupied}
                  </strong>
                  <p className="mt-1 text-xs text-muted">mesas ocupadas</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee9df]">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>de {item.total} mesas</span>
                <span>{item.percentage}%</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SelectedReservation
        reservation={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
