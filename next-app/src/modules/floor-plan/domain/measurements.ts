export function centimetersToMeters(value: number) { return value / 100; }
export function metersToCentimeters(value: number) { return value * 100; }
export function formatMeters(value: number) { return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(centimetersToMeters(value)) + ' m'; }
