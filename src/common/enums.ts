export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum MovieStatus {
  NOW_SHOWING = 'now-showing',
  UPCOMING = 'upcoming',
}

export enum BookingStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum SlotStatus {
  AVAILABLE = 'available',
  ALMOST_FULL = 'almost-full',
  FULL = 'full',
}

export const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const SEAT_COLS = 10;
export const VIP_ROWS = ['A', 'B'];
export const ALMOST_FULL_THRESHOLD = 0.8;

export function allSeatIds(rows = SEAT_ROWS, cols = SEAT_COLS): string[] {
  return rows.flatMap((row) =>
    Array.from({ length: cols }, (_, i) => `${row}${i + 1}`),
  );
}

export function totalSeats(rows = SEAT_ROWS, cols = SEAT_COLS): number {
  return rows.length * cols;
}
