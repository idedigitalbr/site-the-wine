import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';

function readEnvFile(path) {
  if (!existsSync(path)) return {};

  return readFileSync(path, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return values;
    return { ...values, [match[1]]: match[2].replace(/^['"]|['"]$/g, '') };
  }, {});
}

function environmentValue(name, fileEnvironment, fallback = '') {
  return process.env[name] ?? fileEnvironment[name] ?? fallback;
}

function loadDatabaseConfig() {
  const fileEnvironment = readEnvFile(resolve('.env.local'));

  return {
    host: environmentValue('DATABASE_HOST', fileEnvironment, '127.0.0.1'),
    port: Number(environmentValue('DATABASE_PORT', fileEnvironment, '3306')),
    database: environmentValue('DATABASE_NAME', fileEnvironment, 'thewine'),
    user: environmentValue('DATABASE_USER', fileEnvironment, 'root'),
    password: environmentValue('DATABASE_PASSWORD', fileEnvironment),
  };
}

function assertLocalDatabase(config) {
  const host = config.host.toLowerCase();
  if (!['127.0.0.1', 'localhost'].includes(host)) {
    throw new Error('Seed bloqueado: DATABASE_HOST precisa apontar para o MySQL local.');
  }
  if (config.database !== 'thewine') {
    throw new Error('Seed bloqueado: DATABASE_NAME precisa ser exatamente thewine.');
  }
}

function insertId(result) {
  return Number(result.insertId);
}

async function upsertArea(connection, area) {
  const [result] = await connection.execute(
    `INSERT INTO dining_areas (code, name, active)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), active = 1`,
    [area.code, area.name],
  );
  return insertId(result);
}

async function upsertTableType(connection, tableType) {
  const [result] = await connection.execute(
    `INSERT INTO table_types (code, name, capacity_min, capacity_max, active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name),
       capacity_min = VALUES(capacity_min), capacity_max = VALUES(capacity_max), active = 1`,
    [tableType.code, tableType.name, tableType.capacityMin, tableType.capacityMax],
  );
  return insertId(result);
}

async function upsertTable(connection, table, areaId, tableTypeId) {
  const [result] = await connection.execute(
    `INSERT INTO restaurant_tables
       (code, name, area_id, table_type_id, capacity_min, capacity_max,
        position_x, position_y, width, height, rotation, shape, active, joinable)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), area_id = VALUES(area_id),
       table_type_id = VALUES(table_type_id), capacity_min = VALUES(capacity_min),
       capacity_max = VALUES(capacity_max), position_x = VALUES(position_x),
       position_y = VALUES(position_y), width = VALUES(width), height = VALUES(height),
       rotation = VALUES(rotation), shape = VALUES(shape), active = 1,
       joinable = VALUES(joinable)`,
    [
      table.code,
      table.name,
      areaId,
      tableTypeId,
      table.capacityMin,
      table.capacityMax,
      table.positionX,
      table.positionY,
      table.width,
      table.height,
      table.rotation,
      table.shape,
      table.joinable ? 1 : 0,
    ],
  );
  return insertId(result);
}

async function upsertCombination(connection, combination) {
  const [result] = await connection.execute(
    `INSERT INTO table_combinations (code, name, active)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), active = 1`,
    [combination.code, combination.name],
  );
  const combinationId = insertId(result);

  for (const tableId of combination.tableIds) {
    await connection.execute(
      `INSERT IGNORE INTO table_combination_items (combination_id, table_id)
       VALUES (?, ?)`,
      [combinationId, tableId],
    );
  }

  return combinationId;
}

async function upsertShift(connection, shift) {
  const [result] = await connection.execute(
    `INSERT INTO service_shifts (code, name, starts_at, ends_at, active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), starts_at = VALUES(starts_at),
       ends_at = VALUES(ends_at), active = 1`,
    [shift.code, shift.name, shift.startsAt, shift.endsAt],
  );
  return insertId(result);
}

async function upsertBusinessHour(connection, hour) {
  await connection.execute(
    `INSERT INTO business_hours
       (day_of_week, service_shift_id, opens_at, closes_at, active)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       opens_at = VALUES(opens_at), closes_at = VALUES(closes_at), active = 1`,
    [hour.dayOfWeek, hour.shiftId, hour.opensAt, hour.closesAt],
  );
}

async function count(connection, table) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM ${table}`);
  return Number(rows[0].total);
}

function localDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffset(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateTime(date, time) {
  return `${date} ${time.length === 5 ? `${time}:00` : time}`;
}

function currentDateTime(offsetMinutes = 0) {
  const value = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const iso = value.toISOString();
  return iso.replace('T', ' ').slice(0, 19);
}

function demoHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function upsertExperience(connection, experience) {
  const [result] = await connection.execute(
    `INSERT INTO experiences
       (slug, name, description, duration_minutes, min_guests, max_guests, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), description = VALUES(description),
       duration_minutes = VALUES(duration_minutes), min_guests = VALUES(min_guests),
       max_guests = VALUES(max_guests), active = 1`,
    [experience.slug, experience.name, experience.description, experience.durationMinutes, experience.minGuests, experience.maxGuests],
  );
  return insertId(result);
}

async function upsertCustomer(connection, customer) {
  const normalizedPhone = customer.phone.replace(/\D/g, '');
  const [result] = await connection.execute(
    `INSERT INTO customers
       (name, phone, normalized_phone, email, birth_date, marketing_consent, notes,
        first_visit_at, last_visit_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), name = VALUES(name), phone = VALUES(phone),
       email = VALUES(email), birth_date = VALUES(birth_date),
       marketing_consent = VALUES(marketing_consent), notes = VALUES(notes),
       first_visit_at = VALUES(first_visit_at), last_visit_at = VALUES(last_visit_at)`,
    [
      customer.name,
      customer.phone,
      normalizedPhone,
      customer.email,
      customer.birthDate ?? null,
      customer.marketingConsent ? 1 : 0,
      customer.notes ?? null,
      customer.firstVisitAt ?? null,
      customer.lastVisitAt ?? null,
    ],
  );
  return insertId(result);
}

async function upsertReservation(connection, reservation) {
  const [result] = await connection.execute(
    `INSERT INTO reservations
       (public_code, customer_id, experience_id, reservation_date, start_time, end_time,
        guest_count, status, preferred_table_type_id, source, notes, internal_notes,
        confirmation_token_hash, cancelled_at, checked_in_at, seated_at, no_show_at,
        completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), customer_id = VALUES(customer_id),
       experience_id = VALUES(experience_id), reservation_date = VALUES(reservation_date),
       start_time = VALUES(start_time), end_time = VALUES(end_time),
       guest_count = VALUES(guest_count), status = VALUES(status),
       preferred_table_type_id = VALUES(preferred_table_type_id), source = VALUES(source),
       notes = VALUES(notes), internal_notes = VALUES(internal_notes),
       confirmation_token_hash = VALUES(confirmation_token_hash),
       cancelled_at = VALUES(cancelled_at), checked_in_at = VALUES(checked_in_at),
       seated_at = VALUES(seated_at), no_show_at = VALUES(no_show_at),
       completed_at = VALUES(completed_at)`,
    [
      reservation.publicCode,
      reservation.customerId,
      reservation.experienceId ?? null,
      reservation.date,
      reservation.startTime,
      reservation.endTime,
      reservation.guests,
      reservation.status,
      reservation.tableTypeId ?? null,
      reservation.source,
      reservation.notes ?? null,
      reservation.internalNotes ?? null,
      demoHash(reservation.portalToken),
      reservation.cancelledAt ?? null,
      reservation.checkedInAt ?? null,
      reservation.seatedAt ?? null,
      reservation.noShowAt ?? null,
      reservation.completedAt ?? null,
    ],
  );
  return insertId(result);
}

async function replaceReservationTables(connection, reservationId, tableIds) {
  await connection.execute('DELETE FROM reservation_tables WHERE reservation_id = ?', [reservationId]);
  for (const tableId of tableIds) {
    await connection.execute(
      `INSERT INTO reservation_tables (reservation_id, restaurant_table_id)
       VALUES (?, ?)`,
      [reservationId, tableId],
    );
  }
}

async function replaceReservationNeeds(connection, reservationId, needs) {
  await connection.execute('DELETE FROM reservation_special_needs WHERE reservation_id = ?', [reservationId]);
  for (const need of needs) {
    await connection.execute(
      `INSERT INTO reservation_special_needs (reservation_id, need_code, details)
       VALUES (?, ?, ?)`,
      [reservationId, need.code, need.details ?? null],
    );
  }
}

async function upsertReservationEvent(connection, event) {
  await connection.execute(
    `INSERT INTO reservation_events
       (reservation_id, event_type, from_status, to_status, actor_type, actor_label, event_key, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      event.reservationId,
      event.type,
      event.fromStatus ?? null,
      event.toStatus ?? null,
      event.actorType,
      event.actorLabel,
      event.eventKey,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.createdAt,
    ],
  );
}

async function upsertWaitlist(connection, entry) {
  const [existingRows] = await connection.execute(
    'SELECT id FROM waitlist WHERE notes = ? LIMIT 1',
    [entry.demoKey],
  );
  if (existingRows[0]) {
    await connection.execute(
      `UPDATE waitlist
       SET customer_id = ?, reservation_date = ?, preferred_time = ?, guest_count = ?,
           status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [entry.customerId, entry.date, entry.preferredTime ?? null, entry.guests, entry.status, existingRows[0].id],
    );
    return Number(existingRows[0].id);
  }

  const [result] = await connection.execute(
    `INSERT INTO waitlist
       (customer_id, reservation_date, preferred_time, guest_count, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.customerId, entry.date, entry.preferredTime ?? null, entry.guests, entry.demoKey, entry.status],
  );
  return insertId(result);
}

async function upsertBlockedPeriod(connection, blockedPeriod) {
  const [existingRows] = await connection.execute(
    'SELECT id FROM blocked_periods WHERE reason = ? LIMIT 1',
    [blockedPeriod.reason],
  );
  const values = [
    blockedPeriod.areaId ?? null,
    blockedPeriod.tableId ?? null,
    blockedPeriod.startsAt,
    blockedPeriod.endsAt,
    blockedPeriod.reason,
  ];
  if (existingRows[0]) {
    await connection.execute(
      `UPDATE blocked_periods
       SET dining_area_id = ?, restaurant_table_id = ?, starts_at = ?, ends_at = ?, reason = ?, active = 1
       WHERE id = ?`,
      [...values, existingRows[0].id],
    );
    return Number(existingRows[0].id);
  }

  const [result] = await connection.execute(
    `INSERT INTO blocked_periods
       (dining_area_id, restaurant_table_id, starts_at, ends_at, reason, active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    values,
  );
  return insertId(result);
}

async function upsertAppointment(connection, appointment) {
  const [existingRows] = await connection.execute(
    'SELECT id FROM appointments WHERE notes = ? LIMIT 1',
    [appointment.demoKey],
  );
  const values = [
    appointment.date,
    appointment.time,
    appointment.guests,
    appointment.name,
    appointment.phone,
    appointment.email,
    appointment.experience,
    appointment.demoKey,
    appointment.status,
  ];
  if (existingRows[0]) {
    await connection.execute(
      `UPDATE appointments
       SET reservation_date = ?, reservation_time = ?, guest_count = ?, customer_name = ?,
           customer_phone = ?, customer_email = ?, experience = ?, status = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[8], existingRows[0].id],
    );
    return Number(existingRows[0].id);
  }

  const [result] = await connection.execute(
    `INSERT INTO appointments
       (reservation_date, reservation_time, guest_count, customer_name, customer_phone,
        customer_email, experience, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    values,
  );
  return insertId(result);
}

async function upsertHold(connection, hold) {
  const [result] = await connection.execute(
    `INSERT INTO reservation_holds
       (session_token_hash, reservation_id, restaurant_table_id, starts_at, expires_at,
        reservation_starts_at, reservation_ends_at, guest_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), reservation_id = VALUES(reservation_id),
       starts_at = VALUES(starts_at), expires_at = VALUES(expires_at),
       reservation_starts_at = VALUES(reservation_starts_at),
       reservation_ends_at = VALUES(reservation_ends_at), guest_count = VALUES(guest_count)`,
    [
      demoHash(hold.sessionToken),
      hold.reservationId ?? null,
      hold.tableId,
      hold.startsAt,
      hold.expiresAt,
      hold.reservationStartsAt,
      hold.reservationEndsAt,
      hold.guests,
    ],
  );
  return insertId(result);
}

async function upsertPayment(connection, payment) {
  const [result] = await connection.execute(
    `INSERT INTO payments
       (reservation_id, provider, external_id, idempotency_key, status, method, amount,
        currency, provider_status, description, payer_email, checkout_url, pix_qr_code,
        pix_copy_paste, paid_at, refunded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), reservation_id = VALUES(reservation_id),
       external_id = VALUES(external_id), status = VALUES(status), method = VALUES(method),
       amount = VALUES(amount), provider_status = VALUES(provider_status),
       description = VALUES(description), payer_email = VALUES(payer_email),
       checkout_url = VALUES(checkout_url), pix_qr_code = VALUES(pix_qr_code),
       pix_copy_paste = VALUES(pix_copy_paste), paid_at = VALUES(paid_at),
       refunded_at = VALUES(refunded_at)`,
    [
      payment.reservationId,
      'mercadopago',
      payment.externalId ?? null,
      payment.idempotencyKey,
      payment.status,
      payment.method,
      payment.amount,
      payment.providerStatus ?? null,
      payment.description,
      payment.payerEmail,
      payment.checkoutUrl ?? null,
      payment.pixQrCode ?? null,
      payment.pixCopyPaste ?? null,
      payment.paidAt ?? null,
      payment.refundedAt ?? null,
    ],
  );
  return insertId(result);
}

async function upsertRefund(connection, refund) {
  const [result] = await connection.execute(
    `INSERT INTO refunds
       (payment_id, provider, external_id, idempotency_key, amount, status, reason,
        requested_by_email, processed_at)
     VALUES (?, 'mercadopago', ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), payment_id = VALUES(payment_id), external_id = VALUES(external_id),
       amount = VALUES(amount), status = VALUES(status), reason = VALUES(reason),
       requested_by_email = VALUES(requested_by_email), processed_at = VALUES(processed_at)`,
    [
      refund.paymentId,
      refund.externalId ?? null,
      refund.idempotencyKey,
      refund.amount,
      refund.status,
      refund.reason,
      refund.requestedByEmail,
      refund.processedAt ?? null,
    ],
  );
  return insertId(result);
}

async function upsertWebhookEvent(connection, event) {
  const [result] = await connection.execute(
    `INSERT INTO webhook_events
       (provider, external_event_id, request_id, event_type, action, signature, payload,
        status, attempts, processed_at, last_error)
     VALUES ('mercadopago', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), request_id = VALUES(request_id), event_type = VALUES(event_type),
       action = VALUES(action), signature = VALUES(signature), payload = VALUES(payload),
       status = VALUES(status), attempts = VALUES(attempts), processed_at = VALUES(processed_at),
       last_error = VALUES(last_error)`,
    [
      event.externalEventId,
      event.requestId,
      event.eventType,
      event.action,
      event.signature ?? null,
      JSON.stringify(event.payload),
      event.status,
      event.attempts,
      event.processedAt ?? null,
      event.lastError ?? null,
    ],
  );
  return insertId(result);
}

async function replacePaymentEvent(connection, event) {
  await connection.execute(
    'DELETE FROM payment_events WHERE provider = ? AND external_event_id = ?',
    ['mercadopago', event.externalEventId],
  );
  const [result] = await connection.execute(
    `INSERT INTO payment_events
       (payment_id, provider, external_event_id, event_type, action, provider_status, payload)
     VALUES (?, 'mercadopago', ?, ?, ?, ?, ?)`,
    [
      event.paymentId ?? null,
      event.externalEventId,
      event.eventType,
      event.action,
      event.providerStatus ?? null,
      JSON.stringify(event.payload),
    ],
  );
  return insertId(result);
}

async function upsertNotification(connection, notification) {
  const [result] = await connection.execute(
    `INSERT INTO notification_outbox
       (channel, template, recipient, dedupe_key, payload, status, attempts, scheduled_at,
        sent_at, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id), channel = VALUES(channel), template = VALUES(template),
       recipient = VALUES(recipient), payload = VALUES(payload), status = VALUES(status),
       attempts = VALUES(attempts), scheduled_at = VALUES(scheduled_at),
       sent_at = VALUES(sent_at), last_error = VALUES(last_error)`,
    [
      notification.channel,
      notification.template,
      notification.recipient,
      notification.dedupeKey,
      JSON.stringify(notification.payload),
      notification.status,
      notification.attempts,
      notification.scheduledAt,
      notification.sentAt ?? null,
      notification.lastError ?? null,
    ],
  );
  return insertId(result);
}

async function seedDemoData(connection, { areaIds, typeIds, tableIds, shiftIds }, baseDate) {
  await connection.beginTransaction();
  try {
    const experienceIds = {};
    for (const experience of [
      { slug: 'jantar', name: 'Jantar no The Wine', description: 'Uma noite completa com carta de vinhos e menu autoral.', durationMinutes: 120, minGuests: 1, maxGuests: 10 },
      { slug: 'degustacao', name: 'Degustação guiada', description: 'Seleção de rótulos conduzida pela equipe de sommeliers.', durationMinutes: 150, minGuests: 1, maxGuests: 8 },
      { slug: 'almoco', name: 'Almoço especial', description: 'Experiência de almoço no salão principal.', durationMinutes: 90, minGuests: 1, maxGuests: 8 },
      { slug: 'evento-privado', name: 'Evento privado', description: 'Formato reservado para comemorações e grupos.', durationMinutes: 180, minGuests: 6, maxGuests: 20 },
    ]) {
      experienceIds[experience.slug] = await upsertExperience(connection, experience);
    }

    const customers = [
      { key: 'ana', name: 'Ana Carolina Mendes', phone: '(91) 98888-0001', email: 'ana.mendes@demo.thewine.local', birthDate: '1990-04-12', marketingConsent: true, notes: 'Prefere mesa tranquila.', firstVisitAt: dateTime(dateOffset(baseDate, -180), '19:30'), lastVisitAt: dateTime(dateOffset(baseDate, -2), '21:55') },
      { key: 'bruno', name: 'Bruno Almeida', phone: '(91) 98888-0002', email: 'bruno.almeida@demo.thewine.local', birthDate: '1987-09-23', marketingConsent: false, notes: 'Cliente recorrente.', firstVisitAt: dateTime(dateOffset(baseDate, -90), '20:00'), lastVisitAt: dateTime(dateOffset(baseDate, -1), '22:00') },
      { key: 'camila', name: 'Camila Ribeiro', phone: '(91) 98888-0003', email: 'camila.ribeiro@demo.thewine.local', birthDate: '1994-01-08', marketingConsent: true, notes: 'Aniversário em setembro.', firstVisitAt: dateTime(dateOffset(baseDate, -60), '19:00'), lastVisitAt: dateTime(baseDate, '18:00') },
      { key: 'diego', name: 'Diego Santos', phone: '(91) 98888-0004', email: 'diego.santos@demo.thewine.local', birthDate: '1984-06-19', marketingConsent: true, notes: 'Contato principal do grupo.', firstVisitAt: dateTime(dateOffset(baseDate, -45), '12:30'), lastVisitAt: dateTime(dateOffset(baseDate, -1), '20:00') },
      { key: 'elisa', name: 'Elisa Ferreira', phone: '(91) 98888-0005', email: 'elisa.ferreira@demo.thewine.local', birthDate: '1992-11-02', marketingConsent: false, notes: 'Solicita cadeira infantil quando necessário.', firstVisitAt: dateTime(dateOffset(baseDate, -30), '12:00'), lastVisitAt: dateTime(dateOffset(baseDate, -3), '14:00') },
      { key: 'fabio', name: 'Fábio Costa', phone: '(91) 98888-0006', email: 'fabio.costa@demo.thewine.local', birthDate: '1978-03-27', marketingConsent: true, notes: 'Interesse em degustações.', firstVisitAt: dateTime(dateOffset(baseDate, -20), '19:30'), lastVisitAt: dateTime(dateOffset(baseDate, -5), '22:30') },
      { key: 'gabriela', name: 'Gabriela Oliveira', phone: '(91) 98888-0007', email: 'gabriela.oliveira@demo.thewine.local', birthDate: '1996-08-15', marketingConsent: true, notes: 'Alergia a castanhas.', firstVisitAt: dateTime(dateOffset(baseDate, -15), '20:00'), lastVisitAt: dateTime(dateOffset(baseDate, -4), '21:30') },
      { key: 'henrique', name: 'Henrique Martins', phone: '(91) 98888-0008', email: 'henrique.martins@demo.thewine.local', birthDate: '1989-12-11', marketingConsent: false, notes: 'Grupo corporativo.', firstVisitAt: dateTime(dateOffset(baseDate, -10), '19:00'), lastVisitAt: dateTime(dateOffset(baseDate, -1), '19:00') },
      { key: 'isabela', name: 'Isabela Nascimento', phone: '(91) 98888-0009', email: 'isabela.nascimento@demo.thewine.local', birthDate: '1991-05-30', marketingConsent: true, notes: 'Prefere jantar.', firstVisitAt: dateTime(dateOffset(baseDate, -8), '20:30'), lastVisitAt: dateTime(dateOffset(baseDate, -2), '20:30') },
      { key: 'joao', name: 'João Pedro Rocha', phone: '(91) 98888-0010', email: 'joao.rocha@demo.thewine.local', birthDate: '1982-10-05', marketingConsent: true, notes: 'Solicita nota fiscal.', firstVisitAt: dateTime(dateOffset(baseDate, -5), '12:00'), lastVisitAt: dateTime(dateOffset(baseDate, -1), '12:30') },
    ];
    const customerIds = {};
    for (const customer of customers) customerIds[customer.key] = await upsertCustomer(connection, customer);

    const reservationSpecs = [
      { key: 'completed', code: 'DEMO-CONCLUIDA-01', customer: 'ana', experience: 'jantar', date: dateOffset(baseDate, -2), start: '12:00', end: '14:00', guests: 2, status: 'completed', type: 'mesa-2', source: 'website', tables: ['M01'], notes: 'Comemoração de aniversário.', internalNotes: 'Atendimento encerrado sem ocorrências.', needs: [{ code: 'birthday', details: 'Sobremesa com mensagem.' }], checkedInAt: dateTime(dateOffset(baseDate, -2), '12:04'), seatedAt: dateTime(dateOffset(baseDate, -2), '12:08'), completedAt: dateTime(dateOffset(baseDate, -2), '13:58'), events: [['created', null, 'confirmed', 'customer', 'Cliente', '11:30'], ['checked_in', 'confirmed', 'confirmed', 'admin', 'Recepção', '12:04'], ['seated', 'confirmed', 'seated', 'admin', 'Recepção', '12:08'], ['completed', 'seated', 'completed', 'admin', 'Equipe', '13:58']] },
      { key: 'cancelled', code: 'DEMO-CANCELADA-01', customer: 'bruno', experience: 'jantar', date: dateOffset(baseDate, -1), start: '19:00', end: '21:00', guests: 2, status: 'cancelled', type: 'mesa-2', source: 'whatsapp', tables: ['M02'], notes: 'Cliente solicitou cancelamento.', internalNotes: 'Cancelamento demonstrativo.', needs: [], cancelledAt: dateTime(dateOffset(baseDate, -1), '16:20'), events: [['created', null, 'confirmed', 'customer', 'Cliente', '14:00'], ['cancelled', 'confirmed', 'cancelled', 'customer', 'Cliente', '16:20']] },
      { key: 'noShow', code: 'DEMO-NOSHOW-01', customer: 'camila', experience: 'jantar', date: dateOffset(baseDate, -1), start: '20:00', end: '22:00', guests: 2, status: 'no_show', type: 'mesa-2', source: 'instagram', tables: ['M03'], notes: 'Reserva de teste para no-show.', internalNotes: 'Não houve chegada no horário.', needs: [], noShowAt: dateTime(dateOffset(baseDate, -1), '20:35'), events: [['created', null, 'confirmed', 'customer', 'Cliente', '15:00'], ['no_show', 'confirmed', 'no_show', 'automation', 'Automação', '20:35']] },
      { key: 'confirmed', code: 'DEMO-HOJE-CONF', customer: 'diego', experience: 'jantar', date: baseDate, start: '19:00', end: '21:00', guests: 2, status: 'confirmed', type: 'mesa-2', source: 'website', tables: ['M04'], notes: 'Mesa próxima à adega.', internalNotes: 'Aguardando chegada.', needs: [{ code: 'accessibility', details: 'Corredor livre.' }], events: [['created', null, 'pending', 'customer', 'Cliente', '10:00'], ['status_changed', 'pending', 'confirmed', 'admin', 'Equipe', '10:15']] },
      { key: 'pending', code: 'DEMO-HOJE-PEND', customer: 'elisa', experience: 'degustacao', date: baseDate, start: '19:30', end: '22:00', guests: 4, status: 'pending', type: 'mesa-4', source: 'phone', tables: ['M05'], notes: 'Grupo aguardando confirmação da equipe.', internalNotes: 'Validar preferência de menu.', needs: [], events: [['created', null, 'pending', 'admin', 'Equipe', '11:00']] },
      { key: 'seated', code: 'DEMO-HOJE-ATEND', customer: 'fabio', experience: 'jantar', date: baseDate, start: '20:00', end: '22:00', guests: 2, status: 'seated', type: 'mesa-4', source: 'whatsapp', tables: ['M06'], notes: 'Cliente já acomodado.', internalNotes: 'Solicitou segunda taça de degustação.', needs: [], checkedInAt: dateTime(baseDate, '19:52'), seatedAt: dateTime(baseDate, '19:58'), events: [['created', null, 'confirmed', 'customer', 'Cliente', '15:00'], ['checked_in', 'confirmed', 'confirmed', 'admin', 'Recepção', '19:52'], ['seated', 'confirmed', 'seated', 'admin', 'Recepção', '19:58']] },
      { key: 'paymentPending', code: 'DEMO-HOJE-PAGTO', customer: 'gabriela', experience: 'jantar', date: baseDate, start: '20:30', end: '22:30', guests: 4, status: 'payment_pending', type: 'mesa-4', source: 'website', tables: [], notes: 'Aguardando pagamento demonstrativo.', internalNotes: 'Não cobrar: cenário de teste.', needs: [{ code: 'food_allergy', details: 'Sem castanhas.' }], events: [['created', null, 'payment_pending', 'customer', 'Cliente', '12:00']] },
      { key: 'draft', code: 'DEMO-HOJE-RASC', customer: 'henrique', experience: 'evento-privado', date: baseDate, start: '21:00', end: '23:00', guests: 8, status: 'draft', type: 'mesa-8', source: 'google', tables: [], notes: 'Rascunho para testar transição de status.', internalNotes: 'Converter para pendente após validar o grupo.', needs: [], events: [] },
      { key: 'futureConfirmed', code: 'DEMO-FUTURA-CONF', customer: 'isabela', experience: 'degustacao', date: dateOffset(baseDate, 1), start: '19:00', end: '21:30', guests: 6, status: 'confirmed', type: 'mesa-6', source: 'website', tables: ['M09'], notes: 'Degustação guiada para seis pessoas.', internalNotes: 'Combinação de mesas disponível para ajuste.', needs: [], events: [['created', null, 'pending', 'customer', 'Cliente', '09:00'], ['status_changed', 'pending', 'confirmed', 'admin', 'Equipe', '09:20']] },
      { key: 'futurePending', code: 'DEMO-FUTURA-PEND', customer: 'joao', experience: 'jantar', date: dateOffset(baseDate, 1), start: '19:30', end: '21:30', guests: 6, status: 'pending', type: 'mesa-8', source: 'phone', tables: ['A03'], notes: 'Grupo com necessidade de nota fiscal.', internalNotes: 'Confirmar composição da mesa.', needs: [], events: [['created', null, 'pending', 'admin', 'Equipe', '09:30']] },
      { key: 'futureHold', code: 'DEMO-FUTURA-HOLD', customer: 'ana', experience: 'jantar', date: dateOffset(baseDate, 2), start: '20:00', end: '22:00', guests: 4, status: 'hold', type: 'mesa-4', source: 'website', tables: [], notes: 'Hold temporário para testar expiração.', internalNotes: 'Sessão demonstrativa.', needs: [], events: [['created', null, 'hold', 'customer', 'Cliente', '10:00']] },
      { key: 'futureExpired', code: 'DEMO-EXPIRADA-01', customer: 'bruno', experience: 'jantar', date: dateOffset(baseDate, -3), start: '20:00', end: '22:00', guests: 2, status: 'expired', type: 'mesa-2', source: 'website', tables: [], notes: 'Reserva expirada demonstrativa.', internalNotes: 'Hold não confirmado.', needs: [], events: [['created', null, 'hold', 'customer', 'Cliente', '10:00'], ['status_changed', 'hold', 'expired', 'automation', 'Automação', '10:35']] },
    ];
    const reservationIds = {};
    for (const spec of reservationSpecs) {
      const reservationId = await upsertReservation(connection, {
        publicCode: spec.code,
        customerId: customerIds[spec.customer],
        experienceId: experienceIds[spec.experience],
        date: spec.date,
        startTime: spec.start,
        endTime: spec.end,
        guests: spec.guests,
        status: spec.status,
        tableTypeId: typeIds[spec.type],
        source: spec.source,
        notes: spec.notes,
        internalNotes: spec.internalNotes,
        portalToken: `demo-portal-${spec.key}`,
        cancelledAt: spec.cancelledAt,
        checkedInAt: spec.checkedInAt,
        seatedAt: spec.seatedAt,
        noShowAt: spec.noShowAt,
        completedAt: spec.completedAt,
      });
      reservationIds[spec.key] = reservationId;
      await replaceReservationTables(connection, reservationId, spec.tables.map((code) => tableIds[code]));
      await replaceReservationNeeds(connection, reservationId, spec.needs);
      for (const [type, fromStatus, toStatus, actorType, actorLabel, time] of spec.events) {
        await upsertReservationEvent(connection, {
          reservationId,
          type,
          fromStatus,
          toStatus,
          actorType,
          actorLabel,
          eventKey: `demo:${spec.key}:${type}`,
          metadata: { source: 'local-demo-seed' },
          createdAt: dateTime(spec.date, time),
        });
      }
    }

    for (const entry of [
      { customer: 'camila', date: baseDate, preferredTime: '19:30', guests: 4, status: 'waiting', demoKey: '[DEMO] Lista de espera aguardando contato' },
      { customer: 'diego', date: baseDate, preferredTime: '20:00', guests: 6, status: 'notified', demoKey: '[DEMO] Lista de espera notificada' },
      { customer: 'elisa', date: dateOffset(baseDate, 1), preferredTime: '19:00', guests: 2, status: 'converted', demoKey: '[DEMO] Lista de espera convertida' },
      { customer: 'fabio', date: baseDate, preferredTime: null, guests: 3, status: 'cancelled', demoKey: '[DEMO] Lista de espera cancelada' },
      { customer: 'gabriela', date: dateOffset(baseDate, -1), preferredTime: '20:30', guests: 5, status: 'expired', demoKey: '[DEMO] Lista de espera expirada' },
    ]) {
      await upsertWaitlist(connection, { ...entry, customerId: customerIds[entry.customer] });
    }

    await upsertBlockedPeriod(connection, {
      areaId: areaIds.adega,
      tableId: null,
      startsAt: dateTime(dateOffset(baseDate, 1), '21:00'),
      endsAt: dateTime(dateOffset(baseDate, 1), '23:00'),
      reason: '[DEMO] Evento privado na adega',
    });
    await upsertBlockedPeriod(connection, {
      areaId: null,
      tableId: tableIds.A04,
      startsAt: dateTime(baseDate, '18:00'),
      endsAt: dateTime(baseDate, '23:00'),
      reason: '[DEMO] Manutenção da mesa A04',
    });
    await upsertBlockedPeriod(connection, {
      areaId: null,
      tableId: tableIds.M10,
      startsAt: dateTime(dateOffset(baseDate, 2), '19:00'),
      endsAt: dateTime(dateOffset(baseDate, 2), '22:00'),
      reason: '[DEMO] Ajuste de iluminação da mesa M10',
    });

    await upsertHold(connection, {
      sessionToken: 'demo-active-hold',
      reservationId: null,
      tableId: tableIds.A04,
      startsAt: currentDateTime(-5),
      expiresAt: currentDateTime(30),
      reservationStartsAt: dateTime(dateOffset(baseDate, 2), '20:00'),
      reservationEndsAt: dateTime(dateOffset(baseDate, 2), '22:00'),
      guests: 4,
    });
    await upsertHold(connection, {
      sessionToken: 'demo-expired-hold',
      reservationId: reservationIds.futureExpired,
      tableId: tableIds.M02,
      startsAt: currentDateTime(-60),
      expiresAt: currentDateTime(-30),
      reservationStartsAt: dateTime(dateOffset(baseDate, 1), '20:00'),
      reservationEndsAt: dateTime(dateOffset(baseDate, 1), '22:00'),
      guests: 2,
    });

    for (const appointment of [
      { date: baseDate, time: '18:30:00', guests: 2, name: 'Lara Atendimento', phone: '91988880101', email: 'lara.appointment@demo.thewine.local', experience: 'jantar', status: 'pending', demoKey: '[DEMO] appointment-pending' },
      { date: baseDate, time: '19:00:00', guests: 4, name: 'Marcos Atendimento', phone: '91988880102', email: 'marcos.appointment@demo.thewine.local', experience: 'degustacao', status: 'confirmed', demoKey: '[DEMO] appointment-confirmed' },
      { date: dateOffset(baseDate, -1), time: '20:00:00', guests: 2, name: 'Nina Atendimento', phone: '91988880103', email: 'nina.appointment@demo.thewine.local', experience: 'jantar', status: 'completed', demoKey: '[DEMO] appointment-completed' },
      { date: dateOffset(baseDate, -1), time: '21:00:00', guests: 6, name: 'Otávio Atendimento', phone: '91988880104', email: 'otavio.appointment@demo.thewine.local', experience: 'evento', status: 'cancelled', demoKey: '[DEMO] appointment-cancelled' },
    ]) {
      await upsertAppointment(connection, appointment);
    }

    const paymentIds = {};
    for (const payment of [
      { key: 'paid', reservationKey: 'completed', externalId: 'demo-mp-paid-001', idempotencyKey: 'demo-payment-paid-001', status: 'paid', method: 'pix', amount: 150, providerStatus: 'approved', description: 'Sinal demonstrativo — reserva concluída', payerEmail: 'ana.mendes@demo.thewine.local', pixQrCode: 'data:image/png;base64,DEMO-QR-001', pixCopyPaste: '00020126580014BR.GOV.BCB.PIXDEMO001', paidAt: dateTime(dateOffset(baseDate, -2), '11:42') },
      { key: 'pending', reservationKey: 'paymentPending', externalId: null, idempotencyKey: 'demo-payment-pending-001', status: 'pending', method: 'pix', amount: 200, providerStatus: 'pending', description: 'Sinal demonstrativo — aguardando pagamento', payerEmail: 'gabriela.oliveira@demo.thewine.local', pixQrCode: 'data:image/png;base64,DEMO-QR-002', pixCopyPaste: '00020126580014BR.GOV.BCB.PIXDEMO002' },
      { key: 'processing', reservationKey: 'pending', externalId: 'demo-mp-processing-001', idempotencyKey: 'demo-payment-processing-001', status: 'processing', method: 'card', amount: 180, providerStatus: 'in_process', description: 'Sinal demonstrativo — processando cartão', payerEmail: 'elisa.ferreira@demo.thewine.local' },
      { key: 'failed', reservationKey: 'cancelled', externalId: 'demo-mp-failed-001', idempotencyKey: 'demo-payment-failed-001', status: 'failed', method: 'card', amount: 100, providerStatus: 'rejected', description: 'Sinal demonstrativo — pagamento recusado', payerEmail: 'bruno.almeida@demo.thewine.local' },
      { key: 'cancelled', reservationKey: 'futureExpired', externalId: 'demo-mp-cancelled-001', idempotencyKey: 'demo-payment-cancelled-001', status: 'cancelled', method: 'pix', amount: 80, providerStatus: 'cancelled', description: 'Sinal demonstrativo — pagamento cancelado', payerEmail: 'bruno.almeida@demo.thewine.local' },
      { key: 'refunded', reservationKey: 'noShow', externalId: 'demo-mp-refunded-001', idempotencyKey: 'demo-payment-refunded-001', status: 'refunded', method: 'pix', amount: 120, providerStatus: 'refunded', description: 'Sinal demonstrativo — reserva no-show', payerEmail: 'camila.ribeiro@demo.thewine.local', paidAt: dateTime(dateOffset(baseDate, -1), '18:00'), refundedAt: dateTime(dateOffset(baseDate, -1), '19:00') },
      { key: 'partial', reservationKey: 'futureConfirmed', externalId: 'demo-mp-partial-001', idempotencyKey: 'demo-payment-partial-001', status: 'partially_refunded', method: 'card', amount: 250, providerStatus: 'approved', description: 'Sinal demonstrativo — reembolso parcial', payerEmail: 'isabela.nascimento@demo.thewine.local', paidAt: dateTime(baseDate, '10:00') },
    ]) {
      paymentIds[payment.key] = await upsertPayment(connection, {
        ...payment,
        reservationId: reservationIds[payment.reservationKey],
      });
    }

    await upsertRefund(connection, {
      paymentId: paymentIds.refunded,
      externalId: 'demo-mp-refund-001',
      idempotencyKey: 'demo-refund-full-001',
      amount: 120,
      status: 'processed',
      reason: 'Teste de reembolso integral',
      requestedByEmail: 'admin@thewine.com',
      processedAt: dateTime(dateOffset(baseDate, -1), '19:00'),
    });
    await upsertRefund(connection, {
      paymentId: paymentIds.partial,
      externalId: 'demo-mp-refund-002',
      idempotencyKey: 'demo-refund-partial-001',
      amount: 50,
      status: 'processed',
      reason: 'Teste de reembolso parcial',
      requestedByEmail: 'admin@thewine.com',
      processedAt: dateTime(baseDate, '10:30'),
    });

    for (const event of [
      { externalEventId: 'demo-webhook-received-001', requestId: 'demo-req-001', eventType: 'payment', action: 'payment.created', status: 'received', attempts: 0, payload: { data: { id: 'demo-mp-pending-001' } } },
      { externalEventId: 'demo-webhook-processing-001', requestId: 'demo-req-002', eventType: 'payment', action: 'payment.updated', status: 'processing', attempts: 1, payload: { data: { id: 'demo-mp-processing-001' } } },
      { externalEventId: 'demo-webhook-processed-001', requestId: 'demo-req-003', eventType: 'payment', action: 'payment.updated', status: 'processed', attempts: 1, processedAt: dateTime(baseDate, '10:05'), payload: { data: { id: 'demo-mp-paid-001' } } },
      { externalEventId: 'demo-webhook-ignored-001', requestId: 'demo-req-004', eventType: 'merchant_order', action: 'merchant_order.created', status: 'ignored', attempts: 1, lastError: 'Evento demonstrativo não suportado.', payload: { data: { id: 'demo-order-001' } } },
      { externalEventId: 'demo-webhook-failed-001', requestId: 'demo-req-005', eventType: 'payment', action: 'payment.updated', status: 'failed', attempts: 3, lastError: 'Falha demonstrativa ao consultar pagamento.', payload: { data: { id: 'demo-mp-failed-001' } } },
    ]) {
      await upsertWebhookEvent(connection, event);
    }

    for (const event of [
      { paymentId: paymentIds.paid, externalEventId: 'demo-webhook-processed-001', eventType: 'payment', action: 'payment.updated', providerStatus: 'approved', payload: { status: 'approved', source: 'local-demo-seed' } },
      { paymentId: paymentIds.pending, externalEventId: 'demo-webhook-received-001', eventType: 'payment', action: 'payment.created', providerStatus: 'pending', payload: { status: 'pending', source: 'local-demo-seed' } },
      { paymentId: null, externalEventId: 'demo-webhook-ignored-001', eventType: 'merchant_order', action: 'merchant_order.created', providerStatus: null, payload: { ignored: true, source: 'local-demo-seed' } },
    ]) {
      await replacePaymentEvent(connection, event);
    }

    const notificationData = [
      { channel: 'email', template: 'reservation_confirmation', recipient: 'ana.mendes@demo.thewine.local', dedupeKey: 'demo-notification-confirmation-001', status: 'sent', attempts: 1, scheduledAt: currentDateTime(-180), sentAt: currentDateTime(-175), payload: { publicCode: 'DEMO-CONCLUIDA-01', guestCount: 2 } },
      { channel: 'email', template: 'reservation_reminder_24h', recipient: 'isabela.nascimento@demo.thewine.local', dedupeKey: 'demo-notification-reminder-001', status: 'pending', attempts: 0, scheduledAt: currentDateTime(-5), payload: { publicCode: 'DEMO-FUTURA-CONF', reservationDate: dateOffset(baseDate, 1) } },
      { channel: 'whatsapp', template: 'reservation_reminder_3h', recipient: '91988880004', dedupeKey: 'demo-notification-reminder-002', status: 'processing', attempts: 1, scheduledAt: currentDateTime(-10), payload: { publicCode: 'DEMO-HOJE-CONF', startTime: '19:00' } },
      { channel: 'sms', template: 'reservation_cancellation', recipient: '91988880002', dedupeKey: 'demo-notification-cancelled-001', status: 'failed', attempts: 2, scheduledAt: currentDateTime(-30), lastError: 'Falha demonstrativa do provedor de mensagens.', payload: { publicCode: 'DEMO-CANCELADA-01' } },
      { channel: 'email', template: 'waitlist_available', recipient: 'diego.santos@demo.thewine.local', dedupeKey: 'demo-notification-waitlist-001', status: 'cancelled', attempts: 0, scheduledAt: currentDateTime(-240), payload: { referenceCode: 'WL-DEMO-0002' } },
    ];
    for (const notification of notificationData) await upsertNotification(connection, notification);

    await connection.commit();
    return {
      customers: customers.length,
      reservations: reservationSpecs.length,
      waitlist: 5,
      blockedPeriods: 3,
      holds: 2,
      appointments: 4,
      payments: 7,
      refunds: 2,
      webhooks: 5,
      notifications: notificationData.length,
      portalTokens: reservationSpecs.slice(0, 3).map((spec) => `${spec.code}: demo-portal-${spec.key}`),
      shiftIds,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function seed() {
  const fileEnvironment = readEnvFile(resolve('.env.local'));
  const config = loadDatabaseConfig();
  assertLocalDatabase(config);

  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });

  try {
    await connection.beginTransaction();

    const areaIds = {};
    for (const area of [
      { code: 'salao-principal', name: 'Salão Principal' },
      { code: 'adega', name: 'Adega Reservada' },
    ]) {
      areaIds[area.code] = await upsertArea(connection, area);
    }

    const typeIds = {};
    for (const tableType of [
      { code: 'mesa-2', name: 'Mesa para 2', capacityMin: 1, capacityMax: 2 },
      { code: 'mesa-4', name: 'Mesa para 4', capacityMin: 2, capacityMax: 4 },
      { code: 'mesa-6', name: 'Mesa para 6', capacityMin: 2, capacityMax: 6 },
      { code: 'mesa-8', name: 'Mesa para 8', capacityMin: 4, capacityMax: 8 },
      { code: 'mesa-10', name: 'Mesa para 10', capacityMin: 6, capacityMax: 10 },
    ]) {
      typeIds[tableType.code] = await upsertTableType(connection, tableType);
    }

    const tableIds = {};
    const tables = [
      { code: 'M01', name: 'Mesa 01', area: 'salao-principal', type: 'mesa-2', capacityMin: 1, capacityMax: 2, positionX: 12, positionY: 16, width: 72, height: 72, rotation: 0, shape: 'redonda', joinable: false },
      { code: 'M02', name: 'Mesa 02', area: 'salao-principal', type: 'mesa-2', capacityMin: 1, capacityMax: 2, positionX: 30, positionY: 16, width: 72, height: 72, rotation: 0, shape: 'redonda', joinable: false },
      { code: 'M03', name: 'Mesa 03', area: 'salao-principal', type: 'mesa-2', capacityMin: 1, capacityMax: 2, positionX: 48, positionY: 16, width: 72, height: 72, rotation: 0, shape: 'redonda', joinable: false },
      { code: 'M04', name: 'Mesa 04', area: 'salao-principal', type: 'mesa-2', capacityMin: 1, capacityMax: 2, positionX: 66, positionY: 16, width: 72, height: 72, rotation: 0, shape: 'redonda', joinable: false },
      { code: 'M05', name: 'Mesa 05', area: 'salao-principal', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 12, positionY: 41, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'M06', name: 'Mesa 06', area: 'salao-principal', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 30, positionY: 41, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'M07', name: 'Mesa 07', area: 'salao-principal', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 48, positionY: 41, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'M08', name: 'Mesa 08', area: 'salao-principal', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 66, positionY: 41, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'M09', name: 'Mesa 09', area: 'salao-principal', type: 'mesa-6', capacityMin: 2, capacityMax: 6, positionX: 30, positionY: 68, width: 136, height: 82, rotation: 0, shape: 'retangular', joinable: true },
      { code: 'M10', name: 'Mesa 10', area: 'salao-principal', type: 'mesa-6', capacityMin: 2, capacityMax: 6, positionX: 50, positionY: 68, width: 136, height: 82, rotation: 0, shape: 'retangular', joinable: true },
      { code: 'A01', name: 'Adega 01', area: 'adega', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 84, positionY: 16, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'A02', name: 'Adega 02', area: 'adega', type: 'mesa-4', capacityMin: 2, capacityMax: 4, positionX: 84, positionY: 38, width: 92, height: 72, rotation: 0, shape: 'quadrada', joinable: false },
      { code: 'A03', name: 'Adega 03', area: 'adega', type: 'mesa-8', capacityMin: 4, capacityMax: 8, positionX: 84, positionY: 62, width: 164, height: 82, rotation: 0, shape: 'retangular', joinable: false },
      { code: 'A04', name: 'Adega 04', area: 'adega', type: 'mesa-8', capacityMin: 4, capacityMax: 8, positionX: 84, positionY: 84, width: 164, height: 82, rotation: 0, shape: 'retangular', joinable: false },
    ];

    for (const table of tables) {
      tableIds[table.code] = await upsertTable(connection, table, areaIds[table.area], typeIds[table.type]);
    }

    await upsertCombination(connection, {
      code: 'mesa-junta-09-10',
      name: 'Mesas 09 + 10',
      tableIds: [tableIds.M09, tableIds.M10],
    });

    const shiftIds = {};
    for (const shift of [
      { code: 'almoco', name: 'Almoço', startsAt: '12:00:00', endsAt: '15:00:00' },
      { code: 'jantar', name: 'Jantar', startsAt: '19:00:00', endsAt: '23:00:00' },
    ]) {
      shiftIds[shift.code] = await upsertShift(connection, shift);
    }

    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      await upsertBusinessHour(connection, {
        dayOfWeek,
        shiftId: shiftIds.almoco,
        opensAt: '12:00:00',
        closesAt: '15:00:00',
      });
      if (dayOfWeek !== 0) {
        await upsertBusinessHour(connection, {
          dayOfWeek,
          shiftId: shiftIds.jantar,
          opensAt: '19:00:00',
          closesAt: '23:00:00',
        });
      }
    }

    await connection.commit();

    const demo = await seedDemoData(connection, { areaIds, typeIds, tableIds, shiftIds }, environmentValue('SEED_DATE', fileEnvironment, localDateIso()));

    const [areas, tableTypes, restaurantTables, combinations, shifts, businessHours] = await Promise.all([
      count(connection, 'dining_areas'),
      count(connection, 'table_types'),
      count(connection, 'restaurant_tables'),
      count(connection, 'table_combinations'),
      count(connection, 'service_shifts'),
      count(connection, 'business_hours'),
    ]);
    console.log(`Dados locais prontos no banco ${config.database}:`);
    console.log(`- áreas: ${areas}`);
    console.log(`- tipos de mesa: ${tableTypes}`);
    console.log(`- mesas: ${restaurantTables}`);
    console.log(`- combinações: ${combinations}`);
    console.log(`- turnos: ${shifts}`);
    console.log(`- horários: ${businessHours}`);
    console.log('Dados demonstrativos prontos (marcados como DEMO):');
    console.log(`- clientes: ${demo.customers}`);
    console.log(`- reservas: ${demo.reservations}`);
    console.log(`- lista de espera: ${demo.waitlist}`);
    console.log(`- bloqueios: ${demo.blockedPeriods}`);
    console.log(`- holds: ${demo.holds}`);
    console.log(`- appointments legados: ${demo.appointments}`);
    console.log(`- pagamentos: ${demo.payments} · reembolsos: ${demo.refunds}`);
    console.log(`- webhooks: ${demo.webhooks} · notificações: ${demo.notifications}`);
    console.log(`- acesso portal: ${demo.portalTokens.join(' | ')}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error(`Falha no seed local do salão: ${error.message}`);
  process.exitCode = 1;
});
