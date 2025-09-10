# T006 - Profiles + RBAC Schema

## Overview
Implemented user profiles table with Role-Based Access Control (RBAC) system to manage user permissions and KYC status across the MatEx platform.

## Implementation Details

### 1. Profiles Table Structure
- **User Identity**: Links to Supabase auth.users table
- **Role Management**: Buyer, seller, both, or admin roles
- **KYC Integration**: Know Your Customer status tracking
- **Business Information**: Company details for business users

### 2. Row Level Security (RLS)
- **User Access**: Users can read and update their own profiles
- **Admin Access**: Admins have full access to all profiles
- **Public Information**: Limited public profile data for listings

## Technical Implementation

### Database Schema (001_profiles_rbac.sql)
```sql
-- Create enum types
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'both', 'admin');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'not_required');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  kyc_status kyc_status NOT NULL DEFAULT 'pending',
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins have full access" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_kyc_status ON profiles(kyc_status);
```

## Files Created
- `supabase/migrations/001_profiles_rbac.sql` - Database migration

## Security Features

### Role-Based Access Control
- **Buyer Role**: Can browse and purchase materials
- **Seller Role**: Can list materials and manage auctions
- **Both Role**: Combined buyer and seller permissions
- **Admin Role**: Full platform administration access

### KYC Status Management
- **Pending**: Default status for new users
- **Approved**: Verified users with full access
- **Rejected**: Users requiring additional verification
- **Not Required**: For certain user types or regions

### Row Level Security Policies
- Users can only access their own profile data
- Admins bypass RLS for management operations
- Public profile information available for listings

## Data Model

### Profile Fields
- `id`: UUID linking to auth.users
- `full_name`: User's display name
- `phone`: Contact information
- `role`: User's platform role
- `kyc_status`: Verification status
- `company_name`: Business name (optional)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update

### Relationships
- One-to-one with auth.users table
- One-to-many with listings (for sellers)
- One-to-many with orders (for buyers/sellers)

## Success Metrics
- **Security**: Proper access control implementation
- **Scalability**: Efficient queries with proper indexing
- **Compliance**: KYC tracking for regulatory requirements
- **User Experience**: Smooth role-based feature access

## Future Enhancements
- Additional profile fields as needed
- Role hierarchy and permissions matrix
- Automated KYC status updates
- Profile completion tracking
