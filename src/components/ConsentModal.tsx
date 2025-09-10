'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title?: string;
  message?: string;
  actionType?: 'bid' | 'deposit' | 'general';
}

interface TermsVersion {
  id: string;
  version: string;
  title: string;
  effective_date: string;
}

export default function ConsentModal({
  isOpen,
  onClose,
  onAccept,
  title = 'Terms & Conditions Required',
  message = 'You must accept the latest Terms & Conditions to continue.',
  actionType = 'general',
}: ConsentModalProps) {
  const [currentTerms, setCurrentTerms] = useState<TermsVersion | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs for focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Generate unique IDs for accessibility
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const descId = `${modalId}-description`;
  const errorId = `${modalId}-error`;

  // Focus management and escape key handling
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the modal after a brief delay to ensure it's rendered
      const timer = setTimeout(() => {
        if (acceptButtonRef.current) {
          acceptButtonRef.current.focus();
        }
      }, 100);

      // Handle escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isAccepting) {
          onClose();
        }
      };

      // Handle tab key for focus trapping
      const handleTab = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
          );

          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey) {
              if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
              }
            } else {
              if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
              }
            }
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTab);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', handleTab);
        document.body.style.overflow = '';

        // Restore focus to the previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, isAccepting, onClose]);

  // Fetch current terms version
  useEffect(() => {
    if (isOpen) {
      fetchCurrentTerms();
    }
  }, [isOpen]);

  const fetchCurrentTerms = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('terms_versions')
        .select('id, version, title, effective_date')
        .eq('type', 'terms_of_service')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching terms:', error);
        setError('Failed to load terms information');
        return;
      }

      setCurrentTerms(data);
    } catch (err) {
      console.error('Error fetching current terms:', err);
      setError('Failed to load terms information');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!currentTerms) {
      setError('No terms available to accept');
      return;
    }

    try {
      setIsAccepting(true);
      setError(null);

      const response = await fetch('/api/legal/acceptance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          terms_version_id: currentTerms.id,
          acceptance_method: 'modal',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || 'Failed to accept terms'
        );
      }

      // Success - call the onAccept callback
      onAccept();
    } catch (err) {
      console.error('Error accepting terms:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept terms');
    } finally {
      setIsAccepting(false);
    }
  };

  const getActionSpecificMessage = () => {
    switch (actionType) {
      case 'bid':
        return 'You must accept the latest Terms & Conditions before placing bids on auctions.';
      case 'deposit':
        return 'You must accept the latest Terms & Conditions before authorizing deposits for auctions.';
      default:
        return message;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 overflow-y-auto'
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* Backdrop */}
      <div
        className='fixed inset-0 bg-black bg-opacity-50 transition-opacity'
        onClick={!isAccepting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className='flex min-h-full items-center justify-center p-4'>
        <div
          ref={modalRef}
          className='relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all'
          role="document"
        >
          {/* Header */}
          <div className='bg-white px-6 pt-6'>
            <div className='flex items-center'>
              <div className='mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100'>
                <svg
                  className='h-6 w-6 text-amber-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth='1.5'
                  stroke='currentColor'
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
                  />
                </svg>
              </div>
            </div>
            <div className='mt-3 text-center'>
              <h3 id={titleId} className='text-lg font-medium leading-6 text-gray-900'>
                {title}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div id={descId} className='px-6 py-4'>
            {loading ? (
              <div className='text-center' role="status" aria-live="polite">
                <div
                  className='inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]'
                  aria-hidden="true"
                />
                <p className='mt-2 text-sm text-gray-600'>
                  Loading terms information...
                </p>
              </div>
            ) : error ? (
              <div className='text-center'>
                <p id={errorId} className='text-sm text-red-600' role="alert">
                  {error}
                </p>
                <button
                  onClick={fetchCurrentTerms}
                  className='mt-2 text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded'
                  aria-describedby={errorId}
                >
                  Try again
                </button>
              </div>
            ) : currentTerms ? (
              <div className='space-y-4'>
                <p className='text-sm text-gray-600'>
                  {getActionSpecificMessage()}
                </p>

                <div className='rounded-lg bg-gray-50 p-4' role="region" aria-label="Terms information">
                  <h4 className='font-medium text-gray-900'>
                    {currentTerms.title}
                  </h4>
                  <p className='text-sm text-gray-600'>
                    Version {currentTerms.version}
                  </p>
                  <p className='text-sm text-gray-600'>
                    Effective:{' '}
                    <time dateTime={currentTerms.effective_date}>
                      {new Date(currentTerms.effective_date).toLocaleDateString()}
                    </time>
                  </p>
                </div>

                <div className='text-sm text-gray-600'>
                  <p>
                    By clicking "Accept Terms", you agree to be bound by the
                    current Terms & Conditions.
                  </p>
                  <p className='mt-2'>
                    <a
                      href='/legal/terms-of-service'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded underline'
                      aria-label="Read the full Terms & Conditions in a new tab"
                    >
                      Read the full Terms & Conditions →
                    </a>
                  </p>
                </div>

                {error && (
                  <div className='rounded-md bg-red-50 p-3' role="alert" aria-live="polite">
                    <p className='text-sm text-red-600'>{error}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Actions */}
          <div className='bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse'>
            <button
              ref={acceptButtonRef}
              type='button'
              onClick={handleAccept}
              disabled={isAccepting || loading || !currentTerms}
              className='inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto transition-colors'
              aria-describedby={error ? errorId : undefined}
            >
              {isAccepting ? (
                <>
                  <div
                    className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent'
                    aria-hidden="true"
                  />
                  <span>Accepting...</span>
                  <span className="sr-only">Please wait while we process your acceptance</span>
                </>
              ) : (
                'Accept Terms'
              )}
            </button>
            <button
              ref={cancelButtonRef}
              type='button'
              onClick={onClose}
              disabled={isAccepting}
              className='mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto transition-colors'
              aria-label="Cancel and close dialog"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
