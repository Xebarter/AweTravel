export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type BookingPaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type Booking = {
  id: string;
  bookingCode: string;
  passengerUserId: string | null;
  passengerName: string | null;
  passengerEmail: string | null;
  routeId: string;
  routeCode: string;
  routeLabel: string;
  departureId: string | null;
  departureTime: string | null; // HH:MM
  travelDate: string; // YYYY-MM-DD
  seatCode: string;
  status: BookingStatus;
  amountMinor: number;
  currency: string;
  paymentStatus: BookingPaymentStatus;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingListResponse = {
  bookings: Booking[];
};

