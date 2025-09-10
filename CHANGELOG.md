# Changelog

All notable changes to the MatEx platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-09-10

### 🎉 Initial MVP Release

This is the first release of MatEx, a Canadian waste & scrap materials marketplace platform. The platform enables buyers and sellers to trade materials through both fixed-price listings and auction-based sales.

### ✨ Features Added

#### 🔐 Authentication & User Management
- **User Authentication**: Complete Supabase Auth integration with signup/login flows
- **Role-Based Access Control**: Support for Buyer, Seller, Admin, and Both roles
- **KYC Verification System**: Document upload and admin approval workflow
- **Dynamic Onboarding**: Role-specific onboarding forms with configurable fields
- **Terms & Conditions**: Consent gating with version tracking and acceptance records

#### 🏪 Marketplace & Listings
- **Create Listings**: Rich listing creation with image upload, material categorization
- **Browse Listings**: Grid view with pagination and responsive design
- **Advanced Filtering**: Filter by material, price range, listing type, and location
- **Full-Text Search**: PostgreSQL FTS implementation with highlighted results
- **Listing Detail Pages**: Comprehensive view with image gallery, seller info, and pricing

#### 🔨 Auction System
- **Real-Time Bidding**: Live bid updates via Supabase Realtime
- **Soft-Close Extension**: Automatic auction extension when bids placed near end
- **Bid History**: Complete bidding history with timestamps
- **Deposit System**: Required deposits with Stripe PaymentIntent authorization
- **Outbid Notifications**: Automatic notifications when outbid

#### 🔍 Inspection System
- **Inspection Slots**: Sellers can create time slots with capacity limits
- **Booking System**: Buyers can book and cancel inspection appointments
- **Automated Reminders**: Configurable reminder notifications before inspections

#### 💳 Payment Processing
- **Stripe Integration**: Complete payment processing with test/production modes
- **Deposit Management**: Authorize, capture, and refund deposit flows
- **Fixed-Price Checkout**: Stripe Checkout integration for immediate purchases
- **Auction Invoicing**: Automatic invoice generation for auction winners
- **Platform Fees**: Configurable transaction fees and payout delays
- **Webhook Handling**: Secure Stripe webhook processing for payment events

#### 🔔 Notification System
- **In-App Notifications**: Bell dropdown with unread counts and mark-as-read
- **Email Notifications**: Template-based email system with Markdown rendering
- **Notification Preferences**: User-configurable notification channels
- **Automated Triggers**: Notifications for bids, wins, inspections, deposits
- **Template Management**: Admin CMS for notification templates

#### 👨‍💼 Admin Panel
- **Settings Management**: Dynamic app settings with JSON editor and validation
- **KYC Management**: Review and approve/reject KYC documents with notes
- **Listings Moderation**: Bulk operations and status management
- **Payment Dashboard**: View deposits, orders, and manual refund capabilities
- **User Management**: Profile management and role assignments
- **Audit Logging**: Complete audit trail for all admin actions
- **Legal Content CMS**: Manage Terms, Privacy Policy, and other legal documents

#### 📊 Analytics & Reporting
- **Price Trend Charts**: Historical pricing data visualization by material
- **Trading Volume Metrics**: Dashboard KPIs for active auctions and volumes
- **Seller Reputation**: Scoring system based on fulfillment and disputes
- **CSV Export**: Export analytics and reports for admin use

#### 🛡️ Security & Compliance
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Zod schema validation for all forms and APIs
- **Row Level Security**: Comprehensive RLS policies for data protection
- **Legal Compliance**: Canadian compliance for Terms, Privacy, and Cookie policies
- **Accessibility**: WCAG compliance improvements with ARIA labels and keyboard navigation

#### 🎨 User Experience
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Loading States**: Skeleton loaders and spinners for better UX
- **Error Handling**: Comprehensive error pages and empty states
- **Brand Identity**: Custom logo, favicon, and consistent theming
- **Landing Page**: Hero section with clear value proposition and CTAs

#### 🚀 Deployment & Infrastructure
- **Vercel Configuration**: Production-ready deployment setup
- **Environment Management**: Secure environment variable handling
- **Database Migrations**: Version-controlled Supabase migrations
- **Custom Domain**: SSL certificate and domain configuration (matexhub.ca)
- **Production Monitoring**: Error tracking and performance monitoring setup

### 🏗️ Technical Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe (PaymentIntents, Checkout, Webhooks)
- **Deployment**: Vercel with custom domain and SSL
- **Development**: ESLint, Prettier, EditorConfig, VS Code workspace

### 📋 Known Limitations

#### 🚧 Planned Improvements
- **Email Provider**: Currently using stub email provider (needs production SMTP)
- **SMS Notifications**: SMS channel not yet implemented
- **Mobile App**: Web-only platform (native apps planned)
- **Advanced Analytics**: Basic reporting (advanced metrics in development)
- **Dispute Resolution**: Basic system (enhanced workflow planned)
- **Multi-Currency**: CAD only (USD/other currencies planned)

#### 🔧 Technical Debt
- **Test Coverage**: Limited automated testing (comprehensive suite planned)
- **Performance**: Basic optimization (advanced caching planned)
- **Monitoring**: Basic error tracking (comprehensive APM planned)
- **Documentation**: API documentation needs expansion

### 🎯 MVP Scope

This v0.1.0 release represents a fully functional MVP that supports:
- Complete user registration and KYC workflow
- Listing creation and browsing with search/filters
- Both fixed-price and auction-based sales
- Secure payment processing with deposits
- Inspection booking system
- Comprehensive admin panel
- Legal compliance for Canadian market

### 🚀 Getting Started

1. **Environment Setup**: Copy `.env.example` to `.env.local` and configure
2. **Database**: Run Supabase migrations and seed default settings
3. **Stripe**: Configure webhook endpoints and test keys
4. **Development**: Run `npm run dev` to start local development server
5. **Production**: Deploy to Vercel with production environment variables

### 📞 Support

- **Technical Issues**: support@matexhub.ca
- **Legal Questions**: legal@matexhub
