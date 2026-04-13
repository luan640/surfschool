-- Add optional per-payment-method prices to instructors
-- When set, these override hourly_price for online payments via Mercado Pago
ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS pix_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS card_price numeric(10,2);
