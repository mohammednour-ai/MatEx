# MatEx - Professional Waste & Surplus Marketplace

🌍 **Vision**: MatEx is a professional online marketplace where businesses and individuals can buy, sell, and auction waste, scrap, and surplus materials in a safe, transparent, and legally compliant way.

## 🚀 Features

- **Fixed Price & Auction Listings** with secure deposits
- **KYC Verification** for buyers and sellers
- **Pre-auction Inspections** with booking system
- **Secure Payments** via Stripe integration
- **Real-time Notifications** and bidding
- **Admin Dashboard** for moderation and settings
- **Analytics & Reporting** for market insights

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage, Realtime)
- **Payments**: Stripe (deposits, invoices, refunds)
- **Validation**: Zod schemas
- **Email**: Nodemailer
- **Deployment**: Vercel + Supabase

## 🏗️ Development

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Environment Setup

Copy `.env.example` to `.env.local` and fill in your environment variables:

```bash
cp .env.example .env.local
```

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 📊 Project Structure

```
matex/
├── src/
│   ├── app/          # Next.js App Router pages
│   ├── components/   # React components
│   └── lib/          # Utility functions
├── public/           # Static assets
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## 🔄 Development Workflow

This project follows a structured task-based development approach:

1. **Phase-based Development**: 15 phases from bootstrap to deployment
2. **Task-driven**: 76 individual tasks with clear deliverables
3. **Documentation First**: Each task documents changes and tests
4. **Git Workflow**: Feature branches with atomic commits

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Please read the project rules in `project_rules.md` before contributing.

## 📞 Support

For support and questions, please refer to the project documentation or create an issue.
