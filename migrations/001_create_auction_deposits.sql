-- Migration: Create auction_deposits table for T035 - Authorize deposit
-- This table stores deposit authorizations for auction bidding

CREATE TABLE IF NOT EXISTS auction_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  auction_id UUID NOT NULL,
  stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
  amount_cad DECIMAL(10,2) NOT NULL CHECK (amount_cad >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'cancelled', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  captured_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Foreign key constraints (assuming these tables exist)
  CONSTRAINT fk_auction_deposits_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_auction_deposits_auction_id FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent multiple deposits per user per auction
  CONSTRAINT unique_user_auction_deposit UNIQUE (user_id, auction_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_deposits_user_id ON auction_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_deposits_auction_id ON auction_deposits(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_deposits_status ON auction_deposits(status);
CREATE INDEX IF NOT EXISTS idx_auction_deposits_stripe_payment_intent_id ON auction_deposits(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_auction_deposits_created_at ON auction_deposits(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auction_deposits_updated_at 
    BEFORE UPDATE ON auction_deposits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE auction_deposits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deposits
CREATE POLICY "Users can view their own deposits" ON auction_deposits
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own deposits
CREATE POLICY "Users can insert their own deposits" ON auction_deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own deposits
CREATE POLICY "Users can update their own deposits" ON auction_deposits
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Service role can access all deposits (for admin operations)
CREATE POLICY "Service role can access all deposits" ON auction_deposits
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE auction_deposits IS 'Stores deposit authorizations for auction bidding with Stripe PaymentIntent integration';
COMMENT ON COLUMN auction_deposits.user_id IS 'ID of the user making the deposit';
COMMENT ON COLUMN auction_deposits.auction_id IS 'ID of the auction for which the deposit is made';
COMMENT ON COLUMN auction_deposits.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for the deposit authorization';
COMMENT ON COLUMN auction_deposits.amount_cad IS 'Deposit amount in Canadian dollars';
COMMENT ON COLUMN auction_deposits.status IS 'Status of the deposit: pending, authorized, captured, cancelled, failed';
COMMENT ON COLUMN auction_deposits.captured_at IS 'Timestamp when the deposit was captured (auction won)';
COMMENT ON COLUMN auction_deposits.cancelled_at IS 'Timestamp when the deposit was cancelled (auction lost/cancelled)';
