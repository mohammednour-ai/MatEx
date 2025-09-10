import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="bg-gray-50 border-t border-gray-200 mt-auto"
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">MatEx</h3>
            <p className="text-gray-600 text-sm mb-4">
              Canada's premier online marketplace for waste and scrap materials.
              Connecting buyers and sellers across the country with secure,
              transparent transactions.
            </p>
            <p className="text-gray-500 text-xs">
              © <time dateTime={currentYear.toString()}>{currentYear}</time> MatEx. All rights reserved.
            </p>
          </div>

          {/* Legal Links */}
          <nav aria-labelledby="footer-legal-heading">
            <h4 id="footer-legal-heading" className="text-sm font-semibold text-gray-900 mb-4">
              Legal
            </h4>
            <ul className="space-y-2" role="list">
              <li>
                <Link
                  href="/legal/terms"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/refund"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/auctioneer"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                >
                  Auctioneer Terms
                </Link>
              </li>
            </ul>
          </nav>

          {/* Support Links */}
          <nav aria-labelledby="footer-support-heading">
            <h4 id="footer-support-heading" className="text-sm font-semibold text-gray-900 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2" role="list">
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                  aria-label="Go to your dashboard"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/browse"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                  aria-label="Browse available materials"
                >
                  Browse Materials
                </Link>
              </li>
              <li>
                <Link
                  href="/listings/create"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                  aria-label="Create a new listing"
                >
                  Create Listing
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
                  aria-label="View and edit your profile"
                >
                  Profile
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-gray-500 mb-2 sm:mb-0">
              Regulated under the Auctioneers Act and Consumer Protection Act of Canada
            </p>
            <div className="text-xs text-gray-500" role="list" aria-label="Compliance and security features">
              <span role="listitem">PIPEDA Compliant</span>
              <span aria-hidden="true"> • </span>
              <span role="listitem">Secure Transactions</span>
              <span aria-hidden="true"> • </span>
              <span role="listitem">Licensed Marketplace</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
