'use client';

interface SkipToContentProps {
  targetId?: string;
  className?: string;
}

export default function SkipToContent({
  targetId = 'main-content',
  className = ''
}: SkipToContentProps) {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkip}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
        bg-blue-600 text-white px-4 py-2 rounded-md font-medium z-50
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200 hover:bg-blue-700
        ${className}
      `}
    >
      Skip to main content
    </a>
  );
}

// Additional skip links for complex pages
export function SkipToNavigation({ className = '' }: { className?: string }) {
  return (
    <a
      href="#main-navigation"
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32
        bg-green-600 text-white px-4 py-2 rounded-md font-medium z-50
        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        transition-all duration-200 hover:bg-green-700
        ${className}
      `}
    >
      Skip to navigation
    </a>
  );
}

export function SkipToSearch({ className = '' }: { className?: string }) {
  return (
    <a
      href="#search"
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-64
        bg-purple-600 text-white px-4 py-2 rounded-md font-medium z-50
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        transition-all duration-200 hover:bg-purple-700
        ${className}
      `}
    >
      Skip to search
    </a>
  );
}
