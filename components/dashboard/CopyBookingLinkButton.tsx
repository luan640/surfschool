'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyBookingLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[var(--primary)] hover:opacity-70 transition-opacity"
      title={copied ? 'Link copiado' : 'Copiar link'}
      aria-label={copied ? 'Link copiado' : 'Copiar link'}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}
