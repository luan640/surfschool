'use client'

import Script from 'next/script'

interface SurfLoadingProps {
  title?: string
  subtitle?: string
  compact?: boolean
  fitParent?: boolean
}

export function SurfLoading({
  title = '',
  subtitle = '',
  compact = false,
  fitParent = false,
}: SurfLoadingProps) {
  const containerClass = fitParent
    ? 'h-full min-h-full px-4 py-6 sm:px-6 sm:py-8'
    : compact
      ? 'min-h-[420px] px-6 py-10'
      : 'min-h-[calc(100vh-2rem)] px-6 py-10'

  const cardClass = fitParent
    ? 'max-w-md rounded-[1.5rem] p-6 sm:p-7'
    : compact
      ? 'max-w-lg rounded-[2rem] p-8'
      : 'max-w-xl rounded-[2rem] p-8'

  const animationSize = fitParent ? 180 : compact ? 220 : 300

  return (
    <div className={`flex items-center justify-center bg-slate-50 ${containerClass}`}>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
      />

      <div className={`w-full border border-slate-200 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm ${cardClass}`}>
        <div className="flex justify-center">
          <dotlottie-wc
            src="https://lottie.host/38c815da-5859-4aab-bbbd-5fbb9780930e/1Th8ZDHVtc.lottie"
            style={{ width: `${animationSize}px`, height: `${animationSize}px` }}
            autoplay
            loop
          />
        </div>

        <div className={`text-center ${fitParent ? '-mt-4' : '-mt-2'}`}>
          <p className={`font-condensed font-bold uppercase tracking-wide text-slate-900 ${fitParent ? 'text-2xl' : 'text-3xl'}`}>
            {title}
          </p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-400 [animation-delay:-0.25s]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cyan-500 [animation-delay:-0.125s]" />
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-600" />
        </div>
      </div>
    </div>
  )
}
