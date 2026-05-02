import React from 'react'

/* Logo — Sans-serif wordmark with green dot */

interface LogoMarkProps {
  size?: 'sm' | 'md' | 'lg'
  inverted?: boolean
}

const SIZES = {
  sm: { mark: 20, kSize: 11, dot: 4 },
  md: { mark: 24, kSize: 13, dot: 5 },
  lg: { mark: 32, kSize: 18, dot: 6 },
} as const

export function LogoMark({ size = 'md', inverted }: LogoMarkProps) {
  const { mark, kSize, dot } = SIZES[size]
  return (
    <div className="relative inline-flex flex-shrink-0" style={{ width: mark, height: mark }}>
      <div
        className={`w-full h-full flex items-center justify-center rounded-md ${inverted ? 'bg-white' : 'bg-navy'}`}
        style={{ width: mark, height: mark }}
      >
        <span
          className={`font-semibold leading-none ${inverted ? 'text-navy' : 'text-white'}`}
          style={{ fontSize: kSize }}
        >
          K
        </span>
      </div>
      <div
        className="absolute bg-green rounded-full"
        style={{ width: dot, height: dot, bottom: -dot / 3, right: -dot / 3 }}
      />
    </div>
  )
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  inverted?: boolean
}

export default function Logo({ size = 'md', showText = true, inverted }: LogoProps) {
  if (!showText) return <LogoMark size={size} inverted={inverted} />

  const textSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} inverted={inverted} />
      <span className={`font-semibold ${textSize} ${inverted ? 'text-white' : 'text-foreground'} tracking-tight`}>
        Konforme
      </span>
    </div>
  )
}
