# T068 - Zod Validation Implementation

## Overview

This document describes the comprehensive Zod validation system implemented for the MatEx platform. The implementation provides type-safe validation for all API endpoints and forms with centralized schemas and consistent error handling.

## Implementation Details

### Files Created/Modified

1. **`src/lib/schemas.ts`** - Centralized Zod schemas for all data validation
2. **`src/app/api/checkout/fixed/route.ts`** - Updated to use centralized validation
3. **Existing API routes** - Already using Zod validation (auctions, settings, etc.)

### Key Features

#### 1. Centralized Schema Library

The `schemas.ts` file provides comprehensive validation schemas organized by domain:

- **Common Schemas**: UUID, Email, Phone, Password, Currency, Date validation
- **Enum Schemas**: User roles, KYC status, listing conditions, order status, etc.
- **Domain Schemas**: User profiles, listings, auctions, orders, inspections, notifications
- **Admin Schemas**: KYC updates, listing moderation, bulk operations
- **Legal Schemas**: Document management and acceptance tracking
- **Utility Functions**: Validation helpers and error formatting

#### 2. Type-Safe Validation

```typescript
// Example usage in API routes
import { CheckoutCreateSchema, validateRequest } from '@/lib/schemas';

const validation = validateRequest(CheckoutCreateSchema, requestData);
if (!validation.success) {
  return NextResponse.json({
    success: false,
    error: validation.error,
    message: validation.message,
    details: validation.details
  }, { status: 400 });
}

const { listing_id, success_url, cancel_url } = validation.data;
```

#### 3. Comprehensive Error Handling

The validation system provides detailed error messages with field-specific feedback:

```typescript
{
  "success": false,
  "error": "Validation Error",
  "message": "Title is required; Price must be positive",
  "details": {
    "title": ["Title is required"],
    "price_cad": ["Price must be positive"]
  }
}
```

### Schema Categories

#### Common Validation Schemas

```typescript
export const UUIDSchema = z.string().uuid('Invalid UUID format');
export const EmailSchema = z.string().email('Invalid email format');
export const CurrencySchema = z.number().positive('Amount must be positive').max(999999.99);
export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number');
```

#### Business Domain Schemas

**User & Profile Management:**
- `ProfileCreateSchema` - User profile creation
- `ProfileUpdateSchema` - Profile updates
- `UserSignupSchema` - User registration
- `UserLoginSchema` - Authentication

**Marketplace Operations:**
- `ListingCreateSchema` - Listing creation with comprehensive validation
- `ListingUpdateSchema` - Listing modifications
- `ListingSearchSchema` - Search and filtering parameters
- `AuctionCreateSchema` - Auction setup with date validation
- `BidCreateSchema` - Bid placement validation

**Order Management:**
- `OrderCreateSchema` - Order creation
- `OrderUpdateSchema` - Order status updates
- `CheckoutCreateSchema` - Checkout session creation
- `RefundCreateSchema` - Refund processing

**Inspection System:**
- `InspectionCreateSchema` - Inspection slot creation with future date validation
- `InspectionUpdateSchema` - Slot modifications
- `InspectionBookingSchema` - Booking requests

#### Advanced Validation Features

**Cross-Field Validation:**
```typescript
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
```

**Conditional Validation:**
```typescript
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
```

### API Integration Patterns

#### Standard Validation Pattern

```typescript
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const raw = await request.json().catch(() => null);
    
    // Validate using centralized schema
    const validation = validateRequest(SomeSchema, raw);
    
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        message: validation.message,
        details: validation.details
      }, { status: 400 });
    }
    
    // Use validated data with full type safety
    const validatedData = validation.data;
    
    // Continue with business logic...
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
```

#### Query Parameter Validation

```typescript
// For GET endpoints with query parameters
const { searchParams } = new URL(request.url);
const queryParams = {
  page: parseInt(searchParams.get('page') || '1'),
  per_page: parseInt(searchParams.get('per_page') || '20'),
  material: searchParams.get('material'),
  condition: searchParams.get('condition')
};

const validation = validateRequest(ListingSearchSchema, queryParams);
```

### Error Response Standards

All validation errors follow a consistent format:

```typescript
interface ValidationErrorResponse {
  success: false;
  error: string;           // "Validation Error"
  message: string;         // Human-readable summary
  details: Record<string, string[]>; // Field-specific errors
}

interface SuccessResponse<T> {
  success: true;
  data: T;                 // Validated and typed data
}
```

### Security Benefits

1. **Input Sanitization**: All user inputs are validated and sanitized
2. **Type Safety**: TypeScript ensures compile-time type checking
3. **SQL Injection Prevention**: Validated data reduces injection risks
4. **Business Logic Protection**: Invalid data is rejected before processing
5. **Consistent Error Handling**: Standardized error responses

### Performance Considerations

1. **Schema Reuse**: Centralized schemas reduce memory usage
2. **Early Validation**: Invalid requests are rejected quickly
3. **Type Inference**: TypeScript provides compile-time optimizations
4. **Minimal Runtime Overhead**: Zod validation is highly optimized

### Testing Strategy

#### Unit Tests for Schemas

```typescript
describe('UserSignupSchema', () => {
  it('should validate correct signup data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      full_name: 'John Doe',
      role: 'buyer'
    };
    
    const result = UserSignupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'SecurePass123',
      full_name: 'John Doe',
      role: 'buyer'
    };
    
    const result = UserSignupSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
```

#### Integration Tests for API Endpoints

```typescript
describe('POST /api/checkout/fixed', () => {
  it('should create checkout session with valid data', async () => {
    const validPayload = {
      listing_id: 'valid-uuid',
      success_url: 'https://example.com/success'
    };
    
    const response = await request(app)
      .post('/api/checkout/fixed')
      .send(validPayload)
      .expect(200);
      
    expect(response.body.success).toBe(true);
  });
  
  it('should reject invalid listing_id', async () => {
    const invalidPayload = {
      listing_id: 'invalid-uuid',
      success_url: 'https://example.com/success'
    };
    
    const response = await request(app)
      .post('/api/checkout/fixed')
      .send(invalidPayload)
      .expect(400);
      
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Validation Error');
  });
});
```

### Migration Guide

For existing API routes without Zod validation:

1. **Import centralized schemas:**
   ```typescript
   import { SomeSchema, validateRequest } from '@/lib/schemas';
   ```

2. **Replace manual validation:**
   ```typescript
   // Before
   if (!data.email || !data.password) {
     return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
   }
   
   // After
   const validation = validateRequest(UserLoginSchema, data);
   if (!validation.success) {
     return NextResponse.json({
       success: false,
       error: validation.error,
       message: validation.message,
       details: validation.details
     }, { status: 400 });
   }
   ```

3. **Use validated data:**
   ```typescript
   const { email, password } = validation.data; // Fully typed
   ```

### Future Enhancements

1. **Custom Validators**: Add domain-specific validation rules
2. **Async Validation**: Database uniqueness checks
3. **Conditional Schemas**: Dynamic validation based on user context
4. **Internationalization**: Multi-language error messages
5. **Schema Versioning**: API version-specific validation

## Conclusion

The T068 Zod validation implementation provides:

- **Type Safety**: Compile-time and runtime type checking
- **Consistency**: Standardized validation across all endpoints
- **Security**: Input sanitization and validation
- **Developer Experience**: Clear error messages and type inference
- **Maintainability**: Centralized schema management
- **Performance**: Optimized validation with early rejection

This implementation ensures that all user inputs are properly validated, providing a secure and reliable foundation for the MatEx platform.
