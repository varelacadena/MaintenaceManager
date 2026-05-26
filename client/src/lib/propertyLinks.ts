export function equipmentWorkHistoryPath(equipmentId: string) {
  return `/equipment/${equipmentId}/work-history`;
}

export function equipmentQrUrl(origin: string, equipmentId: string) {
  return `${origin}${equipmentWorkHistoryPath(equipmentId)}`;
}
