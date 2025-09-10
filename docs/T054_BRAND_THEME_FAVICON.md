# T054: Brand Theme & Favicon

## Overview
Implement comprehensive brand identity for MatEx including color palette, typography, favicon, logo integration, and optional dark/light mode support with consistent theming across the entire application.

## Requirements
- Define brand color palette and apply to Tailwind theme
- Integrate Inter font family
- Create and implement favicon and logo assets
- Consistent navbar logo placement
- Optional dark/light mode toggle
- Responsive design considerations
- Accessibility compliance (WCAG 2.1 AA)

## Brand Identity

### Color Palette
```typescript
// Brand colors for MatEx - Professional waste/scrap materials marketplace
const brandColors = {
  // Primary - Industrial Blue (trust, reliability)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main brand color
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  
  // Secondary - Steel Gray (industrial, materials)
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  
  // Accent - Green (sustainability, recycling)
  accent: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },
  
  // Warning - Amber (caution, important notices)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  
  // Error - Red (errors, destructive actions)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  }
};
```

## Tailwind Configuration

### Update tailwind.config.js
```javascript
// tailwind.config.js
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#3b82f6'
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          DEFAULT: '#64748b'
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          DEFAULT: '#22c55e'
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          DEFAULT: '#f59e0b'
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          DEFAULT: '#ef4444'
        },
        
        // Semantic colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#22c55e'
        },
        
        // Background and surface colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      boxShadow: {
        'brand': '0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)',
        'brand-lg': '0 10px 15px -3px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};

export default config;
```

## CSS Variables for Theme

### Global CSS Variables
```css
/* src/app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@100;200;300;400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode colors */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 142.1 76.2% 36.3%;
    --accent-foreground: 355.7 100% 97.3%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    /* Dark mode colors */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 142.1 70.6% 45.3%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 94.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground font-sans;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    @apply bg-secondary-100 dark:bg-secondary-800;
  }
  
  ::-webkit-scrollbar-thumb {
    @apply bg-secondary-300 dark:bg-secondary-600 rounded-full;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-secondary-400 dark:bg-secondary-500;
  }
}

@layer components {
  /* Brand-specific component styles */
  .btn-primary {
    @apply bg-primary-500 hover:bg-primary-600 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  }
  
  .btn-secondary {
    @apply bg-secondary-100 hover:bg-secondary-200 text-secondary-900 font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2;
  }
  
  .btn-accent {
    @apply bg-accent-500 hover:bg-accent-600 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2;
  }
  
  .card-brand {
    @apply bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-sm hover:shadow-brand transition-shadow duration-200;
  }
  
  .input-brand {
    @apply border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 rounded-lg focus:border-primary-500 focus:ring-primary-500;
  }
  
  .text-brand-primary {
    @apply text-primary-600 dark:text-primary-400;
  }
  
  .text-brand-secondary {
    @apply text-secondary-600 dark:text-secondary-400;
  }
  
  .bg-brand-gradient {
    @apply bg-gradient-to-r from-primary-500 to-accent-500;
  }
  
  .border-brand {
    @apply border-primary-200 dark:border-primary-800;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .animation-delay-200 {
    animation-delay: 200ms;
  }
  
  .animation-delay-400 {
    animation-delay: 400ms;
  }
}
```

## Logo Component

### Logo Component with Multiple Variants
```typescript
// src/components/Logo.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  href?: string;
  priority?: boolean;
}

const sizeClasses = {
  sm: {
    full: 'h-8',
    icon: 'h-6 w-6',
    text: 'text-lg'
  },
  md: {
    full: 'h-10',
    icon: 'h-8 w-8',
    text: 'text-xl'
  },
  lg: {
    full: 'h-12',
    icon: 'h-10 w-10',
    text: 'text-2xl'
  },
  xl: {
    full: 'h-16',
    icon: 'h-12 w-12',
    text: 'text-3xl'
  }
};

export default function Logo({ 
  variant = 'full', 
  size = 'md', 
  className, 
  href = '/',
  priority = false 
}: LogoProps) {
  const LogoContent = () => {
    switch (variant) {
      case 'icon':
        return (
          <Image
            src="/matex_logo.png"
            alt="MatEx"
            width={48}
            height={48}
            className={cn(sizeClasses[size].icon, 'object-contain')}
            priority={priority}
          />
        );
      
      case 'text':
        return (
          <span className={cn(
            'font-bold text-brand-primary',
            sizeClasses[size].text,
            className
          )}>
            MatEx
          </span>
        );
      
      case 'full':
      default:
        return (
          <div className={cn('flex items-center gap-2', className)}>
            <Image
              src="/matex_logo.png"
              alt="MatEx"
              width={40}
              height={40}
              className={cn(sizeClasses[size].icon, 'object-contain')}
              priority={priority}
            />
            <span className={cn(
              'font-bold text-brand-primary',
              sizeClasses[size].text
            )}>
              MatEx
            </span>
          </div>
        );
    }
  };

  if (href) {
    return (
      <Link 
        href={href} 
        className={cn(
          'inline-flex items-center transition-opacity hover:opacity-80',
          className
        )}
      >
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}
```

## Theme Provider

### Theme Context and Provider
```typescript
// src/components/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'matex-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage?.getItem(storageKey) as Theme) || defaultTheme
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage?.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
```

### Theme Toggle Component
```typescript
// src/components/ThemeToggle.tsx
'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## Favicon Implementation

### Favicon Generation Script
```javascript
// scripts/generate-favicons.js
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const sizes = [16, 32, 48, 64, 128, 256, 512];
const inputFile = path.join(__dirname, '../public/matex_logo.png');
const outputDir = path.join(__dirname, '../public');

async function generateFavicons() {
  console.log('Generating favicons...');

  try {
    // Generate different sizes
    for (const size of sizes) {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `favicon-${size}x${size}.png`));
      
      console.log(`✓ Generated favicon-${size}x${size}.png`);
    }

    // Generate ICO file (16x16 and 32x32)
    await sharp(inputFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon.ico'));

    console.log('✓ Generated favicon.ico');

    // Generate Apple Touch Icon
    await sharp(inputFile)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 59, g: 130, b: 246, alpha: 1 } // Primary brand color
      })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));

    console.log('✓ Generated apple-touch-icon.png');

    // Generate Android Chrome icons
    await sharp(inputFile)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'android-chrome-192x192.png'));

    await sharp(inputFile)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'android-chrome-512x512.png'));

    console.log('✓ Generated Android Chrome icons');

    // Generate web app manifest
    const manifest = {
      name: 'MatEx - Materials Exchange',
      short_name: 'MatEx',
      description: 'Professional marketplace for waste and scrap materials in Canada',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    };

    await fs.writeFile(
      path.join(outputDir, 'site.webmanifest'),
      JSON.stringify(manifest, null, 2)
    );

    console.log('✓ Generated site.webmanifest');
    console.log('Favicon generation complete!');

  } catch (error) {
    console.error('Error generating favicons:', error);
  }
}

generateFavicons();
```

### Update Layout with Favicon Links
```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: {
    default: 'MatEx - Materials Exchange',
    template: '%s | MatEx'
  },
  description: 'Professional marketplace for waste and scrap materials in Canada. Buy and sell industrial materials through auctions and fixed-price listings.',
  keywords: ['materials', 'scrap', 'waste', 'marketplace', 'Canada', 'industrial', 'recycling'],
  authors: [{ name: 'MatEx Team' }],
  creator: 'MatEx',
  publisher: 'MatEx',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://matex.ca'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: '/',
    title: 'MatEx - Materials Exchange',
    description: 'Professional marketplace for waste and scrap materials in Canada',
    siteName: 'MatEx',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MatEx - Materials Exchange',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MatEx - Materials Exchange',
    description: 'Professional marketplace for waste and scrap materials in Canada',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },
  manifest: '/site.webmanifest',
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Navigation with Logo

### Updated Navigation Component
```typescript
// src/components/Navigation.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Logo from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Browse', href: '/browse' },
  { name: 'Sell', href: '/listings/create' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'About', href: '/about' },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo size="md" priority />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary-600 dark:hover:text-primary-400',
                  pathname === item.href
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-secondary-700 dark:text-secondary-300'
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-center lg:px-6">
            <div className="w-full max-w-lg">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-4 w-4 text-secondary-400" />
                </div>
                <Input
                  type="search"
                  placeholder="Search materials..."
                  className="input-brand pl-10 pr-4"
                />
              </div>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary-500 text-xs text-white flex items-center justify-center">
                3
              </span>
            </Button>

            {/* User Menu */}
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {/* Mobile Search */}
              <div className="px-3 pb-3">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-4 w-4 text-secondary-400" />
                  </div>
                  <Input
                    type="search"
                    placeholder="Search materials..."
                    className="input-brand pl-10 pr-4"
                  />
                </div>
              </div>

              {/* Mobile Navigation Links */}
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 text-base font-medium transition-colors',
                    pathname === item.href
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-secondary-700 dark:text-secondary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
```

## Brand Guidelines

### Typography Scale
```typescript
// Typography system for consistent text sizing
export const typography = {
  // Display text (hero sections, major headings)
  display: {
    '2xl': 'text-5xl md:text-6xl font-bold tracking-tight',
    'xl': 'text-4xl md:text-5xl font-bold tracking-tight',
    'lg': 'text-3xl md:text-4xl font-bold tracking-tight',
  },
  
  // Headings
  heading: {
    'xl': 'text-2xl md:text-3xl font-bold',
    'lg': 'text-xl md:text-2xl font-bold',
    'md': 'text-lg md:text-xl font-semibold',
    'sm': 'text-base md:text-lg font-semibold',
  },
  
  // Body text
  body: {
    'lg': 'text-lg leading-relaxed',
    'md': 'text-base leading-relaxed',
    'sm': 'text-sm leading-relaxed',
  },
  
  // Labels and captions
  label: {
    'lg': 'text-sm font-medium',
    'md': 'text-xs font-medium',
    'sm': 'text-xs font-medium uppercase tracking-wide',
  },
};
```

### Color Usage Guidelines
```typescript
// Color usage guidelines for consistent application
export const colorUsage = {
  // Primary - Use for main CTAs, links, and brand elements
  primary: {
    main: 'primary-500', // Main brand color
    hover: 'primary-600', // Hover states
    light: 'primary-100', // Backgrounds, subtle highlights
    dark: 'primary-700', // Text on light backgrounds
  },
  
  // Secondary - Use for text, borders, and neutral elements
  secondary: {
    text: 'secondary-700', // Main text color
    textLight: 'secondary-600', // Secondary text
    textMuted: 'secondary-500', // Muted text
    border: 'secondary-200', // Borders and dividers
    background: 'secondary-50', // Light backgrounds
  },
  
  // Accent - Use sparingly for highlights and success states
  accent: {
    main: 'accent-500', // Success, positive actions
    light: 'accent-100', // Success backgrounds
    dark: 'accent-700', // Success text
  },
  
  // Status colors
  status: {
    warning: 'warning-500',
    warningLight: 'warning-100',
    error: 'error-500',
    errorLight: 'error-100',
    success: 'accent-500',
    successLight: 'accent-100',
  },
};
```

## Component Examples

### Branded Button Components
```typescript
// src/components/ui/BrandedButton.tsx
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BrandedButtonProps extends ButtonProps {
  brand?: 'primary' | 'secondary' | 'accent';
}

export function BrandedButton({ 
  brand = 'primary', 
  className, 
  ...props 
}: BrandedButtonProps) {
  const brandClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
  };

  return (
    <Button 
      className={cn(brandClasses[brand], className)} 
      {...props} 
    />
  );
}
```

### Branded Card Component
```typescript
// src/components/ui/BrandedCard.tsx
import { Card, CardProps } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BrandedCardProps extends CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
}

export function BrandedCard({ 
  variant = 'default', 
  className, 
  ...props 
}: BrandedCardProps) {
  const variantClasses = {
    default: 'card-brand',
    elevated: 'card-brand shadow-brand-lg',
    bordered: 'card-brand border-2 border-brand',
  };

  return (
    <Card 
      className={cn(variantClasses[variant], className)} 
      {...props} 
    />
  );
}
```

## Accessibility Features

### Focus Management
```css
/* Enhanced focus styles for accessibility */
@layer components {
  .focus-brand {
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900;
  }
  
  .focus-brand-inset {
    @apply focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500;
  }
}
```

### High Contrast Mode Support
```css
/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary: 0 0% 0%;
    --secondary: 0 0% 20%;
    --background: 0 0% 100%;
    --foreground: 0 0% 0%;
    --border: 0 0% 0%;
  }
  
  .dark {
    --primary: 0 0% 100%;
    --secondary: 0 0% 80%;
    --background: 0 0% 0%;
    --foreground: 0 0% 100%;
    --border: 0 0% 100%;
  }
}
```

### Reduced Motion Support
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Package.json Scripts

### Add Theme-Related Scripts
```json
{
  "scripts": {
    "generate-favicons": "node scripts/generate-favicons.js",
    "build-theme": "tailwindcss -i ./src/app/globals.css -o ./dist/output.css --watch",
    "theme-check": "tailwindcss -i ./src/app/globals.css -o ./dist/output.css --minify"
  },
  "devDependencies": {
    "sharp": "^0.32.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0",
    "@tailwindcss/aspect-ratio": "^0.4.0"
  }
}
```

## Browser Configuration Files

### browserconfig.xml
```xml
<!-- public/browserconfig.xml -->
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
    <msapplication>
        <tile>
            <square150x150logo src="/mstile-150x150.png"/>
            <TileColor>#3b82f6</TileColor>
        </tile>
    </msapplication>
</browserconfig>
```

### robots.txt
```txt
# public/robots.txt
User-agent: *
Allow: /

Sitemap: https://matex.ca/sitemap.xml
```

## Testing

### Visual Regression Tests
```typescript
// tests/visual/theme.test.ts
import { test, expect } from '@playwright/test';

test.describe('Brand Theme', () => {
  test('should display logo correctly', async ({ page }) => {
    await page.goto('/');
    
    const logo = page.locator('[data-testid="logo"]');
    await expect(logo).toBeVisible();
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('homepage-logo.png');
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Click theme toggle
    await page.click('[data-testid="theme-toggle"]');
    await page.click('text=Dark');
    
    // Verify dark mode is applied
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('dark-mode.png');
  });

  test('should maintain brand colors', async ({ page }) => {
    await page.goto('/');
    
    // Check primary button color
    const primaryButton = page.locator('.btn-primary').first();
    const buttonColor = await primaryButton.evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    
    expect(buttonColor).toBe('rgb(59, 130, 246)'); // primary-500
  });
});
```

### Accessibility Tests
```typescript
// tests/accessibility/theme.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Theme Accessibility', () => {
  test('should pass accessibility checks', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    
    // Tab through navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    
    // Verify focus ring is visible
    const focusRing = await focusedElement.evaluate(
      el => getComputedStyle(el).boxShadow
    );
    
    expect(focusRing).toContain('rgb(59, 130, 246)'); // primary-500
  });
});
```

## Performance Considerations

### Font Loading Optimization
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize font loading
  experimental: {
    optimizeFonts: true,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Enable compression
  compress: true,
  
  // Optimize CSS
  swcMinify: true,
};

module.exports = nextConfig;
```

### Critical CSS Extraction
```css
/* Critical CSS for above-the-fold content */
@layer critical {
  .header-critical {
    @apply bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700;
  }
  
  .logo-critical {
    @apply flex items-center gap-2;
  }
  
  .nav-critical {
    @apply text-sm font-medium text-secondary-700 dark:text-secondary-300;
  }
}
```

## Documentation

### Brand Style Guide
```markdown
# MatEx Brand Style Guide

## Logo Usage
- Minimum size: 24px height
- Clear space: 1x logo height on all sides
- Don't stretch, rotate, or modify colors
- Use on light backgrounds primarily

## Color Palette
- Primary Blue (#3b82f6): CTAs, links, brand elements
- Steel Gray (#64748b): Text, neutral elements
- Accent Green (#22c55e): Success states, sustainability
- Warning Amber (#f59e0b): Cautions, important notices
- Error Red (#ef4444): Errors, destructive actions

## Typography
- Primary: Inter (headings, UI)
- Monospace: JetBrains Mono (code, data)
- Line height: 1.5 for body text, 1.2 for headings

## Spacing
- Base unit: 4px (0.25rem)
- Common spacing: 8px, 16px, 24px, 32px, 48px, 64px

## Accessibility
- Minimum contrast ratio: 4.5:1 for normal text
- Minimum contrast ratio: 3:1 for large text
- Focus indicators: 2px solid primary color
- Support for reduced motion preferences
```

This comprehensive brand theme implementation provides a consistent, accessible, and professional visual identity for MatEx while supporting both light and dark modes with proper favicon and logo integration.
