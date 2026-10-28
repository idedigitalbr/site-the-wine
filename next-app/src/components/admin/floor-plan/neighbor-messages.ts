const MESSAGES: Record<string, string> = {
  overlap: 'As mesas estão sobrepostas no desenho.',
  insufficient_alignment: 'As mesas estão desalinhadas para uma junção lado a lado.',
  frontal: 'As mesas estão uma à frente da outra.',
  different_area: 'As mesas pertencem a áreas diferentes.',
  axis_mismatch: 'As mesas estão com orientações diferentes.',
  too_far: 'O espaço lateral entre as mesas supera 0,50 m.',
  not_reservable: 'Ative “Disponível para reserva” nas duas mesas.',
  join_disabled: 'Ative “Permitir junção futura” nas duas mesas.',
  compatible: 'Posição adequada para junção.',
};
export function neighborMessage(reason: string) { return MESSAGES[reason] ?? 'Revise a posição das mesas.'; }
