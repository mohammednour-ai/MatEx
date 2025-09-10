import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  color?: 'default' | 'white' | 'dark';
}

export const MatExLogo: React.FC<LogoProps> = ({
  className = "",
  size = 'md',
  variant = 'full',
  color = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-24 h-6',
    md: 'w-32 h-8',
    lg: 'w-48 h-12',
    xl: 'w-64 h-16'
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  const textColors = {
    default: '#2D3748', // Dark navy from logo
    white: '#FFFFFF',
    dark: '#1A202C'
  };

  const greenColor = '#4A9B5E'; // Green from logo

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg
          width={iconSizes[size]}
          height={iconSizes[size]}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Circular arrows */}
          <path
            d="M20 50C20 33.4 33.4 20 50 20C58.3 20 65.8 23.7 71.2 29.5L65 35.7C61.4 32.1 56.1 30 50 30C39 30 30 39 30 50C30 61 39 70 50 70C61 70 70 61 70 50H80C80 66.6 66.6 80 50 80C33.4 80 20 66.6 20 50Z"
            fill={greenColor}
          />
          <path
            d="M80 50C80 66.6 66.6 80 50 80C41.7 80 34.2 76.3 28.8 70.5L35 64.3C38.6 67.9 43.9 70 50 70C61 70 70 61 70 50C70 39 61 30 50 30C39 30 30 39 30 50H20C20 33.4 33.4 20 50 20C66.6 20 80 33.4 80 50Z"
            fill={greenColor}
          />

          {/* Gear */}
          <g transform="translate(35, 35)">
            <path
              d="M15 8C16.1 8 17 8.9 17 10V20C17 21.1 16.1 22 15 22C13.9 22 13 21.1 13 20V10C13 8.9 13.9 8 15 8Z"
              fill={textColors[color]}
            />
            <path
              d="M22 15C22 16.1 21.1 17 20 17H10C8.9 17 8 16.1 8 15C8 13.9 8.9 13 10 13H20C21.1 13 22 13.9 22 15Z"
              fill={textColors[color]}
            />
            <circle cx="15" cy="15" r="4" fill="none" stroke={textColors[color]} strokeWidth="2"/>
          </g>

          {/* Bar chart */}
          <g transform="translate(42, 45)">
            <rect x="0" y="8" width="3" height="7" fill={greenColor}/>
            <rect x="5" y="5" width="3" height="10" fill={greenColor}/>
            <rect x="10" y="2" width="3" height="13" fill={greenColor}/>
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <span
          className="font-bold text-2xl tracking-tight"
          style={{ color: textColors[color] }}
        >
          MatEx
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: color === 'white' ? '#E2E8F0' : '#718096' }}
        >
          Waste & Surplus Exchange
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-3 ${sizeClasses[size]} ${className}`}>
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circular arrows */}
        <path
          d="M20 50C20 33.4 33.4 20 50 20C58.3 20 65.8 23.7 71.2 29.5L65 35.7C61.4 32.1 56.1 30 50 30C39 30 30 39 30 50C30 61 39 70 50 70C61 70 70 61 70 50H80C80 66.6 66.6 80 50 80C33.4 80 20 66.6 20 50Z"
          fill={greenColor}
        />
        <path
          d="M80 50C80 66.6 66.6 80 50 80C41.7 80 34.2 76.3 28.8 70.5L35 64.3C38.6 67.9 43.9 70 50 70C61 70 70 61 70 50C70 39 61 30 50 30C39 30 30 39 30 50H20C20 33.4 33.4 20 50 20C66.6 20 80 33.4 80 50Z"
          fill={greenColor}
        />

        {/* Gear */}
        <g transform="translate(35, 35)">
          <path
            d="M15 8C16.1 8 17 8.9 17 10V20C17 21.1 16.1 22 15 22C13.9 22 13 21.1 13 20V10C13 8.9 13.9 8 15 8Z"
            fill={textColors[color]}
          />
          <path
            d="M22 15C22 16.1 21.1 17 20 17H10C8.9 17 8 16.1 8 15C8 13.9 8.9 13 10 13H20C21.1 13 22 13.9 22 15Z"
            fill={textColors[color]}
          />
          <circle cx="15" cy="15" r="4" fill="none" stroke={textColors[color]} strokeWidth="2"/>
        </g>

        {/* Bar chart */}
        <g transform="translate(42, 45)">
          <rect x="0" y="8" width="3" height="7" fill={greenColor}/>
          <rect x="5" y="5" width="3" height="10" fill={greenColor}/>
          <rect x="10" y="2" width="3" height="13" fill={greenColor}/>
        </g>
      </svg>

      <div className="flex flex-col">
        <span
          className="font-bold text-xl tracking-tight leading-none"
          style={{ color: textColors[color] }}
        >
          MatEx
        </span>
        <span
          className="text-xs font-medium leading-none mt-1"
          style={{ color: color === 'white' ? '#E2E8F0' : '#718096' }}
        >
          Waste & Surplus Exchange
        </span>
      </div>
    </div>
  );
};

export default MatExLogo;
