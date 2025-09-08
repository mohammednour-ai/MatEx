import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BellIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  InboxIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

function EmptyState({ title, description, icon: Icon, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">{description}</p>

      {action && (
        <div className="space-y-3">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors duration-200"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors duration-200"
            >
              {action.label}
            </button>
          )}

          {secondaryAction && (
            <div>
              {secondaryAction.href ? (
                <Link
                  href={secondaryAction.href}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Empty Listings States
export function EmptyListingsSearch() {
  return (
    <EmptyState
      icon={MagnifyingGlassIcon}
      title="No materials found"
      description="We couldn't find any materials matching your search criteria. Try adjusting your filters or search terms to discover more materials."
      action={{
        label: 'Clear Filters',
        onClick: () => window.location.href = '/browse'
      }}
      secondaryAction={{
        label: 'Browse All Materials',
        href: '/browse'
      }}
    />
  );
}

export function EmptyListingsBrowse() {
  return (
    <EmptyState
      icon={InboxIcon}
      title="No materials available"
      description="There are currently no materials listed on the marketplace. Be the first to list your materials and start trading!"
      action={{
        label: 'List Your Materials',
        href: '/listings/create'
      }}
      secondaryAction={{
        label: 'Learn How It Works',
        href: '/#how-it-works'
      }}
    />
  );
}

export function EmptyMyListings() {
  return (
    <EmptyState
      icon={ClipboardDocumentListIcon}
      title="You haven't listed any materials yet"
      description="Start selling your surplus materials, scrap, or waste by creating your first listing. It only takes a few minutes to get started."
      action={{
        label: 'Create Your First Listing',
        href: '/listings/create'
      }}
      secondaryAction={{
        label: 'See How Others List',
        href: '/browse'
      }}
    />
  );
}

// Empty Bids States
export function EmptyBidHistory() {
  return (
    <EmptyState
      icon={CurrencyDollarIcon}
      title="No bids yet"
      description="This auction hasn't received any bids yet. Be the first to place a bid and secure this material at a great price."
      action={{
        label: 'Place First Bid',
        onClick: () => {
          const biddingForm = document.getElementById('bidding-form');
          biddingForm?.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    />
  );
}

export function EmptyMyBids() {
  return (
    <EmptyState
      icon={CurrencyDollarIcon}
      title="You haven't placed any bids"
      description="Start bidding on auctions to secure materials at competitive prices. Browse active auctions and find materials that match your needs."
      action={{
        label: 'Browse Auctions',
        href: '/browse?pricing_type=auction'
      }}
      secondaryAction={{
        label: 'Learn About Bidding',
        href: '/help/bidding'
      }}
    />
  );
}

// Empty Notifications States
export function EmptyNotifications() {
  return (
    <EmptyState
      icon={BellIcon}
      title="No notifications yet"
      description="You're all caught up! Notifications about your listings, bids, inspections, and account updates will appear here."
      secondaryAction={{
        label: 'Manage Notification Settings',
        href: '/settings'
      }}
    />
  );
}

export function EmptyNotificationsFiltered() {
  return (
    <EmptyState
      icon={BellIcon}
      title="No notifications match your filter"
      description="There are no notifications matching your current filter. Try selecting 'All Notifications' to see your complete notification history."
      action={{
        label: 'Show All Notifications',
        onClick: () => {
          const allTab = document.querySelector('[data-tab="all"]') as HTMLButtonElement;
          allTab?.click();
        }
      }}
    />
  );
}

// Empty Inspections States
export function EmptyInspectionSlots() {
  return (
    <EmptyState
      icon={CalendarIcon}
      title="No inspection slots available"
      description="The seller hasn't set up any inspection slots for this listing yet. Contact them directly to arrange a viewing."
      action={{
        label: 'Contact Seller',
        onClick: () => {
          const contactSection = document.getElementById('seller-contact');
          contactSection?.scrollIntoView({ behavior: 'smooth' });
        }
      }}
    />
  );
}

export function EmptyMyInspections() {
  return (
    <EmptyState
      icon={CalendarIcon}
      title="No upcoming inspections"
      description="You don't have any scheduled inspections. Book inspection slots to view materials before bidding or purchasing."
      action={{
        label: 'Browse Materials',
        href: '/browse'
      }}
      secondaryAction={{
        label: 'Learn About Inspections',
        href: '/help/inspections'
      }}
    />
  );
}

// Empty Orders States
export function EmptyOrders() {
  return (
    <EmptyState
      icon={ClipboardDocumentListIcon}
      title="No orders yet"
      description="Your purchase history will appear here once you start buying materials. Browse our marketplace to find materials you need."
      action={{
        label: 'Start Shopping',
        href: '/browse'
      }}
    />
  );
}

// Empty Search Results
export function EmptySearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={MagnifyingGlassIcon}
      title={`No results for "${query}"`}
      description="We couldn't find any materials matching your search. Try different keywords, check your spelling, or browse our categories."
      action={{
        label: 'Clear Search',
        onClick: () => {
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }}
      secondaryAction={{
        label: 'Browse All Materials',
        href: '/browse'
      }}
    />
  );
}

// Generic Empty State
export function EmptyGeneric({
  title = "Nothing to show",
  description = "There's nothing here right now. Check back later or try a different action.",
  actionLabel,
  actionHref,
  actionOnClick
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
}) {
  return (
    <EmptyState
      icon={ExclamationCircleIcon}
      title={title}
      description={description}
      action={actionLabel ? {
        label: actionLabel,
        href: actionHref,
        onClick: actionOnClick
      } : undefined}
    />
  );
}
