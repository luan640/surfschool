'use client'

import Script from 'next/script'

interface SurfLoadingProps {
  title?: string
  subtitle?: string
  compact?: boolean
}

export function SurfLoading({
  title = '',
  subtitle = '',
  compact = false,
}: SurfLoadingProps) {
  return (
    <div className={`flex items-center justify-center bg-slate-50 px-6 py-10 ${compact ? 'min-h-[420px]' : 'min-h-[calc(100vh-2rem)]'}`}>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
      />

      <div className={`w-full rounded-[2rem] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm ${compact ? 'max-w-lg' : 'max-w-xl'}`}>
        <div className="flex justify-center">
          <dotlottie-wc
            src="https://lottie.host/38c815da-5859-4aab-bbbd-5fbb9780930e/1Th8ZDHVtc.lottie"
            style={{ width: compact ? '220px' : '300px', height: compact ? '220px' : '300px' }}
            autoplay
            loop
          />
        </div>

        <div className="-mt-2 text-center">
          <p className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-900">
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
