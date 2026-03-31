'use client'

import Script from 'next/script'

interface PaymentSuccessAnimationProps {
  size?: number
}

export function PaymentSuccessAnimation({ size = 220 }: PaymentSuccessAnimationProps) {
  return (
    <>
      <Script
        src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.3/dist/dotlottie-wc.js"
        type="module"
      />
      <dotlottie-wc
        src="/animations/payment-success.json"
        style={{ width: `${size}px`, height: `${size}px` }}
        autoplay
        loop
      />
    </>
  )
}
