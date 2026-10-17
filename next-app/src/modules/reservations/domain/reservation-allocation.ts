export type ReservationAllocationOption = {
  tableIds: number[];
  combinationId: number | null;
  capacityMin: number;
  capacityMax: number;
};

export function selectBestAvailableOption(
  options: ReservationAllocationOption[],
  guestCount: number,
): ReservationAllocationOption | null {
  return options
    .filter((option) => guestCount >= option.capacityMin && guestCount <= option.capacityMax)
    .sort((first, second) => (
      first.capacityMax - second.capacityMax
      || first.tableIds.length - second.tableIds.length
      || first.tableIds.join(',').localeCompare(second.tableIds.join(','))
    ))[0] ?? null;
}
