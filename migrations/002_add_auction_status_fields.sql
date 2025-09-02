-- Migration: Add status tracking fields to auctions table for T036 - Release/refund deposits
-- This migration adds status and processing timestamp fields to track auction completion

-- Add status field to auctions table
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'completed', 'cancelled'));

-- Add processed timestamp field
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Create index on status for efficient queries
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);

-- Create index on end_at for finding ended auctions
CREATE INDEX IF NOT EXISTS idx_auctions_end_at ON auctions(end_at);

-- Create composite index for ended auctions query
CREATE INDEX IF NOT EXISTS idx_auctions_ended_active ON auctions(end_at, status) 
WHERE status = 'active';

-- Add comments for documentation
COMMENT ON COLUMN auctions.status IS 'Auction status: active, completed, cancelled';
COMMENT ON COLUMN auctions.processed_at IS 'Timestamp when auction deposits were processed';

-- Update existing auctions to have 'active' status if they don't have end_at passed
UPDATE auctions 
SET status = 'active' 
WHERE status IS NULL AND (end_at IS NULL OR end_at > now());

-- Update existing auctions to have 'completed' status if they have end_at passed
UPDATE auctions 
SET status = 'completed' 
WHERE status IS NULL AND end_at <= now();
