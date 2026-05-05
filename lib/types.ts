// User Types
/** Self-service signup: passenger or transporter only. `admin` is set in Supabase on `public.users.user_type` after the user exists (e.g. promoted from passenger). */
export type SignupUserType = 'passenger' | 'transporter';

export type UserType = 'passenger' | 'transporter' | 'admin';

/** Set for `user_type === 'transporter'` only; always null for passenger/admin. */
export type TransporterApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  user_type: UserType;
  kyc_verified: boolean;
  profile_image?: string;
  created_at: string;
  transporter_approval_status?: TransporterApprovalStatus | null;
  transporter_approved_at?: string | null;
  transporter_approved_by?: string | null;
  transporter_rejection_reason?: string | null;
}

export interface TransportCompany {
  id: string;
  owner_user_id: string;
  company_name: string;
  registration_number: string;
  license_number: string;
  verified: boolean;
  verification_date?: string;
  contact_email: string;
  contact_phone: string;
  headquarters_location: string;
  created_at: string;
}

// Route & Schedule Types
export type RouteType = 'bus' | 'vessel' | 'minibus' | 'coach';

export interface Route {
  id: string;
  company_id: string;
  route_code: string;
  origin_city: string;
  destination_city: string;
  distance_km: number;
  estimated_duration_minutes: number;
  route_type: RouteType;
  is_active: boolean;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  stop_name: string;
  stop_location: string;
  stop_latitude: number;
  stop_longitude: number;
  estimated_time_minutes_from_start: number;
}

export interface Schedule {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  days_of_week: string[];
  is_active: boolean;
  created_at: string;
}

// Trip & Vehicle Types
export type TripStatus = 'scheduled' | 'in_transit' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  schedule_id: string;
  trip_date: string;
  actual_departure?: string;
  actual_arrival?: string;
  vehicle_id: string;
  status: TripStatus;
  created_at: string;
}

export interface Vehicle {
  id: string;
  company_id: string;
  vehicle_registration: string;
  vehicle_type: RouteType;
  capacity: number;
  current_status: 'active' | 'maintenance' | 'retired';
  created_at: string;
}

export interface Seat {
  id: string;
  vehicle_id: string;
  seat_number: string;
  seat_type: 'regular' | 'premium' | 'handicap';
  base_price: number;
  created_at: string;
}

// Booking & Payment Types
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'refunded';

export interface Booking {
  id: string;
  trip_id: string;
  user_id: string;
  seat_id: string;
  booking_status: BookingStatus;
  booking_date: string;
  payment_status: PaymentStatus;
  payment_reference?: string;
  created_at: string;
}

/** Enriched row returned by `GET /api/bookings` for passenger UI (until backed by SQL). */
export interface PassengerBookingListItem {
  id: string;
  bookingId: string;
  tripId: string;
  route: string;
  seat: string;
  date: string;
  departureTime: string;
  status: string;
  amount: number;
  paymentStatus: string;
  company?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  booking_id: string;
  transporter_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_gateway_reference: string;
  transaction_status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Search & Filter Types
export interface RouteSearchQuery {
  origin_city: string;
  destination_city: string;
  trip_date: string;
  passenger_count?: number;
  route_type?: RouteType;
}

export interface AvailableRoute {
  trip_id: string;
  route: Route;
  schedule: Schedule;
  vehicle: Vehicle;
  company: TransportCompany;
  available_seats: Seat[];
  total_seats: number;
  booked_seats: number;
}

/** Same shape as discover / passenger search trip rows. */
export type TripSearchResult = AvailableRoute;
