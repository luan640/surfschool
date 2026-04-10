// ─── Domain models ────────────────────────────────────────────────────────────

export interface School {
  id: string
  owner_id: string
  slug: string
  name: string
  tagline: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  logo_url: string | null
  primary_color: string
  cta_color: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface InstructorAvailability {
  id: string
  instructor_id: string
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  time_slots: string[]
}

export interface Instructor {
  id: string
  school_id: string
  full_name: string
  photo_url: string | null
  phone: string | null
  instagram: string | null
  specialty: string | null
  bio: string | null
  hourly_price: number
  color: string
  active: boolean
  created_at: string
  availability?: InstructorAvailability[]
}

export interface LessonPackage {
  id: string
  school_id: string
  name: string
  description: string | null
  lesson_count: number
  price: number
  active: boolean
  created_at: string
  updated_at: string
  instructors?: Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty' | 'active'>[]
}

export interface TripImage {
  id: string
  trip_id: string
  image_url: string
  sort_order: number
  created_at: string
}

export interface Trip {
  id: string
  school_id: string
  slug: string
  title: string
  summary: string | null
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  departure_at: string | null
  arrival_at: string | null
  price: number
  capacity: number | null
  allow_over_capacity: boolean
  allow_late_registrations: boolean
  active: boolean
  cover_image_url: string | null
  created_at: string
  updated_at: string
  images?: TripImage[]
  registrations_count?: number
  paid_registrations_count?: number
}

export interface TripRegistration {
  id: string
  trip_id: string
  school_id: string
  full_name: string
  email: string
  phone: string | null
  notes: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  amount: number
  external_reference: string | null
  mercadopago_payment_id: number | null
  mercadopago_status: string | null
  mercadopago_status_detail: string | null
  ticket_url: string | null
  qr_code: string | null
  qr_code_base64: string | null
  created_at: string
  updated_at: string
}

export interface DiscountCoupon {
  id: string
  school_id: string
  code: string
  name: string
  description: string | null
  applies_to_single_lesson: boolean
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number | null
  usage_limit_total: number | null
  usage_limit_per_user: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
  updated_at: string
  packages?: Pick<LessonPackage, 'id' | 'name' | 'active'>[]
}

export interface PackageLessonDraft {
  sequence: number
  date: Date | null
  slots: string[]
}

export interface StudentProfile {
  id: string
  user_id: string
  school_id: string
  full_name: string
  email: string | null
  phone: string | null
  cpf: string | null
  birth_date: string | null
  trial_lesson_eligible: boolean
  created_at: string
}

export interface DashboardStudentRow extends StudentProfile {
  email: string | null
  total_bookings: number
  upcoming_bookings: number
}

export type BookingStatus   = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentMethod   = 'pix' | 'credit_card' | 'debit_card' | 'cash'
export type PaymentStatus   = 'pending' | 'paid' | 'refunded' | 'failed'

export interface Booking {
  id: string
  school_id: string
  student_id: string
  instructor_id: string
  package_id: string | null
  billing_mode: 'hourly' | 'package'
  lesson_date: string
  time_slots: string[]
  unit_price: number
  total_amount: number
  status: BookingStatus
  payment_transaction_id: string | null
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_ref: string | null
  notes: string | null
  created_at: string
  updated_at: string
  instructor?: Pick<Instructor, 'full_name' | 'photo_url' | 'color' | 'specialty'>
  student?: Pick<StudentProfile, 'full_name' | 'phone'>
}

export interface PaymentProviderConnection {
  id: string
  school_id: string
  provider: 'mercadopago'
  mp_user_id: string | null
  expires_at: string | null
  status: 'connected' | 'expired' | 'revoked' | 'error' | 'disconnected'
  last_error: string | null
  connected_at: string | null
  updated_at: string
}

export interface SchoolRules {
  school_id: string
  allow_student_cancellation: boolean
  cancellation_notice_hours: number
  allow_student_reschedule: boolean
  reschedule_notice_hours: number
  minimum_booking_notice_hours: number
  booking_window_days: number
  trial_lesson_enabled: boolean
  max_active_bookings_per_student: number | null
  created_at: string
  updated_at: string
}

export interface SchoolTripSettings {
  school_id: string
  trip_start_date: string | null
  trip_end_date: string | null
  booking_mode: 'both' | 'trip_only'
  location_note: string | null
  updated_at: string
}

export interface InstructorCommissionPayment {
  id: string
  school_id: string
  instructor_id: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
  updated_at: string
  instructor?: Pick<Instructor, 'id' | 'full_name' | 'color' | 'photo_url'>
}

export interface SalesHistoryEntry {
  id: string
  kind: 'single_lesson' | 'package' | 'trip'
  origin: 'online' | 'presencial'
  title: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  amount: number
  payment_status: PaymentStatus
  sale_status: string
  payment_method_label: string
  external_reference: string | null
  mercadopago_payment_id: number | null
  mercadopago_status: string | null
  mercadopago_status_detail: string | null
  created_at: string
  updated_at: string
  can_refund: boolean
  coupon_usage: string[]
  refund_reason: string | null
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface BookingWizardState {
  schoolId: string
  selectionType: 'single' | 'trial' | 'package' | null
  selectedPackage: LessonPackage | null
  selectedDate: Date | null
  selectedInstructor: Instructor | null
  selectedSlots: string[]
  packageLessons: PackageLessonDraft[]
  activePackageLessonIndex: number
  step: 1 | 2 | 3 | 4 | 5
}

// ─── Dashboard analytics ──────────────────────────────────────────────────────

export interface BookingMetric {
  month: string
  total_bookings: number
  total_revenue: number
  gross_revenue: number
  fee_amount: number
  net_revenue: number
  completed: number
  cancelled: number
}

export interface InstructorRankRow {
  id: string
  full_name: string
  photo_url: string | null
  hourly_price: number
  total_bookings: number
  total_revenue: number
  avg_hours: number
}

export interface DashboardKPIs {
  revenueThisMonth: number
  revenueLastMonth: number
  grossRevenueThisMonth: number
  grossRevenueLastMonth: number
  mercadoPagoFeesThisMonth: number
  mercadoPagoFeesLastMonth: number
  netRevenueThisMonth: number
  netRevenueLastMonth: number
  bookingsThisMonth: number
  bookingsLastMonth: number
  activeInstructors: number
  upcomingLessons: number
  paidScheduledLessons: number
}

export interface DashboardCalendarBooking {
  id: string
  lesson_date: string
  time_slots: string[]
  total_amount: number
  status: BookingStatus
  instructor?: Pick<Instructor, 'id' | 'full_name' | 'color' | 'specialty'>
  student?: Pick<StudentProfile, 'full_name' | 'phone'>
}

export interface ReportFilterOptions {
  instructors: Pick<Instructor, 'id' | 'full_name' | 'color'>[]
  coupons: Pick<DiscountCoupon, 'id' | 'code' | 'name' | 'active'>[]
}

export interface ReportTrendPoint {
  date: string
  revenue: number
  gross_revenue: number
  fee_amount: number
  net_revenue: number
  bookings: number
  discount_amount: number
}

export interface ReportInstructorSummary {
  id: string
  full_name: string
  color: string
  photo_url?: string | null
  bookings: number
  revenue: number
}

export interface ReportCouponSummary {
  id: string
  code: string
  name: string
  redemptions: number
  discount_amount: number
}

export interface ReportKpis {
  totalRevenue: number
  grossRevenue: number
  mercadoPagoFees: number
  netRevenue: number
  totalBookings: number
  averageTicket: number
  uniqueStudents: number
  couponRedemptions: number
  totalDiscounts: number
  completedBookings: number
  pendingBookings: number
  refundedAmount: number
  abandonedOrders: number
}

// ─── Server Action result ─────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }
