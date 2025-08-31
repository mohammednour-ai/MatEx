-- Migration 008: Terms acceptances schema
-- Task: T013 - Terms acceptances schema
-- Description: Create schema for managing terms of service, privacy policy, and other legal document acceptances

-- Create enum for terms types
CREATE TYPE terms_type AS ENUM (
    'terms_of_service',
    'privacy_policy',
    'seller_agreement',
    'buyer_agreement',
    'inspection_terms',
    'payment_terms',
    'data_processing_agreement'
);

-- Create terms_versions table to track different versions of legal documents
CREATE TABLE terms_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type terms_type NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure only one active version per type
    CONSTRAINT unique_active_version UNIQUE (type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Create terms_acceptances table to track user acceptances
CREATE TABLE terms_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    terms_version_id UUID NOT NULL REFERENCES terms_versions(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    acceptance_method VARCHAR(50) DEFAULT 'web_form', -- web_form, api, registration, etc.
    
    -- Prevent duplicate acceptances
    CONSTRAINT unique_user_terms_acceptance UNIQUE (user_id, terms_version_id)
);

-- Create indexes for performance
CREATE INDEX idx_terms_versions_type_active ON terms_versions(type, is_active) WHERE is_active = true;
CREATE INDEX idx_terms_versions_effective_date ON terms_versions(effective_date DESC);
CREATE INDEX idx_terms_acceptances_user_id ON terms_acceptances(user_id);
CREATE INDEX idx_terms_acceptances_terms_version ON terms_acceptances(terms_version_id);
CREATE INDEX idx_terms_acceptances_accepted_at ON terms_acceptances(accepted_at DESC);

-- Enable RLS
ALTER TABLE terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for terms_versions
-- Anyone can read active terms versions
CREATE POLICY "Anyone can read active terms versions" ON terms_versions
    FOR SELECT USING (is_active = true);

-- Only admins can manage terms versions
CREATE POLICY "Only admins can insert terms versions" ON terms_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update terms versions" ON terms_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for terms_acceptances
-- Users can read their own acceptances
CREATE POLICY "Users can read own acceptances" ON terms_acceptances
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own acceptances
CREATE POLICY "Users can insert own acceptances" ON terms_acceptances
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can read all acceptances
CREATE POLICY "Admins can read all acceptances" ON terms_acceptances
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Helper function to get current active version of terms
CREATE OR REPLACE FUNCTION get_active_terms_version(terms_type_param terms_type)
RETURNS terms_versions AS $$
DECLARE
    result terms_versions;
BEGIN
    SELECT * INTO result
    FROM terms_versions
    WHERE type = terms_type_param 
    AND is_active = true
    AND effective_date <= NOW()
    ORDER BY effective_date DESC
    LIMIT 1;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has accepted current terms
CREATE OR REPLACE FUNCTION has_user_accepted_current_terms(
    user_id_param UUID,
    terms_type_param terms_type
)
RETURNS BOOLEAN AS $$
DECLARE
    current_version_id UUID;
    acceptance_exists BOOLEAN := false;
BEGIN
    -- Get current active version
    SELECT id INTO current_version_id
    FROM terms_versions
    WHERE type = terms_type_param 
    AND is_active = true
    AND effective_date <= NOW()
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- Check if user has accepted this version
    IF current_version_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM terms_acceptances
            WHERE user_id = user_id_param
            AND terms_version_id = current_version_id
        ) INTO acceptance_exists;
    END IF;
    
    RETURN acceptance_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to accept terms
CREATE OR REPLACE FUNCTION accept_terms(
    terms_type_param terms_type,
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL,
    acceptance_method_param VARCHAR(50) DEFAULT 'web_form'
)
RETURNS UUID AS $$
DECLARE
    current_version_id UUID;
    acceptance_id UUID;
BEGIN
    -- Get current active version
    SELECT id INTO current_version_id
    FROM terms_versions
    WHERE type = terms_type_param 
    AND is_active = true
    AND effective_date <= NOW()
    ORDER BY effective_date DESC
    LIMIT 1;
    
    IF current_version_id IS NULL THEN
        RAISE EXCEPTION 'No active version found for terms type: %', terms_type_param;
    END IF;
    
    -- Insert acceptance (ON CONFLICT DO NOTHING to handle duplicates)
    INSERT INTO terms_acceptances (
        user_id,
        terms_version_id,
        ip_address,
        user_agent,
        acceptance_method
    ) VALUES (
        auth.uid(),
        current_version_id,
        ip_address_param,
        user_agent_param,
        acceptance_method_param
    )
    ON CONFLICT (user_id, terms_version_id) DO NOTHING
    RETURNING id INTO acceptance_id;
    
    RETURN acceptance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's terms acceptance status
CREATE OR REPLACE FUNCTION get_user_terms_status(user_id_param UUID DEFAULT auth.uid())
RETURNS TABLE (
    terms_type terms_type,
    has_accepted BOOLEAN,
    accepted_at TIMESTAMPTZ,
    current_version VARCHAR(20),
    acceptance_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tv.type,
        (ta.id IS NOT NULL) as has_accepted,
        ta.accepted_at,
        tv.version as current_version,
        true as acceptance_required -- All terms require acceptance
    FROM terms_versions tv
    LEFT JOIN terms_acceptances ta ON (
        ta.terms_version_id = tv.id 
        AND ta.user_id = user_id_param
    )
    WHERE tv.is_active = true
    AND tv.effective_date <= NOW()
    ORDER BY tv.type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial terms versions
INSERT INTO terms_versions (type, version, title, content, effective_date, is_active) VALUES
(
    'terms_of_service',
    '1.0',
    'Terms of Service',
    '# MatEx Terms of Service

## 1. Acceptance of Terms
By accessing and using the MatEx platform, you agree to be bound by these Terms of Service.

## 2. Platform Description
MatEx is a B2B marketplace for waste, scrap, and surplus materials connecting buyers and sellers.

## 3. User Responsibilities
- Provide accurate information
- Comply with all applicable laws
- Respect other users and platform integrity

## 4. Prohibited Activities
- Fraudulent transactions
- Misrepresentation of materials
- Violation of applicable laws

## 5. Limitation of Liability
MatEx provides the platform "as is" and limits liability as permitted by law.

## 6. Modifications
These terms may be updated from time to time with notice to users.

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'privacy_policy',
    '1.0',
    'Privacy Policy',
    '# MatEx Privacy Policy

## 1. Information We Collect
We collect information you provide directly, usage data, and technical information.

## 2. How We Use Information
- Provide and improve our services
- Process transactions
- Communicate with users
- Ensure platform security

## 3. Information Sharing
We do not sell personal information. We may share data with service providers and as required by law.

## 4. Data Security
We implement appropriate security measures to protect your information.

## 5. Your Rights
You have rights to access, correct, and delete your personal information.

## 6. Contact Us
For privacy questions, contact us at privacy@matex.com

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'seller_agreement',
    '1.0',
    'Seller Agreement',
    '# MatEx Seller Agreement

## 1. Seller Responsibilities
- Accurate material descriptions
- Timely fulfillment of orders
- Compliance with quality standards
- Proper documentation

## 2. Listing Requirements
- Complete material specifications
- Accurate quantities and conditions
- Appropriate pricing
- Clear photos and documentation

## 3. Transaction Process
- Honor accepted bids and orders
- Coordinate inspections when required
- Arrange proper shipping and handling
- Maintain communication with buyers

## 4. Fees and Payments
- Platform commission on successful sales
- Payment processing fees
- Deposit requirements for certain materials

## 5. Quality Assurance
- Materials must match descriptions
- Accept returns for misrepresented items
- Participate in dispute resolution

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'buyer_agreement',
    '1.0',
    'Buyer Agreement',
    '# MatEx Buyer Agreement

## 1. Buyer Responsibilities
- Accurate bid submissions
- Timely payment for accepted orders
- Proper material inspection
- Compliance with pickup/delivery terms

## 2. Bidding Process
- Submit competitive and realistic bids
- Honor accepted bids
- Provide required deposits when applicable
- Maintain good faith negotiations

## 3. Payment Terms
- Payment due within agreed timeframes
- Use platform-approved payment methods
- Understand refund and dispute policies
- Cover applicable fees and taxes

## 4. Material Inspection
- Conduct thorough inspections when offered
- Report discrepancies promptly
- Accept materials matching descriptions
- Follow proper rejection procedures

## 5. Dispute Resolution
- Attempt direct resolution with sellers
- Use platform mediation services
- Provide evidence for claims
- Accept binding arbitration when required

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'inspection_terms',
    '1.0',
    'Inspection Terms and Conditions',
    '# MatEx Inspection Terms

## 1. Inspection Purpose
Inspections verify material quality, quantity, and condition before final purchase.

## 2. Inspection Rights
- Buyers may request inspections for eligible materials
- Sellers must accommodate reasonable inspection requests
- Third-party inspectors may be used for complex materials

## 3. Inspection Process
- Schedule within agreed timeframes
- Conduct thorough but non-destructive testing
- Document findings with photos and reports
- Complete within specified time limits

## 4. Inspection Results
- Accept materials matching descriptions
- Reject materials with significant discrepancies
- Negotiate adjustments for minor issues
- Follow proper documentation procedures

## 5. Costs and Responsibilities
- Inspection costs typically borne by requesting party
- Travel and accommodation expenses
- Equipment and testing fees
- Insurance and liability coverage

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'payment_terms',
    '1.0',
    'Payment Terms and Conditions',
    '# MatEx Payment Terms

## 1. Payment Methods
- Credit/debit cards via Stripe
- Bank transfers for large transactions
- Escrow services for high-value deals
- Cryptocurrency where legally permitted

## 2. Payment Schedule
- Deposits required for certain transactions
- Full payment due upon material acceptance
- Net payment terms for qualified buyers
- Late payment fees and interest charges

## 3. Escrow Services
- Automatic escrow for transactions over threshold
- Funds held until material acceptance
- Dispute resolution through escrow
- Release procedures and timeframes

## 4. Refunds and Disputes
- Refund eligibility criteria
- Dispute resolution process
- Chargeback procedures
- Platform mediation services

## 5. Fees and Charges
- Platform transaction fees
- Payment processing fees
- Currency conversion charges
- Premium service fees

Last updated: ' || NOW()::DATE,
    NOW(),
    true
),
(
    'data_processing_agreement',
    '1.0',
    'Data Processing Agreement',
    '# MatEx Data Processing Agreement

## 1. Data Processing Scope
This agreement covers personal data processing for platform operations.

## 2. Legal Basis
- Contract performance
- Legitimate business interests
- Legal compliance
- User consent where required

## 3. Data Categories
- Account and profile information
- Transaction and payment data
- Communication records
- Usage and analytics data

## 4. Processing Activities
- Platform service provision
- Transaction processing
- Customer support
- Security and fraud prevention

## 5. Data Protection Measures
- Encryption in transit and at rest
- Access controls and authentication
- Regular security assessments
- Incident response procedures

## 6. Data Subject Rights
- Right to access personal data
- Right to rectification and erasure
- Right to data portability
- Right to object to processing

## 7. International Transfers
- Adequate protection measures
- Standard contractual clauses
- Certification schemes
- Binding corporate rules

Last updated: ' || NOW()::DATE,
    NOW(),
    true
);

-- Add helpful comments
COMMENT ON TABLE terms_versions IS 'Stores different versions of legal documents and terms';
COMMENT ON TABLE terms_acceptances IS 'Tracks user acceptances of terms and legal documents';
COMMENT ON FUNCTION get_active_terms_version(terms_type) IS 'Returns the currently active version of specified terms type';
COMMENT ON FUNCTION has_user_accepted_current_terms(UUID, terms_type) IS 'Checks if user has accepted the current version of specified terms';
COMMENT ON FUNCTION accept_terms(terms_type, INET, TEXT, VARCHAR) IS 'Records user acceptance of current terms version';
COMMENT ON FUNCTION get_user_terms_status(UUID) IS 'Returns comprehensive terms acceptance status for a user';
