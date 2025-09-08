interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}

// Base spinner component
export function Spinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'text-brand-500',
    secondary: 'text-accent-500',
    white: 'text-white',
    gray: 'text-gray-500'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${colorClasses[color]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Dots spinner
export function DotsSpinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  };

  const colorClasses = {
    primary: 'bg-brand-500',
    secondary: 'bg-accent-500',
    white: 'bg-white',
    gray: 'bg-gray-500'
  };

  return (
    <div className={`flex space-x-1 ${className || ''}`} role="status" aria-label="Loading">
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
        style={{ animationDelay: '0ms' }}
      ></div>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
        style={{ animationDelay: '150ms' }}
      ></div>
      <div
        className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
        style={{ animationDelay: '300ms' }}
      ></div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Pulse spinner
export function PulseSpinner({ size = 'md', color = 'primary', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'bg-brand-500',
    secondary: 'bg-accent-500',
    white: 'bg-white',
    gray: 'bg-gray-500'
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Button spinner for loading buttons
export function ButtonSpinner({ size = 'sm', className }: { size?: 'sm' | 'md'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${sizeClasses[size]} ${className || ''}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// Page loading spinner
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Spinner size="xl" color="primary" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Inline loading spinner
export function InlineSpinner({ text = 'Loading...', size = 'sm' }: { text?: string; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center space-x-2">
      <Spinner size={size} color="gray" />
      <span className="text-gray-600 text-sm">{text}</span>
    </div>
  );
}

// Loading overlay
export function LoadingOverlay({ children, isLoading }: { children: React.ReactNode; isLoading: boolean }) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner size="lg" color="primary" />
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Card loading state
export function CardLoader() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600">Loading content...</p>
      </div>
    </div>
  );
}

// Table loading state
export function TableLoader() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600">Loading data...</p>
      </div>
    </div>
  );
}

// Form loading state
export function FormLoader() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" color="primary" />
        <p className="mt-4 text-gray-600">Loading form...</p>
      </div>
    </div>
  );
}

// Search loading state
export function SearchLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center">
        <Spinner size="md" color="primary" />
        <p className="mt-2 text-gray-600">Searching...</p>
      </div>
    </div>
  );
}

// Upload progress spinner
export function UploadSpinner({ progress }: { progress?: number }) {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <Spinner size="lg" color="primary" />
        {progress !== undefined && (
          <span className="absolute text-xs font-medium text-brand-600">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-gray-600">
        {progress !== undefined ? `Uploading... ${Math.round(progress)}%` : 'Uploading...'}
      </p>
    </div>
  );
}

// Processing spinner
export function ProcessingSpinner({ message = 'Processing...' }: { message?: string }) {
  return (
    <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <Spinner size="md" color="primary" />
      <span className="text-blue-800 font-medium">{message}</span>
    </div>
  );
}

// Saving spinner
export function SavingSpinner() {
  return (
    <div className="flex items-center space-x-2 text-green-600">
      <Spinner size="sm" color="primary" />
      <span className="text-sm font-medium">Saving...</span>
    </div>
  );
}

// Loading button component
export function LoadingButton({
  children,
  isLoading,
  disabled,
  onClick,
  variant = 'primary',
  size = 'md',
  className
}: {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600',
    secondary: 'bg-accent-500 text-white hover:bg-accent-600',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
    >
      {isLoading && (
        <ButtonSpinner size={size === 'lg' ? 'md' : 'sm'} className="mr-2" />
      )}
      {children}
    </button>
  );
}
