import React from 'react'

type Props = {
  size?: number
  className?: string
  alt?: string
}

export const Logo: React.FC<Props> = ({ size = 64, className, alt = 'MatEx — materials exchange logo' }) => {
  const style = { width: size, height: size }
  // prefer pre-generated size where available
  const preferred = `/icons/logo-${size}.png`
  const fallback = '/matex_logo.png'
  return (
    <img src={preferred} alt={alt} width={size} height={size} className={className} style={style}
      onError={(e) => { (e.target as HTMLImageElement).src = fallback }} />
  )
}

export default Logo
