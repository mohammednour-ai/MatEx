import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const EmailSchema = z.string().email('Invalid email format');

export const PhoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
);

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');

export const CurrencySchema = z
  .number()
  .positive('Amount must be positive')
  .max(999999.99, 'Amount cannot exceed $999,999.99');

export const DateStringSchema = z.string().datetime('Invalid date format');

// ============================================================================
// ENUM SCHEMAS
// ============================================================================

export const UserRoleSchema = z.enum(['buyer', 'seller', 'both', 'admin']);

export const KYCStatusSchema = z.enum([
  'not_started',
  'pending',
  'approved',
  'rejected'
]);

export const ListingConditionSchema = z.enum([
  'new',
  'like_new',
  'good',
  'fair',
  'poor',
  'scrap'
]);

export const PricingTypeSchema = z.enum(['fixed', 'auction']);

export const ListingStatusSchema = z.enum([
  'draft',
  'active',
  'sold',
  'expired',
  'cancelled'
]);

export const OrderTypeSchema = z.enum(['fixed', 'auction']);

export const OrderStatusSchema = z.enum([
  'pending',
  'paid',
  'cancelled',
  'fulfilled'
]);

export const BookingStatusSchema = z.enum([
  'booked',
  'attended',
  'no_show',
  'cancelled'
]);

export const NotificationTypeSchema = z.enum([
  'info',
  'warning',
  'success',
  'error'
]);

export const NotificationChannelSchema = z.enum(['inapp', 'email', 'sms']);

// ============================================================================
// USER & PROFILE SCHEMAS
// ============================================================================

export const ProfileCreateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: PhoneSchema.optional(),
  role: UserRoleSchema,
  company_name: z.string().max(100).optional(),
  company_address: z.string().max(500).optional(),
  business_license: z.string().max(100).optional(),
  tax_number: z.string().max(50).optional(),
  bio: z.string().max(1000).optional()
});

export const ProfileUpdateSchema = ProfileCreateSchema.partial();

export const UserSignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  full_name: z.string().min(1, 'Full name is required').max(100),
  role: UserRoleSchema
});

export const UserLoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required')
});

// ============================================================================
// LISTING SCHEMAS
// ============================================================================

export const ListingCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  material: z.string().min(1, 'Material is required').max(100),
  condition: ListingConditionSchema,
  quantity: z.number().positive('Quantity must be positive').max(999999),
  unit: z.string().min(1, 'Unit is required').max(50),
  pricing_type: PricingTypeSchema,
  price_cad: CurrencySchema.optional(),
  buy_now_cad: CurrencySchema.optional(),
  location_city: z.string().min(1, 'City is required').max(100),
  location_province: z.string().min(1, 'Province is required').max(100),
  images: z.array(z.string().url()).max(5, 'Maximum 5 images allowed').optional()
});

export const ListingUpdateSchema = ListingCreateSchema.partial();

export const ListingSearchSchema = z.object({
  q: z.string().optional(),
  material: z.string().optional(),
  condition: ListingConditionSchema.optional(),
  pricing_type: PricingTypeSchema.optional(),
  location_province: z.string().optional(),
  location_city: z.string().optional(),
  min_price: z.number().positive().optional(),
  max_price: z.number().positive().optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'title']).optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(50).default(12)
});

// ============================================================================
// AUCTION & BID SCHEMAS
// ============================================================================

export const AuctionCreateSchema = z.object({
  listing_id: UUIDSchema,
  start_at: DateStringSchema,
  end_at: DateStringSchema,
  min_increment_cad: CurrencySchema,
  soft_close_seconds: z.number().int().positive().max(3600)
}).refine(
  (data) => new Date(data.end_at) > new Date(data.start_at),
  {
    message: 'End time must be after start time',
    path: ['end_at']
  }
);

export const BidCreateSchema = z.object({
  amount_cad: CurrencySchema
});

// ============================================================================
// ORDER SCHEMAS
// ============================================================================

export const OrderCreateSchema = z.object({
  listing_id: UUIDSchema,
  type: OrderTypeSchema,
  total_cad: CurrencySchema,
  platform_fee_cad: CurrencySchema.optional(),
  seller_payout_cad: CurrencySchema.optional(),
  notes: z.string().max(1000).optional()
});

export const OrderUpdateSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().max(1000).optional(),
  fulfilled_at: DateStringSchema.optional()
});

// ============================================================================
// INSPECTION SCHEMAS
// ============================================================================

export const InspectionCreateSchema = z.object({
  listing_id: UUIDSchema,
  slot_at: DateStringSchema,
  capacity: z.number().int().positive().max(50),
  duration_minutes: z.number().int().positive().max(480),
  location_address: z.string().min(1, 'Address is required').max(500),
  location_notes: z.string().max(1000).optional()
}).refine(
  (data) => new Date(data.slot_at) > new Date(),
  {
    message: 'Inspection slot must be in the future',
    path: ['slot_at']
  }
);

export const InspectionUpdateSchema = z.object({
  listing_id: UUIDSchema.optional(),
  slot_at: DateStringSchema.optional(),
  capacity: z.number().int().positive().max(50).optional(),
  duration_minutes: z.number().int().positive().max(480).optional(),
  location_address: z.string().min(1, 'Address is required').max(500).optional(),
  location_notes: z.string().max(1000).optional()
});

export const InspectionBookingSchema = z.object({
  notes: z.string().max(500).optional()
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const NotificationCreateSchema = z.object({
  user_id: UUIDSchema,
  type: NotificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(200),
  message: z.string().min(1, 'Message is required').max(1000),
  link: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
});

export const NotificationTemplateSchema = z.object({
  code: z.string().min(1, 'Code is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  channel: NotificationChannelSchema,
  subject: z.string().max(200).optional(),
  body_md: z.string().min(1, 'Body is required').max(10000),
  variables: z.array(z.string()).optional(),
  is_active: z.boolean().default(true)
});

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const AppSettingSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100),
  value: z.any(),
  description: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  is_public: z.boolean().default(false)
});

export const SettingsUpdateSchema = z.object({
  settings: z.array(AppSettingSchema).min(1, 'At least one setting is required')
});

// ============================================================================
// DEPOSIT & PAYMENT SCHEMAS
// ============================================================================

export const DepositAuthorizeSchema = z.object({
  auction_id: UUIDSchema,
  amount_cad: CurrencySchema
});

export const CheckoutCreateSchema = z.object({
  listing_id: UUIDSchema,
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional()
});

export const RefundCreateSchema = z.object({
  payment_intent_id: z.string().min(1, 'Payment intent ID is required'),
  amount_cad: CurrencySchema.optional(),
  reason: z.string().min(1, 'Reason is required').max(500)
});

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const KYCUpdateSchema = z.object({
  kyc_status: KYCStatusSchema,
  kyc_rejection_reason: z.string().max(500).optional()
});

export const ListingModerationSchema = z.object({
  status: ListingStatusSchema,
  featured: z.boolean().optional(),
  moderation_notes: z.string().max(1000).optional()
});

export const BulkListingUpdateSchema = z.object({
  listing_ids: z.array(UUIDSchema).min(1, 'At least one listing ID is required'),
  updates: ListingModerationSchema
});

// ============================================================================
// LEGAL SCHEMAS
// ============================================================================

export const LegalDocumentSchema = z.object({
  document_type: z.enum([
    'terms_of_service',
    'privacy_policy',
    'seller_agreement',
    'buyer_agreement',
    'refund_policy',
    'cookie_policy',
    'data_processing_agreement'
  ]),
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(100, 'Content must be at least 100 characters'),
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, 'Version must be in format X.Y or X.Y.Z')
});

export const LegalAcceptanceSchema = z.object({
  document_types: z.array(z.string()).min(1, 'At least one document type is required')
});

// ============================================================================
// PAGINATION & FILTERING SCHEMAS
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(100).default(20)
});

export const DateRangeSchema = z.object({
  start_date: DateStringSchema.optional(),
  end_date: DateStringSchema.optional()
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.end_date) >= new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['end_date']
  }
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createValidationError(error: z.ZodError) {
  const flat = error.flatten();
  const messages = [
    ...(flat.formErrors || []),
    ...Object.values(flat.fieldErrors || {}).flatMap(v => v || [])
  ];

  return {
    success: false as const,
    error: 'Validation Error',
    message: messages.join('; ') || 'Invalid request data',
    details: flat.fieldErrors as Record<string, string[]>
  };
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  message: string;
  details: Record<string, string[]>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return createValidationError(result.error);
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().optional()
});

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  pagination: z.object({
    page: z.number().int().positive(),
    per_page: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    total_pages: z.number().int().nonnegative()
  }).optional()
});
