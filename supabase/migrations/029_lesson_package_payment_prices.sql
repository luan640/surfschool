-- Add optional per-payment-method prices to lesson_packages
ALTER TABLE lesson_packages
  ADD COLUMN IF NOT EXISTS pix_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS card_price numeric(10,2);
