import {
  ALMOST_FULL_THRESHOLD,
  allSeatIds,
  BookingStatus,
  SlotStatus,
  totalSeats,
} from './enums';
import { Screen } from '../database/entities/screen.entity';

export function getBookedSeatsFromBookings(
  bookings: { seats: string[]; status: string }[],
): Set<string> {
  const set = new Set<string>();
  for (const b of bookings) {
    if (b.status === BookingStatus.CONFIRMED) {
      b.seats.forEach((s) => set.add(s));
    }
  }
  return set;
}

export function computeSlotStatus(
  bookedCount: number,
  capacity: number,
): SlotStatus {
  if (capacity <= 0 || bookedCount >= capacity) return SlotStatus.FULL;
  if (bookedCount / capacity >= ALMOST_FULL_THRESHOLD) {
    return SlotStatus.ALMOST_FULL;
  }
  return SlotStatus.AVAILABLE;
}

export function getScreenCapacity(screen: Screen): number {
  const rows = screen.rows?.length ? screen.rows : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return totalSeats(rows, screen.seatCols ?? 10);
}

export function getScreenSeatIds(screen: Screen): string[] {
  const rows = screen.rows?.length ? screen.rows : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return allSeatIds(rows, screen.seatCols ?? 10);
}
