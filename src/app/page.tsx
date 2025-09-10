import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { HardHatIcon, ShieldCheckIcon, DiamondIcon, ConstructionPattern, CraneIcon, HandshakeIcon, TruckIcon } from '@/components/CustomIcons';
import { HeroBackground, ProfessionalPattern } from '@/components/HeroBackground';
import { MatExLogo } from '@/components/Logo';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900"
        aria-labelledby="hero-heading"
        role="banner"
      >
        {/* Professional Construction Background */}
        <HeroBackground />
        <ProfessionalPattern />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Official MatEx Logo */}
            <div className="flex justify-center mb-8 animate-fadeInUp">
              <MatExLogo size="xl" color="white" />
            </div>

            {/* Hero Badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-green-100 text-green-800 text-sm font-bold mb-8 animate-fadeInUp shadow-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></span>
              Canada's Premier Waste & Surplus Exchange
            </div>

            {/* Hero Headline */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6 animate-fadeInUp"
            >
              Transform Waste into{' '}
              <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                Opportunity
              </span>
            </h1>

            {/* Hero Subhead */}
            <p className="mt-6 text-xl sm:text-2xl text-slate-200 max-w-4xl mx-auto leading-relaxed animate-fadeInUp">
              Connect construction professionals with surplus materials. Reduce waste, save costs, and build sustainably across Canada's construction industry.
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center animate-fadeInUp">
              <Link
                href="/sell/new"
                className="group inline-flex items-center px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-2xl hover:shadow-green-500/25 transform hover:-translate-y-1 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 no-underline"
                aria-describedby="list-surplus-description"
              >
                <CraneIcon className="mr-3 group-hover:animate-bounce" size={24} aria-hidden="true" />
                List Your Surplus
                <ArrowRightIcon className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <span id="list-surplus-description" className="sr-only">
                Create a new listing to sell your surplus construction materials
              </span>

              <Link
                href="/browse"
                className="group inline-flex items-center px-10 py-5 text-lg font-bold text-slate-800 bg-white/95 backdrop-blur-sm border-2 border-green-200 rounded-xl shadow-xl hover:bg-white hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 no-underline"
                aria-describedby="find-materials-description"
              >
                <HardHatIcon className="mr-3 text-green-600 group-hover:animate-bounce" size={24} aria-hidden="true" />
                Find Materials
              </Link>
              <span id="find-materials-description" className="sr-only">
                Browse available construction materials and surplus items
              </span>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 animate-fadeInUp" role="region" aria-label="Platform statistics">
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <HardHatIcon className="h-8 w-8 text-green-400 mr-4 group-hover:scale-110 transition-transform" size={32} aria-hidden="true" />
                <div className="text-left">
                  <div className="text-white font-bold text-lg" aria-label="2,500 plus active suppliers">2,500+</div>
                  <div className="text-slate-300 text-sm">Active Suppliers</div>
                </div>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <ShieldCheckIcon className="h-8 w-8 text-green-400 mr-4 group-hover:scale-110 transition-transform" size={32} aria-hidden="true" />
                <div className="text-left">
                  <div className="text-white font-bold text-lg" aria-label="50 million dollars plus materials exchanged">$50M+</div>
                  <div className="text-slate-300 text-sm">Materials Exchanged</div>
                </div>
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 group">
                <DiamondIcon className="h-8 w-8 text-green-400 mr-4 group-hover:scale-110 transition-transform" size={32} aria-hidden="true" />
                <div className="text-left">
                  <div className="text-white font-bold text-lg" aria-label="85 percent waste reduction">85%</div>
                  <div className="text-slate-300 text-sm">Waste Reduction</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce" aria-hidden="true">
          <div className="w-6 h-10 border-2 border-green-300/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-green-400/80 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps and join Canada's growing material exchange community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12" role="list">
            {/* Step 1 */}
            <div className="text-center group" role="listitem">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 shadow-lg group-hover:shadow-xl transform group-hover:scale-105">
                  <CraneIcon className="text-green-600" size={32} aria-hidden="true" />
                </div>
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-px h-8 bg-green-200 hidden md:block" aria-hidden="true"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                <span className="sr-only">Step 1: </span>List Your Surplus
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Upload photos of surplus materials, set your price, and connect with buyers. Turn your waste into revenue across Canada.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group" role="listitem">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 shadow-lg group-hover:shadow-xl transform group-hover:scale-105">
                  <HandshakeIcon className="text-green-600" size={32} aria-hidden="true" />
                </div>
                <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-px h-8 bg-brand-200 hidden md:block" aria-hidden="true"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                <span className="sr-only">Step 2: </span>Connect & Negotiate
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Schedule inspections, receive bids, and communicate directly with verified buyers through our secure platform.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group" role="listitem">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 shadow-lg group-hover:shadow-xl transform group-hover:scale-105">
                <TruckIcon className="text-blue-600" size={32} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                <span className="sr-only">Step 3: </span>Complete the Sale
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Secure payment processing, coordinated pickup, and transaction protection ensure a smooth, worry-free experience.
              </p>
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="text-center mt-16">
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-6 py-3 text-base font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 no-underline"
              aria-describedby="signup-description"
            >
              Get Started Today
              <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <span id="signup-description" className="sr-only">
              Sign up for a free MatEx account to start buying or selling materials
            </span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-gray-50 via-white to-gray-50" aria-labelledby="stats-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 id="stats-heading" className="text-2xl font-bold text-gray-900 mb-4">
              Trusted by Construction Professionals Across Canada
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8" role="list">
            <div className="text-center group" role="listitem">
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="text-4xl font-bold text-brand-600 mb-2 group-hover:scale-110 transition-transform duration-300" aria-label="500 plus active listings">500+</div>
                <div className="text-gray-600 font-medium">Active Listings</div>
                <div className="w-12 h-1 bg-brand-200 rounded-full mx-auto mt-3 group-hover:bg-brand-400 transition-colors duration-300" aria-hidden="true"></div>
              </div>
            </div>
            <div className="text-center group" role="listitem">
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="text-4xl font-bold text-green-600 mb-2 group-hover:scale-110 transition-transform duration-300" aria-label="1,200 plus verified users">1,200+</div>
                <div className="text-gray-600 font-medium">Verified Users</div>
                <div className="w-12 h-1 bg-green-200 rounded-full mx-auto mt-3 group-hover:bg-green-400 transition-colors duration-300" aria-hidden="true"></div>
              </div>
            </div>
            <div className="text-center group" role="listitem">
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="text-4xl font-bold text-blue-600 mb-2 group-hover:scale-110 transition-transform duration-300" aria-label="2.5 million dollars plus materials traded">$2.5M+</div>
                <div className="text-gray-600 font-medium">Materials Traded</div>
                <div className="w-12 h-1 bg-blue-200 rounded-full mx-auto mt-3 group-hover:bg-blue-400 transition-colors duration-300" aria-hidden="true"></div>
              </div>
            </div>
            <div className="text-center group" role="listitem">
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
                <div className="text-4xl font-bold text-purple-600 mb-2 group-hover:scale-110 transition-transform duration-300" aria-label="98 percent satisfaction rate">98%</div>
                <div className="text-gray-600 font-medium">Satisfaction Rate</div>
                <div className="w-12 h-1 bg-purple-200 rounded-full mx-auto mt-3 group-hover:bg-purple-400 transition-colors duration-300" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
