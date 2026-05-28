export function getNumericRecordNumber(id: string | null | undefined, digits = 8): string {
  const numeric = (id ?? "").replace(/\D/g, "");
  if (numeric.length >= digits) return numeric.slice(-digits);
  if (numeric.length > 0) return numeric.padStart(digits, "0");

  let hash = 0;
  for (const char of id ?? "") {
    hash = (hash * 31 + char.charCodeAt(0)) % 10 ** digits;
  }
  return String(hash).padStart(digits, "0");
}

export function formatSequenceNumber(
  prefix: string,
  sequence: number | null | undefined,
  fallbackId?: string | null,
  width = 3,
): string {
  if (typeof sequence === "number" && Number.isFinite(sequence) && sequence > 0) {
    return `${prefix}${String(sequence).padStart(width, "0")}`;
  }
  return `${prefix}${getNumericRecordNumber(fallbackId, width)}`;
}

export function getServiceRequestNumber(record: {
  id?: string | null;
  requestNumber?: number | null;
}): string {
  return formatSequenceNumber("S", record.requestNumber, record.id);
}

export function getVehicleReservationNumber(record: {
  id?: string | null;
  reservationNumber?: number | null;
}): string {
  return formatSequenceNumber("C", record.reservationNumber, record.id);
}
