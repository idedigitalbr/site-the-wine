/** Shared reservation occupancy predicate. `r` must be the reservations alias. */
export const activeReservationOccupancySql = `(
  ${'r'}.status IN ('hold', 'pending', 'confirmed', 'seated')
  OR (
    ${'r'}.status = 'payment_pending'
    AND (
      ${'r'}.checkout_mode IS NULL
      OR (${ 'r'}.seat_guarantee_expires_at > CURRENT_TIMESTAMP(3)
          AND ${'r'}.payment_deadline_at > CURRENT_TIMESTAMP(3))
    )
  )
)`;
