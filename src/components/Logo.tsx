"use client";

import React, { useState } from 'react';
import Image from 'next/image';

type Props = {
  size?: number;
  className?: string;
  alt?: string;
};

export const Logo: React.FC<Props> = ({ size = 64, className, alt = 'MatEx — materials exchange logo' }) => {
  // prefer pre-generated size where available
  const preferred = `/icons/logo-${size}.png`;
  const fallback = '/matex_logo.png';
  const [src, setSrc] = useState(preferred);

  return (
    <div style={{ width: size, height: size }} className={className}>
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        onError={() => {
          // fall back to bundled logo if preferred size missing
          if (src !== fallback) setSrc(fallback);
        }}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};

export default Logo;
