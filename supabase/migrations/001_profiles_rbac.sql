-- Migration: 001_profiles_rbac.sql
-- Description: Create profiles table with role-based access control (RBAC)
-- Date: 2025-08-30

-- Create custom types
CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'both', 'admin');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'not_started');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'buyer',
  kyc_status kyc_status NOT NULL DEFAULT 'not_started',
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  business_license_number TEXT,
  tax_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_kyc_status_idx ON profiles(kyc_status);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at);
CREATE INDEX IF NOT EXISTS profiles_company_name_idx ON profiles(company_name);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
COMMENT ON COLUMN profiles.role IS 'User role: buyer, seller, both, or admin';
COMMENT ON COLUMN profiles.kyc_status IS 'KYC verification status';
COMMENT ON COLUMN profiles.company_name IS 'Company name for business users';
COMMENT ON COLUMN profiles.business_license_number IS 'Business license number for verification';
