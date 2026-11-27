# SPEC DE EXECUÇÃO — Redesign Visual em Formato Ticket (`/lista-de-reservas`)

**Data:** 19/10/2026  
**Escopo:** Substituição da camada visual dos cards da página `/lista-de-reservas` pelo novo layout de **Ticket / Voucher de Luxo** (Desktop horizontal de largura total + Mobile com canhoto dourado lateral e detalhes expansíveis), preservando 100% do backend, autenticação, hook de estado e navbar compartilhada.  
**Diretório da aplicação:** `c:\Users\Windows\Desktop\The Wine\next-app`

---

## 0. Decisão Arquitetural: O que Reutilizar vs. O que Recriar do Zero

Após análise completa do código existente em `next-app/src/`, das guardas automatizadas (`check-architecture.mjs`, `check-complexity.mjs`, `lucide-icons.test.mjs`) e dos 3 anexos visuais de referência, a decisão fechada para o modelo executor é:

### 0.1 O que MANTER 100% INTACTO (Proibido alterar)
1. **Navbar compartilhada e comportamento global:**
   - `src/components/layout/Header.tsx`
   - `src/components/layout/MobileNavigation.tsx`
   - `src/components/behaviors/SiteBehaviorController.tsx`
   - `src/config/navigation.ts`
   - `src/components/account/FloatingAccountMenu.tsx`
2. **Rota Server Component e Redirecionamento Legado:**
   - `src/app/lista-de-reservas/page.tsx` (já importa `../../../public/style.css`, renderiza `<Header />`, `<SiteBehaviorController />` e executa `getCustomerReservationsPageAccess`).
   - `src/app/area-de-reservas/page.tsx` (mantém `redirect('/lista-de-reservas')`).
3. **Todo o Backend, Banco de Dados, Schemas e API:**
   - `src/app/api/reservations/my/route.ts`
   - `src/server/reservations/customer-reservations-handler.ts`
   - `src/server/reservations/customer-reservations-page-access.ts`
   - `src/server/reservations/list-customer-reservations.ts`
   - `src/modules/reservations/application/list-customer-reservations.ts`
   - `src/modules/reservations/domain/customer-reservation-duration.ts`
   - `src/modules/reservations/infrastructure/mysql-customer-reservation-query.ts`
   - `src/lib/customer-reservations-schema.ts`
   - `src/types/customer-reservations.ts`
4. **Hook de busca, paginação, abort, foco e 401:**
   - `src/components/account/reservations-list/useCustomerReservations.ts` (não tocar: já faz single-flight, controle de `generationRef`, deduplicação, paginação de 20 em 20 e `router.replace('/reservas')` em `401`).
5. **Badge de Status:**
   - `src/components/account/reservations-list/ReservationStatusBadge.tsx` (já renderiza o pill `Confirmada` / `Pendente` com `CircleCheck` / `Clock3` de `lucide-react`; apenas suas classes em `ReservationsList.module.css` serão estilizadas para o novo ticket).

### 0.2 O que RECRIAR / ATUALIZAR (Escopo exclusivo desta implementação)
A estrutura anterior dos cards usava uma grade de 2 colunas (`grid-template-columns: repeat(2, minmax(0, 1fr))`) com caixas retangulares simples. O novo design muda completamente a geometria para **Tickets horizontais empilhados em 1 única coluna vertical**, com recortes côncavos nos cantos, furador semicircular nas laterais, linha tracejada de destaque do canhoto, marca d'água de taça inclinada e versão mobile com canhoto dourado texturizado + gaveta de detalhes (`Preferências` e `Observações`).

Portanto, você deve **recriar o markup e o CSS dos componentes visuais de card** seguindo exatamente o código fornecido nesta spec:
1. **Atualizar (estendendo sem quebrar funções existentes):**
   - `src/components/account/reservations-list/reservationCardFormatters.ts`
2. **Substituir integralmente pelo código desta spec:**
   - `src/components/account/reservations-list/ReservationField.tsx`
   - `src/components/account/reservations-list/ReservationCard.tsx`
   - `src/components/account/reservations-list/AddReservationCard.tsx`
   - `src/components/account/reservations-list/ReservationsListView.tsx`
   - `src/components/account/reservations-list/ReservationsList.module.css`
3. **Atualizar testes para cobrir os novos formatadores de Ticket e validar a nova UI:**
   - `tests/customer-reservations-list.test.mjs`
   - `tests/browser/lista-de-reservas.spec.ts`

---

## 1. Regras Inegociáveis do Repositório (Armadilhas que o Executor Deve Evitar)

1. **PROIBIDO usar a tag `<svg` em arquivos `.tsx` dentro de `src/components/`:**
   - O teste automatizado `tests/lucide-icons.test.mjs` varre recursivamente `src/components/**/*.tsx` e **falha imediatamente** se encontrar `<svg` em qualquer componente (exceto `SocialIcons.tsx` e `AboutSection.tsx`).
   - Para a marca d'água da taça de vinho à direita do ticket, use **obrigatoriamente** o ícone `<Wine />` importado de `lucide-react`.
   - Para os recortes côncavos dos 4 cantos, os furos semicirculares laterais e os entalhes da linha pontilhada, use **obrigatoriamente** elementos HTML (`<span>`) estilizados via CSS em `ReservationsList.module.css`.
2. **Guard de Complexidade (`npm run verify:complexity`):**
   - O script `scripts/check-complexity.mjs` exige que **toda função/componente** tenha:
     - **Complexidade ciclomática máxima = `8`** (cada `if`, `?:`, `&&`, `||`, `??`, `for`, `while`, `catch` soma +1).
     - **Profundidade máxima de blocos = `3`**.
   - Não junte lógica condicional complexa dentro de um único componente. Mantenha os subcomponentes separados exatamente como no código especificado na Seção 3.
3. **Guard de Arquitetura (`npm run verify:architecture`):**
   - Arquivos em `src/components/account/reservations-list/` e `src/app/lista-de-reservas/` nunca podem importar `mysql2`, `@/server/db` ou `/infrastructure/`.
4. **Preservação do Working Tree:**
   - Não executar `git reset`, `git checkout --`, `git clean`, `git commit` ou `git push`.
   - Nota sobre o ambiente: caso rode `npm test` global, saiba que o arquivo não rastreado `src/components/account/settings/PaymentBrandBadge.tsx` (de outra tarefa de `/configuracoes`) possui um SVG inline pré-existente. **Não toque em `src/components/account/settings/`**. Valide seus testes com os comandos específicos da Seção 4.

---

## 2. Referências Visuais e Anatomia Métrica do Ticket

As imagens de referência foram salvas e catalogadas em:
`docs/superpowers/specs/assets/lista-de-reservas-ticket-2026-10-19/`

- `01-desktop-lista-tickets.png` (`1024 × 576 px`) — Lista de tickets de reserva no Desktop.
- `02-mobile-lista-tickets.png` (`341 × 1024 px`) — Lista de tickets no Mobile (1º ticket aberto exibindo Preferências/Observações; demais tickets recolhidos com chevron `>`).
- `03-desktop-ticket-adicionar-reserva.png` (`1024 × 576 px`) — Lista de tickets no Desktop com o ticket `Adicionar reserva` no final.
- Recortes de inspeção em alta definição na mesma pasta:
  - `crop-desktop-ticket-1.png`
  - `crop-desktop-add-ticket.png`
  - `crop-mobile-tickets-top.png`
  - `crop-mobile-tickets-bottom.png`

### 2.1 Anatomia no Desktop (`>= 768px`)

```text
+--------------------------------------------------------------------------------------------------+
|  <- Voltar (pill dourado alinhado à esquerda, href="/")                                          |
+--------------------------------------------------------------------------------------------------+
| (╭)                  ▼                                                                       (╮) |
|    [Cal] DATA        :  (Rel) HORÁRIO     | (Amp) DURAÇÃO      | (Usr) PESSOAS    [Confirmada]   |
|  ) 14 de outubro     :        20:30       |       120 minutos  |       3 pessoas          [Taça] (
|       de 2026        :  ------------------+--------------------+-----------------         d'água |
|    QUARTA-FEIRA      :  (Slid) PREFERÊNCIAS            | (Msg) OBSERVAÇÕES                       |
|                      :         Nenhuma preferência...  |       Sem observações adicionais        |
| (╰)                  ▲                                                                       (╯) |
+--------------------------------------------------------------------------------------------------+
| (╭)        ▼                                                                                 (╮) |
|    ( + )   :   Adicionar reserva                                                  ( -> )  [Taça] (
|            :   AGENDAR UMA NOVA EXPERIÊNCIA                                               d'água |
| (╰)        ▲                                                                                 (╯) |
+--------------------------------------------------------------------------------------------------+
```

- **Contêiner Principal (`mainContainer`):** `max-width: 932px`, `margin: 0 auto`, `padding: 102px 24px 64px` (em `1024px` resulta em largura útil de `884px`, idêntica aos `884px` medidos em `x = 70..953` da referência `01-desktop-lista-tickets.png`).
- **Empilhamento (`cardsGrid`):** Coluna única vertical (`display: flex; flex-direction: column; gap: 11px`).
- **Silhueta do Ticket (`.ticketClip` + `.ticketSurface` + `.ticketCutouts`):**
  - Fundo da página `#000000`.
  - `.ticketClip` possui `position: relative; overflow: hidden;` (sem borda própria).
  - `.ticketSurface` possui `border: 1px solid rgba(211, 185, 123, 0.52)` e fundo escuro com brilho dourado sutil nas extremidades.
  - `.ticketCutouts` posiciona círculos com `background: #000000` e `border: 1px solid rgba(211, 185, 123, 0.52)` sobre `.ticketSurface` (`z-index: 2`):
    - **4 cantos côncavos:** círculos de `14px × 14px` centrados nos 4 vértices (`top/bottom: -7px`, `left/right: -7px`).
    - **2 furos semicirculares laterais:** círculos de `18px × 18px` centrados no meio das bordas esquerda e direita (`left/right: -9px`, `top: 50%`).
    - **2 pequenos entalhes em diamante na linha pontilhada:** quadrados de `6px × 6px` rotacionados `45deg` em `left: var(--stub-width)` no topo (`top: -3px`) e na base (`bottom: -3px`).
- **Canhoto Esquerdo da Reserva no Desktop (`width: 169px`):**
  - Linha 1: ícone `<CalendarDays size={18} />` dourado + label `DATA` (`9px`, uppercase).
  - Linha 2: número do dia em destaque (`31px`, fonte serifada `var(--font-display)`, peso `600`, ex.: `14`) lado a lado com duas linhas (`de outubro` / `de 2026`, `10px`, peso `600`).
  - Linha 3: dia da semana por extenso em caixa alta (`QUARTA-FEIRA`, `7.5px`, `letter-spacing: 0.18em`, cor `#C5AD73`).
- **Miolo Central da Reserva no Desktop (`flex: 1`):**
  - **Linha Superior (3 colunas separadas por divisor vertical `1px solid rgba(211, 185, 123, 0.22)`):**
    - `HORÁRIO` (`20:30`), `DURAÇÃO` (`120 minutos`), `PESSOAS` (`3 pessoas`).
    - Labels em azul-acinzentado `#5E788F` (`8px`, uppercase, `letter-spacing: 0.06em`) e valores em `#F2EFE9` (`11.5px`, `font-weight: 600`).
  - **Divisor Horizontal:** `1px solid rgba(211, 185, 123, 0.16)`.
  - **Linha Inferior (2 colunas separadas por divisor vertical `1px solid rgba(211, 185, 123, 0.22)`):**
    - `PREFERÊNCIAS` (`54%` da largura) e `OBSERVAÇÕES` (`46%` da largura).
    - Labels em `#5E788F` (`8px`, uppercase) e valores em `#F2EFE9` (`9.5px`, `line-height: 1.25`).
- **Zona Direita da Reserva no Desktop (`width: 176px`):**
  - Badge `<ReservationStatusBadge />` alinhado ao topo-esquerda da zona.
  - Marca d'água `<Wine size={42} strokeWidth={1.2} />` inclinada (`transform: rotate(10deg)`), cor `rgba(211, 185, 123, 0.13)`.
- **Ticket `Adicionar reserva` (`AddReservationCard`):**
  - `--stub-width: 82px` no desktop (`72px` no mobile).
  - Canhoto esquerdo: círculo dourado `38px × 38px` com `<Plus size={20} />`.
  - Centro: título `Adicionar reserva` (`font-display`, `23px`) + subtítulo `AGENDAR UMA NOVA EXPERIÊNCIA` (`8px`, `letter-spacing: 0.18em`, uppercase, `#C8B273`).
  - Direita: círculo dourado `34px × 34px` com `<ArrowRight size={16} />` + marca d'água `<Wine size={38} />` inclinada.

### 2.2 Anatomia Responsiva no Mobile (`<= 767px`, referência `02-mobile-lista-tickets.png`)

```text
+-------------------------------------------------------+
| (╭)         ▼                                         |
|     14      |  Reserva             [(v) Confirmada]   |
|     OUT     |  -------------------------------------  |
|  )  2026    |  (Rel) 20:30 | (Amp) 120 | (Usr) 3      |
|     Qua     |              |       min |       pessoas|
|             |  -------------------------------------  |
|             |  (Slid) Preferências                    |
|             |         Nenhuma preferência informada   |
|             |  (Msg)  Observações                     |
|             |         Sem observações adicionais      |
| (╰)         ▲                                         |
+-------------------------------------------------------+
| (╭)         ▼                                         |
|     21      |  Reserva             [(v) Confirmada]   |
|  )  OUT     |  -------------------------------------  |
|     2026    |  (Rel) 20:00 | (Amp) 120 | (Usr) 7    > |
|     Qua     |              |       min |    pessoas   |
| (╰)         ▲                                         |
+-------------------------------------------------------+
```

- **Geometria Mobile (`@media (max-width: 767px)`):**
  - `--stub-width: 72px`.
  - Os cantos direitos do ticket são arredondados normais (`border-radius: 0 10px 10px 0`) e o furo semicircular direito fica oculto (`display: none`).
  - Os cantos esquerdos côncavos, o furo semicircular esquerdo e os entalhes da divisão do canhoto permanecem visíveis.
- **Canhoto Esquerdo Mobile (`width: 72px`):**
  - Fundo dourado/bronze texturizado quente (`radial-gradient` + `linear-gradient`).
  - Empilhamento centralizado vertical e horizontalmente:
    1. Dia (`14`) em `24px`, `font-weight: 700`, cor `#F2C96B`.
    2. Mês abreviado (`OUT`) em `10px`, `font-weight: 700`, cor `#F5F2EB`.
    3. Ano (`2026`) em `10px`, `font-weight: 600`, cor `#F5F2EB`.
    4. Dia da semana abreviado (`Qua`, `Qui`, `Sex`) em `10px`, `font-weight: 400`, cor `#D5CBB8`.
- **Corpo Direito Mobile (`flex: 1`):**
  - **Cabeçalho Mobile:** Título `Reserva` (`font-display`, `16px`, `#F5F2EB`) à esquerda + `<ReservationStatusBadge />` à direita.
  - **Faixa Resumo Clicável (`button` invisível semântico com `aria-expanded`):**
    - Exibe 3 colunas compactas separadas por linhas verticais sutis:
      1. `<Clock3 size={15} />` + `20:30`
      2. `<Hourglass size={15} />` + `120` sobre `min`
      3. `<Users size={15} />` + `3` sobre `pessoas`
    - Quando o card está **recolhido**, exibe `<ChevronRight size={14} />` dourado na extremidade direita da faixa (exatamente como nos cards 2 a 6 do Anexo 2).
    - Quando o card está **expandido**, oculta o chevron da faixa e exibe a seção de detalhes abaixo da linha divisória (`Preferências` e `Observações`), exatamente como no card 1 do Anexo 2.
  - **Estado Inicial de Expansão no Mobile:**
    - O **1º card da lista** (`index === 0`) inicia **expandido** (`defaultMobileExpanded={true}`).
    - Os demais cards (`index >= 1`) iniciam **recolhidos** (`defaultMobileExpanded={false}`).
    - Toque/clique na faixa resumo alterna (`toggle`) entre expandido e recolhido.

---

## 3. Implementação Passo a Passo (Código Completo por Arquivo)

### Passo 1: Atualizar `src/components/account/reservations-list/reservationCardFormatters.ts`

Substitua o conteúdo de `next-app/src/components/account/reservations-list/reservationCardFormatters.ts` pelo código abaixo. Ele **preserva todas as funções exportadas anteriores** (para não quebrar testes existentes) e adiciona `formatReservationTicketDate`, `formatCompactDurationParts` e `formatCompactGuestParts`:

```ts
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

const preferenceOrder = [
  'accessibility',
  'dietary_restriction',
  'food_allergy',
  'high_chair',
  'reduced_mobility',
  'other',
] as const;

const preferenceLabels: Record<(typeof preferenceOrder)[number], string> = {
  accessibility: 'Acessibilidade',
  dietary_restriction: 'Restrição alimentar',
  food_allergy: 'Alergia alimentar',
  high_chair: 'Cadeira infantil',
  reduced_mobility: 'Mobilidade reduzida',
  other: 'Outra necessidade',
};

const monthsLong = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const monthsShort = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

const weekdaysLong = [
  'DOMINGO',
  'SEGUNDA-FEIRA',
  'TERÇA-FEIRA',
  'QUARTA-FEIRA',
  'QUINTA-FEIRA',
  'SEXTA-FEIRA',
  'SÁBADO',
] as const;

const weekdaysShort = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
] as const;

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  draft: 'Pendente',
  hold: 'Pendente',
  payment_pending: 'Pendente',
  pending: 'Pendente',
  confirmed: 'Confirmada',
  seated: 'Em atendimento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
  expired: 'Expirada',
};

export type ReservationTicketDateParts = {
  isValid: boolean;
  day: string;
  monthYearLine1: string;
  monthYearLine2: string;
  weekdayLong: string;
  monthShort: string;
  year: string;
  weekdayShort: string;
  fullLabel: string;
};

type ParsedCalendarDate = {
  year: number;
  monthIndex: number;
  day: number;
  dayText: string;
  yearText: string;
  weekdayIndex: number;
};

const invalidTicketDateParts: ReservationTicketDateParts = {
  isValid: false,
  day: '--',
  monthYearLine1: 'Data não',
  monthYearLine2: 'informada',
  weekdayLong: 'DATA INDISPONÍVEL',
  monthShort: '---',
  year: '----',
  weekdayShort: '---',
  fullLabel: 'Data não informada',
};

function isSameUtcCalendarDate(date: Date, year: number, monthIndex: number, day: number): boolean {
  if (date.getUTCFullYear() !== year) return false;
  if (date.getUTCMonth() !== monthIndex) return false;
  return date.getUTCDate() === day;
}

function parseIsoCalendarDate(value: string): ParsedCalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (!isSameUtcCalendarDate(date, year, monthIndex, day)) return null;
  return {
    year,
    monthIndex,
    day,
    dayText,
    yearText,
    weekdayIndex: date.getUTCDay(),
  };
}

export function formatReservationDate(value: string): string {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return 'Data não informada';
  return `${parsed.dayText} de ${monthsLong[parsed.monthIndex]} de ${parsed.yearText}`;
}

export function formatReservationTicketDate(value: string): ReservationTicketDateParts {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return invalidTicketDateParts;
  const monthName = monthsLong[parsed.monthIndex];
  return {
    isValid: true,
    day: parsed.dayText,
    monthYearLine1: `de ${monthName}`,
    monthYearLine2: `de ${parsed.yearText}`,
    weekdayLong: weekdaysLong[parsed.weekdayIndex],
    monthShort: monthsShort[parsed.monthIndex],
    year: parsed.yearText,
    weekdayShort: weekdaysShort[parsed.weekdayIndex],
    fullLabel: `${parsed.dayText} de ${monthName} de ${parsed.yearText}`,
  };
}

export function formatReservationDuration(value: number | null): string {
  if (value === null) return 'Duração não informada';
  return value === 1 ? '1 minuto' : `${value} minutos`;
}

export function formatCompactDurationParts(value: number | null): { primary: string; unit: string | null } {
  if (value === null) return { primary: 'Não inf.', unit: null };
  return { primary: String(value), unit: 'min' };
}

export function formatGuestCount(value: number): string {
  return value === 1 ? '1 pessoa' : `${value} pessoas`;
}

export function formatCompactGuestParts(value: number): { count: string; unit: string } {
  return {
    count: String(value),
    unit: value === 1 ? 'pessoa' : 'pessoas',
  };
}

export function formatSpecialNeeds(values: string[]): string {
  const useful = [...new Set(values.map((value) => value.trim()).filter((value) => value && value !== 'none'))];
  const known = preferenceOrder.filter((code) => useful.includes(code)).map((code) => preferenceLabels[code]);
  const hasUnknown = useful.some((code) => !preferenceOrder.includes(code as (typeof preferenceOrder)[number]));
  const labels = hasUnknown ? [...known, 'Preferência não identificada'] : known;
  return labels.length > 0 ? labels.join(', ') : 'Nenhuma preferência informada';
}

export function formatReservationNotes(value: string): string {
  return value.trim() || 'Sem observações adicionais';
}
```

---

### Passo 2: Atualizar `src/components/account/reservations-list/ReservationField.tsx`

Substitua `next-app/src/components/account/reservations-list/ReservationField.tsx` pelo código abaixo:

```tsx
import type { LucideIcon } from 'lucide-react';
import styles from './ReservationsList.module.css';

type ReservationFieldProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  iconSize?: number;
};

export function ReservationField({
  icon: Icon,
  label,
  value,
  className = '',
  iconSize = 15,
}: ReservationFieldProps) {
  return (
    <div className={`${styles.fieldCell} ${className}`}>
      <Icon className={styles.fieldIcon} aria-hidden="true" size={iconSize} strokeWidth={1.6} />
      <dl className={styles.fieldCopy}>
        <dt className={styles.fieldLabel}>{label}</dt>
        <dd className={styles.fieldValue}>{value}</dd>
      </dl>
    </div>
  );
}
```

---

### Passo 3: Atualizar `src/components/account/reservations-list/ReservationCard.tsx`

Substitua `next-app/src/components/account/reservations-list/ReservationCard.tsx` pelo código abaixo. Observe que:
- Não há nenhum `<svg>` manual (usa apenas ícones de `lucide-react`, incluindo `Wine` para a taça em marca d'água e `ChevronRight` para o indicador mobile).
- Todas as funções respeitam complexidade ciclomática `<= 4` e profundidade `<= 1`.
- O atributo `data-reservation-card` é preservado no `<article>` para manter total compatibilidade com os testes e seletores existentes.

```tsx
'use client';

import { useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Hourglass,
  MessageSquareMore,
  SlidersHorizontal,
  Users,
  Wine,
} from 'lucide-react';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import { ReservationField } from './ReservationField';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import {
  formatCompactDurationParts,
  formatCompactGuestParts,
  formatGuestCount,
  formatReservationDuration,
  formatReservationNotes,
  formatReservationTicketDate,
  formatSpecialNeeds,
  type ReservationTicketDateParts,
} from './reservationCardFormatters';
import styles from './ReservationsList.module.css';

export function TicketCutouts() {
  return (
    <span className={styles.ticketCutouts} aria-hidden="true">
      <span className={`${styles.cornerCutout} ${styles.cornerTopLeft}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerTopRight}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerBottomLeft}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerBottomRight}`} />
      <span className={`${styles.sideNotch} ${styles.sideNotchLeft}`} />
      <span className={`${styles.sideNotch} ${styles.sideNotchRight}`} />
      <span className={`${styles.seamNotch} ${styles.seamNotchTop}`} />
      <span className={`${styles.seamNotch} ${styles.seamNotchBottom}`} />
    </span>
  );
}

function TicketDateStub({ dateParts }: { dateParts: ReservationTicketDateParts }) {
  return (
    <div className={styles.ticketStub}>
      <div className={styles.desktopStubContent}>
        <div className={styles.stubHeader}>
          <CalendarDays className={styles.stubCalendarIcon} aria-hidden="true" size={18} strokeWidth={1.6} />
          <span className={styles.stubDataHeading}>DATA</span>
        </div>
        <div className={styles.stubDateRow}>
          <span className={styles.stubDayNumber}>{dateParts.day}</span>
          <span className={styles.stubMonthYear}>
            <span>{dateParts.monthYearLine1}</span>
            <span>{dateParts.monthYearLine2}</span>
          </span>
        </div>
        <span className={styles.stubWeekday}>{dateParts.weekdayLong}</span>
      </div>

      <div className={styles.mobileStubContent} aria-hidden="true">
        <span className={styles.mobileStubDay}>{dateParts.day}</span>
        <span className={styles.mobileStubMonth}>{dateParts.monthShort}</span>
        <span className={styles.mobileStubYear}>{dateParts.year}</span>
        <span className={styles.mobileStubWeekday}>{dateParts.weekdayShort}</span>
      </div>
    </div>
  );
}

type DesktopTicketBodyProps = {
  reservation: CustomerReservationItem;
  durationText: string;
  guestText: string;
  preferencesText: string;
  notesText: string;
};

function DesktopTicketBody({
  reservation,
  durationText,
  guestText,
  preferencesText,
  notesText,
}: DesktopTicketBodyProps) {
  return (
    <div className={styles.desktopTicketMain}>
      <div className={styles.desktopCenterGrid}>
        <div className={styles.desktopTopRow}>
          <ReservationField icon={Clock3} label="HORÁRIO" value={reservation.startTime} className={styles.colFirst} />
          <ReservationField icon={Hourglass} label="DURAÇÃO" value={durationText} className={styles.colDivider} />
          <ReservationField icon={Users} label="PESSOAS" value={guestText} className={styles.colDivider} />
        </div>
        <div className={styles.desktopBottomRow}>
          <ReservationField
            icon={SlidersHorizontal}
            label="PREFERÊNCIAS"
            value={preferencesText}
            className={`${styles.colFirst} ${styles.compactValueField}`}
          />
          <ReservationField
            icon={MessageSquareMore}
            label="OBSERVAÇÕES"
            value={notesText}
            className={`${styles.colDivider} ${styles.compactValueField}`}
          />
        </div>
      </div>

      <div className={styles.desktopRightZone}>
        <ReservationStatusBadge status={reservation.status} />
        <Wine className={styles.wineWatermark} aria-hidden="true" size={42} strokeWidth={1.25} />
      </div>
    </div>
  );
}

type MobileTicketBodyProps = {
  reservation: CustomerReservationItem;
  preferencesText: string;
  notesText: string;
  isExpanded: boolean;
  onToggle: () => void;
};

function MobileTicketBody({
  reservation,
  preferencesText,
  notesText,
  isExpanded,
  onToggle,
}: MobileTicketBodyProps) {
  const durationParts = formatCompactDurationParts(reservation.durationMinutes);
  const guestParts = formatCompactGuestParts(reservation.guestCount);

  return (
    <div className={styles.mobileTicketMain} data-mobile-expanded={isExpanded ? 'true' : 'false'}>
      <header className={styles.mobileHeaderRow}>
        <h2 className={styles.mobileCardTitle}>Reserva</h2>
        <ReservationStatusBadge status={reservation.status} />
      </header>

      <button
        type="button"
        className={styles.mobileSummaryButton}
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className={styles.mobileMetricCell}>
          <Clock3 className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricSingle}>{reservation.startTime}</span>
        </span>
        <span className={`${styles.mobileMetricCell} ${styles.mobileMetricDivider}`}>
          <Hourglass className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricStack}>
            <span>{durationParts.primary}</span>
            {durationParts.unit && <span className={styles.mobileMetricUnit}>{durationParts.unit}</span>}
          </span>
        </span>
        <span className={`${styles.mobileMetricCell} ${styles.mobileMetricDivider}`}>
          <Users className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricStack}>
            <span>{guestParts.count}</span>
            <span className={styles.mobileMetricUnit}>{guestParts.unit}</span>
          </span>
        </span>
        {!isExpanded && <ChevronRight className={styles.mobileChevron} aria-hidden="true" size={14} strokeWidth={1.8} />}
      </button>

      <div className={styles.mobileDetailsPanel}>
        <ReservationField
          icon={SlidersHorizontal}
          label="Preferências"
          value={preferencesText}
          iconSize={17}
          className={styles.mobileDetailField}
        />
        <ReservationField
          icon={MessageSquareMore}
          label="Observações"
          value={notesText}
          iconSize={17}
          className={styles.mobileDetailField}
        />
      </div>
    </div>
  );
}

type ReservationCardProps = {
  reservation: CustomerReservationItem;
  defaultMobileExpanded?: boolean;
};

export function ReservationCard({
  reservation,
  defaultMobileExpanded = false,
}: ReservationCardProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(defaultMobileExpanded);
  const dateParts = formatReservationTicketDate(reservation.reservationDate);
  const durationText = formatReservationDuration(reservation.durationMinutes);
  const guestText = formatGuestCount(reservation.guestCount);
  const preferencesText = formatSpecialNeeds(reservation.specialNeeds);
  const notesText = formatReservationNotes(reservation.notes);

  return (
    <article
      className={`${styles.ticketClip} ${styles.reservationTicket}`}
      data-reservation-card
      aria-label={`Reserva em ${dateParts.fullLabel} às ${reservation.startTime}`}
    >
      <TicketCutouts />
      <div className={styles.ticketSurface}>
        <TicketDateStub dateParts={dateParts} />
        <DesktopTicketBody
          reservation={reservation}
          durationText={durationText}
          guestText={guestText}
          preferencesText={preferencesText}
          notesText={notesText}
        />
        <MobileTicketBody
          reservation={reservation}
          preferencesText={preferencesText}
          notesText={notesText}
          isExpanded={isMobileExpanded}
          onToggle={() => setIsMobileExpanded((current) => !current)}
        />
      </div>
    </article>
  );
}
```

---

### Passo 4: Atualizar `src/components/account/reservations-list/AddReservationCard.tsx`

Substitua `next-app/src/components/account/reservations-list/AddReservationCard.tsx` pelo código abaixo (replicando fielmente o ticket horizontal `Adicionar reserva` do Anexo 3):

```tsx
import Link from 'next/link';
import { ArrowRight, Plus, Wine } from 'lucide-react';
import { TicketCutouts } from './ReservationCard';
import styles from './ReservationsList.module.css';

export function AddReservationCard() {
  return (
    <Link
      className={`${styles.ticketClip} ${styles.addReservationCard}`}
      href="/reservas"
      aria-label="Adicionar reserva"
    >
      <TicketCutouts />
      <div className={`${styles.ticketSurface} ${styles.addTicketSurface}`}>
        <span className={`${styles.ticketStub} ${styles.addTicketStub}`}>
          <span className={styles.addIconCircle}>
            <Plus aria-hidden="true" size={20} strokeWidth={1.5} />
          </span>
        </span>

        <span className={styles.addCopyGroup}>
          <span className={styles.addLabel}>Adicionar reserva</span>
          <span className={styles.addSubLabel}>AGENDAR UMA NOVA EXPERIÊNCIA</span>
        </span>

        <span className={styles.addRightZone}>
          <span className={styles.addArrowCircle}>
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.6} />
          </span>
          <Wine className={styles.wineWatermark} aria-hidden="true" size={38} strokeWidth={1.25} />
        </span>
      </div>
    </Link>
  );
}
```

---

### Passo 5: Atualizar `src/components/account/reservations-list/ReservationsListView.tsx`

Substitua `next-app/src/components/account/reservations-list/ReservationsListView.tsx` pelo código abaixo (passando `defaultMobileExpanded={index === 0}` para que o primeiro card inicie expandido no mobile tal como no Anexo 2):

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { AddReservationCard } from './AddReservationCard';
import { ReservationCard } from './ReservationCard';
import { useCustomerReservations } from './useCustomerReservations';
import styles from './ReservationsList.module.css';

type ReservationsListState = ReturnType<typeof useCustomerReservations>;

function ReadyReservations({ state }: { state: ReservationsListState }) {
  return (
    <>
      {state.reservations.length === 0 && (
        <p className={styles.emptyMessage}>Você ainda não tem reservas.</p>
      )}
      <div className={styles.cardsGrid}>
        {state.reservations.map((reservation, index) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            defaultMobileExpanded={index === 0}
          />
        ))}
        <AddReservationCard />
      </div>
      {state.nextOffset !== null && (
        <div className={styles.pagination}>
          {state.moreError && (
            <p className={styles.feedbackText} role="alert">
              Não foi possível carregar mais reservas.
            </p>
          )}
          <button
            className={styles.actionButton}
            type="button"
            disabled={state.isLoadingMore}
            onClick={() => void state.loadMore()}
          >
            {state.isLoadingMore ? 'Carregando…' : state.moreError ? 'Tentar carregar mais' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
}

function ReservationsListStateContent({ state }: { state: ReservationsListState }) {
  if (state.phase === 'loading') {
    return (
      <div className={styles.feedbackBox} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
        Carregando suas reservas…
      </div>
    );
  }
  if (state.phase === 'redirecting') {
    return (
      <div className={styles.feedbackBox} role="status">
        Redirecionando para o acesso…
      </div>
    );
  }
  if (state.phase === 'error') {
    return (
      <div className={styles.feedbackBox} role="alert">
        <p className={styles.feedbackText}>
          Não foi possível carregar suas reservas agora. Tente novamente.
        </p>
        <button
          className={styles.actionButton}
          type="button"
          onClick={() => void state.retry()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  return <ReadyReservations state={state} />;
}

export function ReservationsListView() {
  const state = useCustomerReservations();
  return (
    <main className={styles.mainContainer}>
      <h1 className={styles.srOnly}>Lista de reservas</h1>
      <div className={styles.topBar}>
        <Link className={styles.backButton} href="/">
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.7} />
          Voltar
        </Link>
      </div>

      <ReservationsListStateContent state={state} />
    </main>
  );
}
```

---

### Passo 6: Substituir `src/components/account/reservations-list/ReservationsList.module.css`

Substitua integralmente `next-app/src/components/account/reservations-list/ReservationsList.module.css` pelo CSS abaixo:

```css
.pageWrapper {
  min-height: 100svh;
  background: #000000;
  color: #f2efe9;
  display: flex;
  flex-direction: column;
}

.mainContainer {
  flex: 1;
  width: 100%;
  max-width: 932px;
  margin: 0 auto;
  padding: 96px 24px 64px;
  font-family: var(--font-body), sans-serif;
  letter-spacing: normal;
  line-height: 1.35;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.topBar {
  display: flex;
  margin-bottom: 14px;
}

.backButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 5px 18px;
  border: 1px solid rgba(211, 185, 123, 0.58);
  border-radius: 999px;
  background: #080704;
  color: #e5c158;
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  text-decoration: none;
}

.cardsGrid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Geometria base do Ticket */
.ticketClip {
  --stub-width: 169px;
  --ticket-border: rgba(211, 185, 123, 0.52);
  position: relative;
  overflow: hidden;
  width: 100%;
  display: block;
}

.reservationTicket {
  --stub-width: 169px;
}

.addReservationCard {
  --stub-width: 82px;
  text-decoration: none;
  color: inherit;
}

.ticketSurface {
  position: relative;
  z-index: 1;
  min-height: 81px;
  border: 1px solid var(--ticket-border);
  background:
    radial-gradient(circle at 8% 50%, rgba(176, 139, 61, 0.14), transparent 26%),
    radial-gradient(circle at 92% 50%, rgba(176, 139, 61, 0.12), transparent 24%),
    linear-gradient(90deg, #120e07 0%, #070604 24%, #050503 76%, #120e07 100%);
  display: grid;
  grid-template-columns: var(--stub-width) minmax(0, 1fr);
  align-items: stretch;
}

.addTicketSurface {
  min-height: 58px;
  grid-template-columns: var(--stub-width) minmax(0, 1fr) auto;
  align-items: center;
}

/* Recortes côncavos, furos laterais e entalhes da serrilha */
.ticketCutouts {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.cornerCutout {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #000000;
  border: 1px solid var(--ticket-border);
}

.cornerTopLeft {
  top: -7px;
  left: -7px;
}

.cornerTopRight {
  top: -7px;
  right: -7px;
}

.cornerBottomLeft {
  bottom: -7px;
  left: -7px;
}

.cornerBottomRight {
  bottom: -7px;
  right: -7px;
}

.sideNotch {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #000000;
  border: 1px solid var(--ticket-border);
  transform: translateY(-50%);
}

.sideNotchLeft {
  left: -9px;
}

.sideNotchRight {
  right: -9px;
}

.seamNotch {
  position: absolute;
  left: var(--stub-width);
  width: 6px;
  height: 6px;
  background: #000000;
  border: 1px solid var(--ticket-border);
  transform: translateX(-50%) rotate(45deg);
}

.seamNotchTop {
  top: -3px;
}

.seamNotchBottom {
  bottom: -3px;
}

/* Canhoto Esquerdo (Stub) */
.ticketStub {
  position: relative;
  border-right: 1px dashed rgba(211, 185, 123, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px 14px 9px 22px;
}

.addTicketStub {
  padding: 8px 10px 8px 16px;
}

.desktopStubContent {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.stubHeader {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stubCalendarIcon {
  color: #e5c158;
  flex-shrink: 0;
}

.stubDataHeading {
  color: #c5beb0;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 11px;
  text-transform: uppercase;
}

.stubDateRow {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-left: 28px;
  margin-top: -2px;
}

.stubDayNumber {
  font-family: var(--font-display), serif;
  font-size: 31px;
  font-weight: 600;
  line-height: 0.9;
  color: #f5f2eb;
  letter-spacing: -0.02em;
}

.stubMonthYear {
  display: flex;
  flex-direction: column;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.12;
  color: #ede8df;
}

.stubWeekday {
  padding-left: 28px;
  margin-top: 2px;
  color: #c5ad73;
  font-size: 7.5px;
  font-weight: 600;
  letter-spacing: 0.18em;
  line-height: 10px;
  text-transform: uppercase;
  white-space: nowrap;
}

.mobileStubContent {
  display: none;
}

/* Miolo Desktop da Reserva */
.desktopTicketMain {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 176px;
  align-items: stretch;
  min-width: 0;
}

.desktopCenterGrid {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 7px 14px 8px 18px;
  min-width: 0;
}

.desktopTopRow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.14fr) minmax(0, 1fr);
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(211, 185, 123, 0.16);
}

.desktopBottomRow {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
  align-items: start;
  padding-top: 6px;
}

.colFirst {
  padding-right: 12px;
}

.colDivider {
  border-left: 1px solid rgba(211, 185, 123, 0.22);
  padding-left: 16px;
  padding-right: 10px;
}

.colDivider:last-child {
  padding-right: 0;
}

.fieldCell {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  column-gap: 11px;
  align-items: start;
  min-width: 0;
  margin: 0;
}

.fieldIcon {
  color: #e5c158;
  flex-shrink: 0;
  margin-top: 2px;
}

.fieldCopy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 0;
}

.fieldLabel,
.fieldValue {
  margin: 0;
}

.fieldLabel {
  color: #5e788f;
  font-size: 8px;
  line-height: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.fieldValue {
  color: #f2efe9;
  font-size: 11.5px;
  line-height: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.compactValueField .fieldValue {
  font-size: 9.5px;
  line-height: 12.5px;
  font-weight: 500;
}

/* Zona Direita Desktop (Status Badge + Marca d'água Taça) */
.desktopRightZone {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 11px 20px 10px 6px;
}

.wineWatermark {
  color: rgba(211, 185, 123, 0.13);
  transform: rotate(10deg);
  flex-shrink: 0;
  align-self: center;
  pointer-events: none;
}

/* Status Badge */
.statusBadge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 10px;
  line-height: 12px;
  font-weight: 500;
}

.statusBadgeConfirmed {
  border: 1px solid rgba(211, 185, 123, 0.65);
  background: rgba(16, 13, 6, 0.85);
  color: #e5c158;
}

.statusBadgePending {
  border: 1px solid rgba(211, 185, 123, 0.48);
  background: rgba(211, 185, 123, 0.06);
  color: #d5c59b;
}

.statusBadgeMuted {
  border: 1px solid rgba(160, 175, 192, 0.35);
  background: rgba(160, 175, 192, 0.05);
  color: #9ba8b4;
}

.statusBadge svg {
  color: currentColor;
  flex-shrink: 0;
}

/* Ticket Adicionar Reserva */
.addIconCircle {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: 1px solid rgba(229, 193, 88, 0.78);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e5c158;
}

.addCopyGroup {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 8px 16px 8px 22px;
  min-width: 0;
}

.addLabel {
  font-family: var(--font-display), serif;
  font-size: 23px;
  line-height: 1.05;
  font-weight: 500;
  color: #f5f3ee;
}

.addSubLabel {
  font-size: 8px;
  line-height: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c8b273;
}

.addRightZone {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 8px 20px 8px 12px;
}

.addArrowCircle {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 1px solid rgba(229, 193, 88, 0.75);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e5c158;
}

/* Elementos Mobile ocultos no Desktop */
.mobileTicketMain {
  display: none;
}

/* Estados de Feedback e Paginação */
.feedbackBox {
  min-height: 150px;
  padding: 24px;
  border: 1px solid rgba(211, 185, 123, 0.32);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #c2bdb4;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
}

.emptyMessage {
  margin: 0 0 14px;
  color: #c2bdb4;
  font-size: 14px;
  line-height: 20px;
}

.pagination {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.actionButton {
  min-height: 42px;
  padding: 8px 18px;
  border: 1px solid rgba(211, 185, 123, 0.65);
  border-radius: 999px;
  background: #0b0a08;
  color: #e5c158;
  font: 500 13px/18px var(--font-body), sans-serif;
  cursor: pointer;
}

.actionButton:disabled {
  opacity: 0.6;
  cursor: wait;
}

.feedbackText {
  margin: 0;
  color: #e2b8a8;
}

.backButton:focus-visible,
.addReservationCard:focus-visible,
.actionButton:focus-visible,
.mobileSummaryButton:focus-visible {
  outline: 2px solid #f1d093;
  outline-offset: 3px;
}

.spinner {
  color: #e5c158;
  animation: listSpin 1s linear infinite;
}

@keyframes listSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (hover: hover) and (pointer: fine) {
  .backButton:hover,
  .actionButton:enabled:hover {
    border-color: #f1d093;
    background: rgba(211, 185, 123, 0.12);
  }

  .addReservationCard:hover .ticketSurface {
    border-color: #f1d093;
    filter: brightness(1.08);
  }
}

/* ==========================================================================
   RESPONSIVIDADE MOBILE (<= 767px) — Fiel ao Anexo 2 (02-mobile-lista-tickets.png)
   ========================================================================== */
@media (max-width: 767px) {
  .mainContainer {
    max-width: 440px;
    padding: 88px 16px 48px;
  }

  .topBar {
    margin-bottom: 14px;
  }

  .backButton {
    min-height: 32px;
    padding: 6px 18px;
    font-size: 12px;
  }

  .cardsGrid {
    gap: 12px;
  }

  .ticketClip,
  .reservationTicket,
  .addReservationCard {
    --stub-width: 72px;
  }

  .ticketSurface {
    border-radius: 0 10px 10px 0;
    background: #060503;
  }

  /* No mobile, os cantos direitos são arredondados normais e não têm furo direito */
  .cornerTopRight,
  .cornerBottomRight,
  .sideNotchRight {
    display: none;
  }

  .seamNotch {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transform: translateX(-50%);
  }

  .seamNotchTop {
    top: -4px;
  }

  .seamNotchBottom {
    bottom: -4px;
  }

  /* Canhoto Dourado Texturizado no Mobile */
  .ticketStub {
    padding: 12px 6px 12px 10px;
    border-right: 1px solid rgba(211, 185, 123, 0.28);
    background:
      radial-gradient(ellipse 90% 80% at 35% 25%, rgba(201, 165, 78, 0.42), rgba(114, 89, 36, 0.34) 55%, rgba(44, 34, 14, 0.92)),
      linear-gradient(180deg, #4d3c18 0%, #2a200c 52%, #3f3013 100%);
  }

  .desktopStubContent,
  .desktopTicketMain {
    display: none;
  }

  .mobileStubContent {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 1px;
  }

  .mobileStubDay {
    font-family: var(--font-body), sans-serif;
    font-size: 24px;
    line-height: 1;
    font-weight: 700;
    color: #f2c96b;
  }

  .mobileStubMonth {
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.1;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #f5f2eb;
    text-transform: uppercase;
  }

  .mobileStubYear {
    font-size: 10px;
    line-height: 1.15;
    font-weight: 600;
    color: #f5f2eb;
  }

  .mobileStubWeekday {
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.1;
    font-weight: 400;
    color: #d8ceb8;
  }

  /* Corpo Direito Mobile */
  .mobileTicketMain {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 10px 12px;
  }

  .mobileHeaderRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(211, 185, 123, 0.14);
  }

  .mobileCardTitle {
    margin: 0;
    font-family: var(--font-display), serif;
    font-size: 16px;
    line-height: 1.15;
    font-weight: 600;
    color: #f5f2eb;
  }

  .statusBadge {
    padding: 3px 10px;
    font-size: 9.5px;
  }

  .mobileSummaryButton {
    appearance: none;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 9px 0 2px;
    margin: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 8px;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }

  .mobileMetricCell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .mobileMetricCell .fieldIcon {
    margin-top: 0;
  }

  .mobileMetricDivider {
    border-left: 1px solid rgba(211, 185, 123, 0.16);
    padding-left: 8px;
  }

  .mobileMetricSingle {
    font-size: 11.5px;
    line-height: 1.2;
    font-weight: 500;
    color: #f2efe9;
    white-space: nowrap;
  }

  .mobileMetricStack {
    display: flex;
    flex-direction: column;
    font-size: 11px;
    line-height: 1.15;
    font-weight: 500;
    color: #f2efe9;
  }

  .mobileMetricUnit {
    font-size: 10px;
    color: #e6e1d6;
  }

  .mobileChevron {
    color: #e5c158;
    flex-shrink: 0;
    margin-left: 2px;
  }

  .mobileDetailsPanel {
    display: none;
    flex-direction: column;
    gap: 10px;
    margin-top: 9px;
    padding-top: 10px;
    border-top: 1px solid rgba(211, 185, 123, 0.14);
  }

  .mobileTicketMain[data-mobile-expanded='true'] .mobileDetailsPanel {
    display: flex;
  }

  .mobileDetailField {
    grid-template-columns: 18px minmax(0, 1fr);
    column-gap: 10px;
  }

  .mobileDetailField .fieldLabel {
    color: #6e859b;
    font-size: 10px;
    line-height: 13px;
    font-weight: 500;
    letter-spacing: normal;
    text-transform: none;
  }

  .mobileDetailField .fieldValue {
    color: #f2efe9;
    font-size: 11px;
    line-height: 15px;
    font-weight: 500;
  }

  /* Ajuste Mobile do Ticket Adicionar Reserva */
  .addCopyGroup {
    padding: 10px 10px 10px 14px;
  }

  .addLabel {
    font-size: 18px;
  }

  .addSubLabel {
    font-size: 7.5px;
    letter-spacing: 0.12em;
  }

  .addRightZone {
    padding: 8px 12px 8px 4px;
  }

  .addRightZone .wineWatermark {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
```

---

### Passo 7: Atualizar Testes Unitários (`tests/customer-reservations-list.test.mjs`)

Adicione o teste unitário do novo formatador `formatReservationTicketDate`, `formatCompactDurationParts` e `formatCompactGuestParts` ao final de `next-app/tests/customer-reservations-list.test.mjs` (mantendo os 4 testes existentes intactos):

```js
test('formats structured ticket date parts and compact mobile metrics deterministically', () => {
  assert.deepEqual(formatters.formatReservationTicketDate('2026-10-14'), {
    isValid: true,
    day: '14',
    monthYearLine1: 'de outubro',
    monthYearLine2: 'de 2026',
    weekdayLong: 'QUARTA-FEIRA',
    monthShort: 'OUT',
    year: '2026',
    weekdayShort: 'Qua',
    fullLabel: '14 de outubro de 2026',
  });
  assert.equal(formatters.formatReservationTicketDate('2026-02-31').isValid, false);
  assert.equal(formatters.formatReservationTicketDate('2026-02-31').day, '--');
  assert.deepEqual(formatters.formatCompactDurationParts(120), { primary: '120', unit: 'min' });
  assert.deepEqual(formatters.formatCompactDurationParts(null), { primary: 'Não inf.', unit: null });
  assert.deepEqual(formatters.formatCompactGuestParts(1), { count: '1', unit: 'pessoa' });
  assert.deepEqual(formatters.formatCompactGuestParts(7), { count: '7', unit: 'pessoas' });
});
```

---

## 4. Roteiro de Verificação Obrigatória (Checklist do Executor)

Após aplicar os Passos 1 a 7, execute exatamente estes comandos dentro de `next-app/` e confirme que **todos passam com código 0**:

1. **Testes Unitários da Lista e da API de Reservas:**
   ```powershell
   node --test tests/customer-reservations-api.test.mjs tests/customer-reservations-list.test.mjs
   ```
   *Resultado esperado:* `8 pass, 0 fail`.

2. **Guard de Complexidade Ciclomática e Profundidade:**
   ```powershell
   npm run verify:complexity
   ```
   *Resultado esperado:* `Complexity guard passed: cyclomatic <= 8, depth <= 3.`

3. **Guard de Arquitetura:**
   ```powershell
   npm run verify:architecture
   ```
   *Resultado esperado:* `Architecture guard passed.`

4. **Checagem de Tipagem TypeScript:**
   ```powershell
   npm run typecheck
   ```
   *Resultado esperado:* saída limpa sem erros (`exit code 0`).

5. **Verificação de ausência de `<svg>` manual nos componentes da lista:**
   - Confirmar que nenhum arquivo em `src/components/account/reservations-list/*.tsx` contém `<svg`.
