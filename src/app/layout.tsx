import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Footer from '@/components/Footer';
import CookieBanner from '@/components/CookieBanner';
import SkipToContent from '@/components/SkipToContent';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MatEx - Canada\'s Waste & Scrap Materials Marketplace',
  description: 'Professional online marketplace for waste and scrap materials in Canada. Secure auctions, verified sellers, and transparent transactions.',
  keywords: 'waste materials, scrap metal, construction surplus, material exchange, Canada marketplace, sustainable construction',
  authors: [{ name: 'MatEx Team' }],
  creator: 'MatEx',
  publisher: 'MatEx',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: 'https://matexhub.ca',
    title: 'MatEx - Canada\'s Waste & Scrap Materials Marketplace',
    description: 'Professional online marketplace for waste and scrap materials in Canada. Secure auctions, verified sellers, and transparent transactions.',
    siteName: 'MatEx',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MatEx - Canada\'s Waste & Scrap Materials Marketplace',
    description: 'Professional online marketplace for waste and scrap materials in Canada.',
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <SkipToContent />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
