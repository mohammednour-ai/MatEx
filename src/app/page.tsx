import Link from 'next/link';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-24 sm:pb-20">
          <div className="text-center">
            {/* Hero Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
              Canada's Premier{' '}
              <span className="text-brand-600">Material Exchange</span>
            </h1>
            
            {/* Hero Subhead */}
            <p className="mt-6 text-xl sm:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Buy and sell construction materials through secure auctions. 
              Connect with verified suppliers and contractors across Canada.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sell/new"
                className="btn-primary inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Selling
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>
              
              <Link
                href="/browse"
                className="inline-flex items-center px-8 py-4 text-lg font-semibold text-brand-600 bg-white border-2 border-brand-600 rounded-lg hover:bg-brand-50 transition-colors duration-200"
              >
                Browse Materials
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-success-500 mr-2" />
                Verified Suppliers
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-success-500 mr-2" />
                Secure Payments
              </div>
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 text-success-500 mr-2" />
                Quality Guaranteed
              </div>
            </div>
          </div>
        </div>

        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 left-0 w-96 h-96 bg-accent-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-brand-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in three simple steps and join Canada's growing material exchange community
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative">
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-200 transition-colors duration-200">
                  <span className="text-2xl font-bold text-brand-600">1</span>
                </div>
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-px h-8 bg-brand-200 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                List Your Materials
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Upload photos, set your price or start an auction. Our platform makes it easy to reach qualified buyers across Canada.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative">
                <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-200 transition-colors duration-200">
                  <span className="text-2xl font-bold text-brand-600">2</span>
                </div>
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-px h-8 bg-brand-200 hidden md:block"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Connect & Negotiate
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Schedule inspections, receive bids, and communicate directly with verified buyers through our secure platform.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-200 transition-colors duration-200">
                <span className="text-2xl font-bold text-brand-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Complete the Sale
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
              className="inline-flex items-center px-6 py-3 text-base font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors duration-200"
            >
              Get Started Today
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-brand-600 mb-2">500+</div>
              <div className="text-gray-600">Active Listings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600 mb-2">1,200+</div>
              <div className="text-gray-600">Verified Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600 mb-2">$2.5M+</div>
              <div className="text-gray-600">Materials Traded</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-600 mb-2">98%</div>
              <div className="text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
