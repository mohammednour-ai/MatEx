import React from 'react';

export const HeroBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Professional Construction Yard SVG Background */}
      <svg
        className="absolute inset-0 w-full h-full object-cover opacity-10"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sky gradient */}
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEEB" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E0F6FF" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="buildingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A5568" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2D3748" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Sky background */}
        <rect width="1200" height="400" fill="url(#skyGradient)" />

        {/* Construction buildings/warehouses */}
        <rect x="50" y="300" width="200" height="150" fill="url(#buildingGradient)" rx="5" />
        <rect x="280" y="250" width="180" height="200" fill="url(#buildingGradient)" rx="5" />
        <rect x="490" y="280" width="160" height="170" fill="url(#buildingGradient)" rx="5" />
        <rect x="680" y="240" width="220" height="210" fill="url(#buildingGradient)" rx="5" />
        <rect x="930" y="290" width="190" height="160" fill="url(#buildingGradient)" rx="5" />

        {/* Cranes */}
        <g opacity="0.6">
          {/* Crane 1 */}
          <line x1="150" y1="300" x2="150" y2="100" stroke="#E53E3E" strokeWidth="4" />
          <line x1="150" y1="120" x2="300" y2="120" stroke="#E53E3E" strokeWidth="3" />
          <line x1="280" y1="120" x2="320" y2="160" stroke="#E53E3E" strokeWidth="2" />

          {/* Crane 2 */}
          <line x1="780" y1="240" x2="780" y2="80" stroke="#E53E3E" strokeWidth="4" />
          <line x1="780" y1="100" x2="950" y2="100" stroke="#E53E3E" strokeWidth="3" />
          <line x1="930" y1="100" x2="970" y2="140" stroke="#E53E3E" strokeWidth="2" />
        </g>

        {/* Material stacks */}
        <g opacity="0.5">
          <rect x="100" y="420" width="30" height="30" fill="#8B4513" />
          <rect x="140" y="420" width="30" height="30" fill="#8B4513" />
          <rect x="180" y="420" width="30" height="30" fill="#8B4513" />
          <rect x="120" y="390" width="30" height="30" fill="#8B4513" />
          <rect x="160" y="390" width="30" height="30" fill="#8B4513" />
          <rect x="140" y="360" width="30" height="30" fill="#8B4513" />

          <rect x="400" y="430" width="25" height="20" fill="#696969" />
          <rect x="430" y="430" width="25" height="20" fill="#696969" />
          <rect x="460" y="430" width="25" height="20" fill="#696969" />
          <rect x="415" y="410" width="25" height="20" fill="#696969" />
          <rect x="445" y="410" width="25" height="20" fill="#696969" />
        </g>

        {/* Trucks */}
        <g opacity="0.4">
          <rect x="600" y="420" width="80" height="30" fill="#FF6B35" rx="5" />
          <circle cx="620" cy="460" r="12" fill="#2D3748" />
          <circle cx="660" cy="460" r="12" fill="#2D3748" />
          <rect x="680" y="430" width="40" height="20" fill="#FF6B35" rx="3" />
        </g>
      </svg>

      {/* Animated floating elements */}
      <div className="absolute inset-0">
        {/* Floating construction elements */}
        <div className="absolute top-20 left-10 w-8 h-8 bg-orange-200 rounded-full opacity-20 animate-bounce-slow"></div>
        <div className="absolute top-40 right-20 w-6 h-6 bg-blue-200 rounded-full opacity-30 animate-bounce-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-60 left-1/3 w-4 h-4 bg-green-200 rounded-full opacity-25 animate-bounce-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-32 right-1/3 w-5 h-5 bg-yellow-200 rounded-full opacity-20 animate-bounce-slow" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Professional gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-800/10 to-orange-900/20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/40 to-transparent"></div>
    </div>
  );
};

export const ProfessionalPattern: React.FC = () => {
  return (
    <div className="absolute inset-0 opacity-5">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="construction-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a365d" strokeWidth="1"/>
            <circle cx="20" cy="20" r="2" fill="#1a365d" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#construction-grid)" />
      </svg>
    </div>
  );
};
