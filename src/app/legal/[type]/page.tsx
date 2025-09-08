import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { supabaseServer } from '@/lib/supabaseServer';

// Legal document types supported
const LEGAL_DOCUMENT_TYPES = {
  'terms-of-service': 'Terms of Service',
  'privacy-policy': 'Privacy Policy',
  'refund-policy': 'Refund Policy',
  'seller-agreement': 'Seller Agreement',
  'buyer-agreement': 'Buyer Agreement',
  'cookie-policy': 'Cookie Policy',
  'data-processing-agreement': 'Data Processing Agreement'
} as const;

type LegalDocumentType = keyof typeof LEGAL_DOCUMENT_TYPES;

interface LegalDocument {
  id: string;
  document_type: string;
  title: string;
  content: string;
  version: string;
  effective_date: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface PageProps {
  params: {
    type: string;
  };
}

async function getLegalDocument(type: string): Promise<LegalDocument | null> {
  try {
    const { data, error } = await supabaseServer
      .from('legal_documents')
      .select('*')
      .eq('document_type', type.replace('-', '_'))
      .eq('is_published', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching legal document:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLegalDocument:', error);
    return null;
  }
}

// Default content for legal documents (Canadian compliance)
const getDefaultContent = (type: LegalDocumentType): { title: string; content: string; version: string } => {
  switch (type) {
    case 'terms-of-service':
      return {
        title: 'Terms of Service',
        version: '1.0',
        content: `# Terms of Service

**Effective Date:** ${new Date().toLocaleDateString('en-CA')}

## 1. Introduction

Welcome to MatEx ("we," "our," or "us"), Canada's premier material exchange platform. These Terms of Service ("Terms") govern your use of our website and services located at matex.ca (the "Service") operated by MatEx Inc.

By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.

## 2. Compliance with Canadian Law

### 2.1 Auctioneers Act Compliance
Our auction services comply with applicable provincial Auctioneers Acts across Canada. All auctions are conducted in accordance with:
- Ontario Auctioneers Act (where applicable)
- Provincial consumer protection legislation
- Competition Act (Canada)

### 2.2 Consumer Protection
We adhere to Canadian consumer protection laws, including:
- Consumer Protection Act (Ontario)
- Provincial consumer protection legislation
- Fair trading practices

## 3. Account Registration and Verification

### 3.1 Account Creation
- You must be at least 18 years old to create an account
- You must provide accurate and complete information
- You are responsible for maintaining account security

### 3.2 Know Your Customer (KYC) Verification
- Business sellers must provide valid business registration
- Identity verification may be required for high-value transactions
- We reserve the right to request additional documentation

## 4. Marketplace Rules

### 4.1 Listing Requirements
- All materials must be accurately described
- Photos must represent the actual materials
- Hazardous materials require proper disclosure
- Compliance with environmental regulations is mandatory

### 4.2 Auction Terms
- Bids are legally binding commitments
- Deposit requirements apply to auction participation
- Soft close extensions may apply to prevent bid sniping
- Reserve prices may be set by sellers

## 5. Payment and Fees

### 5.1 Platform Fees
- Transaction fees apply to completed sales
- Payment processing fees are charged separately
- Fee schedule is available in your account settings

### 5.2 Payment Terms
- Payments are processed through Stripe
- Deposits are held until transaction completion
- Refunds are processed according to our Refund Policy

## 6. Inspection Rights

### 6.1 Pre-Purchase Inspections
- Buyers have the right to inspect materials before purchase
- Inspection appointments must be scheduled through the platform
- Sellers must provide reasonable access for inspections

## 7. Dispute Resolution

### 7.1 Internal Resolution
- Disputes should first be reported through our platform
- We provide mediation services for transaction disputes
- Documentation and evidence must be provided

### 7.2 Legal Jurisdiction
- These Terms are governed by the laws of Ontario, Canada
- Disputes are subject to the jurisdiction of Ontario courts
- Alternative dispute resolution may be available

## 8. Prohibited Activities

You may not:
- List illegal or stolen materials
- Engage in fraudulent activities
- Manipulate auction processes
- Violate intellectual property rights
- Circumvent platform fees

## 9. Limitation of Liability

To the maximum extent permitted by law, MatEx shall not be liable for:
- Indirect, incidental, or consequential damages
- Loss of profits or business opportunities
- Material defects not disclosed by sellers
- Third-party actions or omissions

## 10. Privacy and Data Protection

Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.

## 11. Modifications to Terms

We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or platform notification. Continued use of the Service constitutes acceptance of modified Terms.

## 12. Termination

We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.

## 13. Contact Information

For questions about these Terms, please contact us at:
- Email: legal@matex.ca
- Address: [Company Address]
- Phone: [Company Phone]

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };

    case 'privacy-policy':
      return {
        title: 'Privacy Policy',
        version: '1.0',
        content: `# Privacy Policy

**Effective Date:** ${new Date().toLocaleDateString('en-CA')}

## 1. Introduction

MatEx Inc. ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our material exchange platform.

This policy complies with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation.

## 2. Information We Collect

### 2.1 Personal Information
- Name, email address, and phone number
- Business registration information
- Government-issued identification for verification
- Payment and banking information
- Communication records and transaction history

### 2.2 Technical Information
- IP address and device information
- Browser type and operating system
- Usage patterns and preferences
- Cookies and similar tracking technologies

### 2.3 Material and Transaction Data
- Listing descriptions and photographs
- Bid history and transaction records
- Inspection appointments and attendance
- Quality ratings and feedback

## 3. How We Use Your Information

We use your information to:
- Provide and maintain our services
- Process transactions and payments
- Verify identity and prevent fraud
- Communicate about your account and transactions
- Improve our platform and user experience
- Comply with legal obligations

## 4. Information Sharing and Disclosure

### 4.1 With Other Users
- Basic profile information for verified sellers/buyers
- Transaction history for reputation scoring
- Communication through our platform messaging

### 4.2 With Service Providers
- Payment processors (Stripe)
- Identity verification services
- Email and communication services
- Analytics and performance monitoring

### 4.3 Legal Requirements
We may disclose information when required by law or to:
- Comply with legal processes
- Protect our rights and property
- Ensure user safety and security
- Investigate fraud or violations

## 5. Data Retention

### 5.1 Account Information
- Active accounts: Retained while account is active
- Closed accounts: Retained for 7 years for legal compliance
- Transaction records: Retained for 7 years for tax and audit purposes

### 5.2 Communication Records
- Platform messages: Retained for 2 years
- Support communications: Retained for 3 years
- Legal notices: Retained permanently

### 5.3 KYC Documents
- Identity documents: Retained for 7 years after account closure
- Business registration: Retained for 7 years after account closure
- Verification records: Retained for audit and compliance purposes

## 6. Your Privacy Rights

Under PIPEDA and provincial privacy laws, you have the right to:
- Access your personal information
- Request correction of inaccurate information
- Request deletion of information (subject to legal requirements)
- Withdraw consent where applicable
- File complaints with privacy commissioners

## 7. Data Security

We implement appropriate security measures including:
- Encryption of sensitive data in transit and at rest
- Regular security assessments and updates
- Access controls and authentication
- Employee training on privacy and security
- Incident response procedures

## 8. International Data Transfers

Your information may be processed in Canada and other countries where our service providers operate. We ensure appropriate safeguards are in place for international transfers.

## 9. Cookies and Tracking

We use cookies and similar technologies for:
- Essential platform functionality
- User authentication and security
- Analytics and performance monitoring
- Personalization and preferences

You can control cookie settings through your browser preferences.

## 10. Children's Privacy

Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.

## 11. Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification. Your continued use constitutes acceptance of the updated policy.

## 12. Contact Information

For privacy-related questions or to exercise your rights, contact us at:
- Email: privacy@matex.ca
- Address: [Company Address]
- Phone: [Company Phone]

For complaints, you may also contact:
- Office of the Privacy Commissioner of Canada
- Provincial privacy commissioners

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };

    case 'refund-policy':
      return {
        title: 'Refund Policy',
        version: '1.0',
        content: `# Refund Policy

**Effective Date:** ${new Date().toLocaleDateString('en-CA')}

## 1. Introduction

This Refund Policy outlines the terms and conditions for refunds on the MatEx platform. This policy complies with Canadian consumer protection laws and provincial legislation.

## 2. Auction Deposits

### 2.1 Winning Bidders
- Deposits are applied toward the final purchase price
- No refund of deposits for successful auction winners
- Deposits may be forfeited for non-payment of remaining balance

### 2.2 Non-Winning Bidders
- Deposits are automatically refunded within 5-7 business days
- Refunds are processed to the original payment method
- No fees are charged for deposit refunds

### 2.3 Cancelled Auctions
- Full deposit refunds for seller-cancelled auctions
- Refunds processed within 3-5 business days
- Platform fees waived for cancelled auctions

## 3. Fixed Price Purchases

### 3.1 Inspection Period
- 48-hour inspection period after purchase confirmation
- Refunds available if materials significantly differ from description
- Buyer responsible for return shipping costs

### 3.2 Material Defects
- Full refunds for undisclosed material defects
- Partial refunds may be offered for minor discrepancies
- Photo and documentation evidence required

## 4. Platform Fees

### 4.1 Transaction Fees
- Non-refundable for completed transactions
- Refunded for cancelled or failed transactions
- Prorated refunds for disputed transactions

### 4.2 Listing Fees
- Non-refundable once listing is published
- Refunded for technical issues preventing listing display
- Credit may be offered for listing errors

## 5. Payment Processing

### 5.1 Processing Timeline
- Credit card refunds: 5-10 business days
- Bank transfer refunds: 3-7 business days
- PayPal refunds: 1-3 business days

### 5.2 Processing Fees
- Stripe processing fees are non-refundable
- Currency conversion fees are non-refundable
- International transfer fees may apply

## 6. Dispute Resolution

### 6.1 Internal Process
- Report disputes within 30 days of transaction
- Provide documentation and evidence
- Mediation services available

### 6.2 Refund Decisions
- Decisions made within 10 business days
- Partial refunds may be offered
- Final decisions are binding

## 7. Exceptions and Limitations

### 7.1 Non-Refundable Items
- Custom or specially ordered materials
- Perishable or time-sensitive materials
- Materials collected after inspection period

### 7.2 Fraudulent Activity
- No refunds for fraudulent transactions
- Account suspension may apply
- Legal action may be pursued

## 8. Consumer Protection Rights

Under Canadian consumer protection laws, you may have additional rights including:
- Cooling-off periods for certain transactions
- Right to cancel for misrepresentation
- Protection against unfair business practices

## 9. Contact Information

For refund requests or questions, contact us at:
- Email: refunds@matex.ca
- Phone: [Company Phone]
- Support Portal: [Support URL]

Include the following information:
- Transaction ID or order number
- Reason for refund request
- Supporting documentation

## 10. Policy Updates

This policy may be updated periodically. Changes will be communicated via email or platform notification. Continued use constitutes acceptance of updated terms.

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };

    default:
      return {
        title: 'Legal Document',
        version: '1.0',
        content: `# ${LEGAL_DOCUMENT_TYPES[type] || 'Legal Document'}

This document is currently being prepared. Please check back soon or contact us for more information.

For questions, please contact us at legal@matex.ca.

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };
  }
};

export default async function LegalPage({ params }: PageProps) {
  const { type } = params;

  // Validate document type
  if (!Object.keys(LEGAL_DOCUMENT_TYPES).includes(type)) {
    notFound();
  }

  const documentType = type as LegalDocumentType;

  // Try to get document from database first
  let document = await getLegalDocument(type);

  // If no document found in database, use default content
  if (!document) {
    const defaultContent = getDefaultContent(documentType);
    document = {
      id: 'default',
      document_type: type.replace('-', '_'),
      title: defaultContent.title,
      content: defaultContent.content,
      version: defaultContent.version,
      effective_date: new Date().toISOString(),
      is_published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {document.title}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Version {document.version} • Effective {new Date(document.effective_date).toLocaleDateString('en-CA')}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Published
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-8">
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b border-gray-200">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-gray-700">
                      {children}
                    </em>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-brand-500 pl-4 italic text-gray-600 my-4">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="border-gray-300 my-8" />
                  )
                }}
              >
                {document.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
            <p className="text-sm text-gray-600">
              Questions about this document? Contact us at{' '}
              <a href="mailto:legal@matex.ca" className="text-brand-600 hover:text-brand-700">
                legal@matex.ca
              </a>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(document.updated_at).toLocaleDateString('en-CA')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
