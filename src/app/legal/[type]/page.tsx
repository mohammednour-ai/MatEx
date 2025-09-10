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

Welcome to MatEx ("we," "our," or "us"), Canada's premier material exchange platform. These Terms of Service ("Terms") govern your use of our website and services located at matexhub.ca (the "Service") operated by MatEx Inc.

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
- Email: legal@matexhub.ca
- Address: [Company Address]
- Phone: [Company Phone]

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };

    case 'privacy-policy':
      return {
        title: 'Privacy Policy',
        version: '2.0',
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

## 5. Comprehensive Data Retention Policy

### 5.1 Account and Profile Information
- **Active Accounts**: Personal information retained while account remains active
- **Inactive Accounts**: Account data retained for 2 years after last login
- **Closed Accounts**: Essential data retained for 7 years for legal compliance
- **Profile Updates**: Historical profile changes retained for audit purposes

### 5.2 Transaction and Bidding Data
- **Bid History**: All bid records retained for 7 years for audit and dispute resolution
- **Auction Records**: Complete auction data retained for 7 years including:
  - Bid timestamps and amounts
  - Bidder identification (anonymized after 2 years)
  - Auction terms and conditions
  - Soft close extensions and final results
- **Order Records**: Transaction details retained for 7 years including:
  - Purchase agreements and terms
  - Payment records and receipts
  - Delivery and fulfillment status
  - Dispute resolution records

### 5.3 KYC and Verification Documents
- **Identity Documents**: Government-issued ID copies retained for 7 years after account closure
- **Business Registration**: Corporate documents retained for 7 years after account closure
- **Verification Records**: KYC approval/rejection decisions retained permanently for compliance
- **Document Metadata**: File names, upload dates, and verification status retained indefinitely
- **Biometric Data**: If collected, retained only during active verification process

### 5.4 Communication and Support Data
- **Platform Messages**: User-to-user communications retained for 3 years
- **Support Tickets**: Customer service interactions retained for 5 years
- **Email Communications**: Transactional emails retained for 2 years
- **Legal Notices**: Terms acceptance and legal communications retained permanently

### 5.5 Financial and Payment Data
- **Payment Information**: Credit card details not stored (handled by Stripe)
- **Transaction Records**: Payment history retained for 7 years for tax compliance
- **Deposit Records**: Auction deposit history retained for 7 years
- **Refund Records**: Refund transactions and reasons retained for 7 years
- **Fee Calculations**: Platform fee records retained for 7 years

### 5.6 Technical and Usage Data
- **Log Files**: Server logs retained for 1 year for security and performance
- **Analytics Data**: Aggregated usage statistics retained for 3 years
- **Security Logs**: Authentication and security events retained for 2 years
- **Cookie Data**: Session cookies deleted after logout, persistent cookies expire per settings

## 6. Data Subject Rights and Requests

### 6.1 Access Rights
You have the right to:
- Request a copy of all personal information we hold about you
- Receive information about how your data is processed
- Obtain details about data sharing and retention periods
- Access your complete transaction and bidding history

### 6.2 Correction Rights
You may request correction of:
- Inaccurate personal information
- Incomplete profile details
- Outdated contact information
- Incorrect business registration details

### 6.3 Deletion Rights
You may request deletion of:
- Personal information no longer needed for original purpose
- Data processed based on consent (where consent is withdrawn)
- Information processed unlawfully
- Data subject to legal retention requirements cannot be deleted

### 6.4 Data Portability
You have the right to:
- Receive your personal data in a structured, machine-readable format
- Transfer your data to another service provider
- Request direct transfer where technically feasible

## 7. Data Request Process

### 7.1 How to Submit Requests
To exercise your privacy rights, contact our Data Protection Officer:
- **Email**: privacy@matexhub.ca
- **Subject Line**: "Data Subject Request - [Type of Request]"
- **Required Information**:
  - Full name and account email
  - Specific request type (access, correction, deletion, portability)
  - Detailed description of requested information or changes
  - Government-issued ID for identity verification

### 7.2 Request Processing
- **Acknowledgment**: Within 3 business days of receipt
- **Identity Verification**: Required for all requests to protect your privacy
- **Processing Time**: Up to 30 days for complex requests
- **Response Format**: Secure email or encrypted file transfer
- **No Fee**: Most requests processed at no charge

### 7.3 Request Limitations
We may decline requests that:
- Cannot be verified due to insufficient identification
- Are manifestly unfounded or excessive
- Would adversely affect others' rights and freedoms
- Conflict with legal retention requirements
- Compromise security or fraud prevention measures

## 8. Data Retention Justification

### 8.1 Legal Requirements
- **Tax Records**: 7-year retention required by Canada Revenue Agency
- **Financial Transactions**: 7-year retention for audit and compliance
- **KYC Documents**: Required for anti-money laundering compliance
- **Dispute Resolution**: Extended retention for legal proceedings

### 8.2 Business Purposes
- **Fraud Prevention**: Historical data needed for pattern recognition
- **Customer Service**: Transaction history required for support
- **Platform Improvement**: Usage data for service enhancement
- **Regulatory Compliance**: Various retention periods for different regulations

### 8.3 Automated Deletion
- **Scheduled Purging**: Automated deletion when retention periods expire
- **Data Minimization**: Regular review and removal of unnecessary data
- **Secure Disposal**: Cryptographic deletion and secure data destruction
- **Audit Trail**: Deletion activities logged for compliance verification

## 9. International Data Transfers and Storage

### 9.1 Data Location
- **Primary Storage**: Canadian data centers with Canadian providers
- **Backup Storage**: Encrypted backups may be stored internationally
- **Service Providers**: Some processors located outside Canada
- **Cloud Services**: AWS Canada Central region for primary hosting

### 9.2 Transfer Safeguards
- **Adequacy Decisions**: Transfers only to countries with adequate protection
- **Standard Contractual Clauses**: For transfers to non-adequate countries
- **Binding Corporate Rules**: For multinational service providers
- **Consent**: Explicit consent for transfers where required

## 10. Data Breach Notification

### 10.1 Breach Response
- **Detection**: 24/7 monitoring and incident response procedures
- **Assessment**: Risk evaluation within 24 hours of detection
- **Containment**: Immediate steps to limit breach impact
- **Investigation**: Forensic analysis to determine cause and scope

### 10.2 Notification Timeline
- **Privacy Commissioner**: Within 72 hours of breach discovery
- **Affected Individuals**: Without undue delay if high risk to rights
- **Law Enforcement**: If criminal activity suspected
- **Service Providers**: Immediate notification of relevant parties

## 11. Privacy by Design

### 11.1 Technical Measures
- **Encryption**: Data encrypted in transit and at rest
- **Access Controls**: Role-based access with principle of least privilege
- **Data Minimization**: Collect only necessary information
- **Pseudonymization**: Personal identifiers replaced where possible

### 11.2 Organizational Measures
- **Privacy Training**: Regular staff training on privacy requirements
- **Privacy Impact Assessments**: For new systems and processes
- **Data Protection Officer**: Dedicated privacy professional oversight
- **Regular Audits**: Internal and external privacy compliance reviews

## 12. Data Security

We implement appropriate security measures including:
- Encryption of sensitive data in transit and at rest
- Regular security assessments and updates
- Access controls and authentication
- Employee training on privacy and security
- Incident response procedures

## 13. Cookies and Tracking

We use cookies and similar technologies for:
- Essential platform functionality
- User authentication and security
- Analytics and performance monitoring
- Personalization and preferences

You can control cookie settings through your browser preferences.

## 14. Children's Privacy

Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.

## 15. Changes to This Policy

We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification. Your continued use constitutes acceptance of the updated policy.

## 16. Contact Information for Privacy Matters

### 16.1 Data Protection Officer
- **Email**: privacy@matex.ca
- **Phone**: 1-800-XXX-XXXX
- **Address**:
  MatEx Inc.
  Privacy Office
  [Street Address]
  [City, Province, Postal Code]

### 16.2 Privacy Complaints
If you're not satisfied with our response to your privacy concern, you may contact:

**Office of the Privacy Commissioner of Canada**
- Website: www.priv.gc.ca
- Phone: 1-800-282-1376
- Email: info@priv.gc.ca

**Provincial Privacy Commissioners** (where applicable)
- Contact information varies by province
- Available at www.priv.gc.ca/en/about-the-opc/what-we-do/provincial-territorial-collaboration/

---

*Last updated: ${new Date().toLocaleDateString('en-CA')}*`
      };

    case 'cookie-policy':
      return {
        title: 'Cookie Policy',
        version: '1.0',
        content: `# Cookie Policy

**Effective Date:** ${new Date().toLocaleDateString('en-CA')}

## 1. Introduction

This Cookie Policy explains how MatEx Inc. ("we," "our," or "us") uses cookies and similar tracking technologies on our website matexhub.ca (the "Service"). This policy should be read alongside our Privacy Policy.

## 2. What Are Cookies

Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our Service.

## 3. Types of Cookies We Use

### 3.1 Necessary Cookies
These cookies are essential for the website to function properly and cannot be disabled:
- **Authentication cookies**: Keep you logged in during your session
- **Security cookies**: Protect against cross-site request forgery and other security threats
- **Load balancing cookies**: Ensure optimal performance by distributing traffic
- **Session cookies**: Maintain your session state across page visits

### 3.2 Analytics Cookies (Optional)
These cookies help us understand how visitors interact with our website:
- **Usage analytics**: Track page views, user flows, and feature usage
- **Performance monitoring**: Monitor site speed and identify technical issues
- **Error tracking**: Capture and analyze errors to improve user experience
- **A/B testing**: Compare different versions of features to optimize user experience

We use these analytics cookies only with your consent and the data is anonymized.

### 3.3 Marketing Cookies (Optional)
These cookies are used for advertising and marketing purposes:
- **Advertising cookies**: Track your interests to show relevant advertisements
- **Social media cookies**: Enable sharing content on social media platforms
- **Conversion tracking**: Measure the effectiveness of our marketing campaigns
- **Retargeting cookies**: Show you relevant ads on other websites

Marketing cookies are only used with your explicit consent.

## 4. Third-Party Cookies

We may use third-party services that set their own cookies:

### 4.1 Payment Processing
- **Stripe**: Secure payment processing and fraud prevention
- **PayPal**: Alternative payment method processing

### 4.2 Analytics Services
- **Google Analytics**: Website usage analytics (only with consent)
- **Hotjar**: User behavior analytics and heatmaps (only with consent)

### 4.3 Communication Services
- **Intercom**: Customer support chat functionality
- **SendGrid**: Email delivery and tracking

## 5. Cookie Consent and Management

### 5.1 Your Choices
When you first visit our website, you will see a cookie banner that allows you to:
- Accept all cookies
- Accept only necessary cookies
- Customize your cookie preferences
- Learn more about our cookie practices

### 5.2 Changing Your Preferences
You can change your cookie preferences at any time by:
- Clicking the cookie preferences link in our website footer
- Accessing your account settings
- Using your browser's cookie management tools
- Contacting us directly at privacy@matexhub.ca

### 5.3 Browser Controls
Most web browsers allow you to control cookies through their settings:
- **Chrome**: Settings > Privacy and security > Cookies and other site data
- **Firefox**: Settings > Privacy & Security > Cookies and Site Data
- **Safari**: Preferences > Privacy > Manage Website Data
- **Edge**: Settings > Cookies and site permissions > Cookies and site data

## 6. Cookie Retention Periods

### 6.1 Session Cookies
- Deleted when you close your browser
- Used for essential functionality during your visit

### 6.2 Persistent Cookies
- **Authentication cookies**: 30 days or until logout
- **Preference cookies**: 1 year or until changed
- **Analytics cookies**: 2 years or until consent withdrawn
- **Marketing cookies**: 1 year or until consent withdrawn

## 7. Data Protection and Privacy

### 7.1 Personal Data in Cookies
Most cookies we use do not contain personal information. When they do:
- Data is encrypted and secure
- Access is limited to authorized personnel
- Retention periods are strictly enforced
- You can request deletion at any time

### 7.2 Cross-Border Transfers
Some third-party services may transfer cookie data outside Canada:
- Transfers are made only to countries with adequate protection
- Standard contractual clauses are used where necessary
- You can opt out of such transfers by declining optional cookies

## 8. Updates to This Policy

We may update this Cookie Policy from time to time to reflect:
- Changes in our cookie practices
- New technologies or services
- Legal or regulatory requirements
- User feedback and preferences

We will notify you of significant changes via:
- Email notification to registered users
- Prominent notice on our website
- Updated cookie consent banner

## 9. Legal Basis for Cookie Use

### 9.1 Necessary Cookies
- **Legal basis**: Legitimate interest in providing essential website functionality
- **Cannot be disabled**: Required for basic website operation

### 9.2 Optional Cookies
- **Legal basis**: Your explicit consent
- **Can be disabled**: You can withdraw consent at any time
- **Granular control**: Choose specific types of cookies to allow

## 10. Contact Information

If you have questions about our use of cookies or this Cookie Policy:

**Privacy Officer**
- Email: privacy@matexhub.ca
- Phone: 1-800-XXX-XXXX
- Address: MatEx Inc., [Company Address]

**Data Protection Concerns**
If you're not satisfied with our response, you may contact:
- Office of the Privacy Commissioner of Canada: www.priv.gc.ca
- Provincial privacy commissioners (where applicable)

## 11. Technical Information

### 11.1 Cookie Names and Purposes
| Cookie Name | Purpose | Type | Duration |
|-------------|---------|------|----------|
| matex_session | User authentication | Necessary | Session |
| matex_csrf | Security protection | Necessary | Session |
| matex_preferences | User preferences | Necessary | 1 year |
| matex_analytics | Usage analytics | Analytics | 2 years |
| matex_marketing | Marketing tracking | Marketing | 1 year |

### 11.2 Local Storage
We may also use local storage for:
- Saving form data temporarily
- Storing user interface preferences
- Caching frequently accessed data
- Offline functionality support

## 12. Children's Privacy

Our services are not intended for children under 18. We do not knowingly use cookies to collect information from children. If you believe we have inadvertently collected such information, please contact us immediately.

---

*This Cookie Policy was last updated on ${new Date().toLocaleDateString('en-CA')} and is effective immediately.*

For the most current version of this policy, please visit: matexhub.ca/legal/cookie-policy`
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
- Email: refunds@matexhub.ca
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

For questions, please contact us at legal@matexhub.ca.

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
              <a href="mailto:legal@matexhub.ca" className="text-brand-600 hover:text-brand-700">
                legal@matexhub.ca
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
