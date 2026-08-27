export const tableShapes = ['redonda', 'quadrada', 'retangular', 'balcao'] as const;
export type TableShape = typeof tableShapes[number];

export type DiningArea = {
  id: number;
  code: string;
  name: string;
  active: boolean;
};

export type TableType = {
  id: number;
  code: string;
  name: string;
  capacityMin: number;
  capacityMax: number;
  active: boolean;
};

export type RestaurantTable = {
  id: number;
  code: string;
  name: string;
  areaId: number;
  tableTypeId: number;
  capacityMin: number;
  capacityMax: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  shape: TableShape;
  active: boolean;
  joinable: boolean;
};

export type ServiceShift = {
  id: number;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};
