-- =============================================================================
-- Migration: coupons + QR/COD payment fields (delivery DB only)
-- Schema: kubera_delivery  |  Project: champion-ant-14
-- =============================================================================

-- 1) Coupon master
CREATE TABLE IF NOT EXISTS kubera_delivery.delivery_coupon (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL,                          -- e.g. KUBERA10
  description           text,
  discount_type         text NOT NULL DEFAULT 'percent',        -- percent | flat
  discount_value        numeric(12,2) NOT NULL,                 -- 10 = 10% or ₹10
  min_order_amount      numeric(12,2) DEFAULT 0,
  max_discount_amount   numeric(12,2),                          -- cap for percent coupons
  is_active             boolean NOT NULL DEFAULT true,
  starts_at             timestamptz,
  ends_at               timestamptz,
  usage_limit           integer,                                -- null = unlimited
  used_count            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_coupon_code
  ON kubera_delivery.delivery_coupon (lower(code));

CREATE INDEX IF NOT EXISTS idx_delivery_coupon_active
  ON kubera_delivery.delivery_coupon (is_active);

COMMENT ON TABLE kubera_delivery.delivery_coupon IS
  'Delivery-only coupon codes (percent or flat discount)';

-- 2) Extend delivery payment: no gateway — UPI QR or COD + coupon breakdown
ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ALTER COLUMN gateway DROP NOT NULL;

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ALTER COLUMN gateway SET DEFAULT 'none';

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS payment_method text;                 -- upi_qr | cod

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES kubera_delivery.delivery_coupon(id) ON DELETE SET NULL;

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS discount_percent numeric(8,2);       -- e.g. 10.00

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) DEFAULT 0;

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS amount_before_discount numeric(12,2);

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) DEFAULT 0;

ALTER TABLE kubera_delivery.kubera_customer_delivery_payment
  ADD COLUMN IF NOT EXISTS amount_to_pay numeric(12,2);         -- final payable (same as amount ideally)

-- status values for delivery (no PG):
--   pending_confirmation | awaiting_payment | paid_upi | cod_pending | confirmed | cancelled

COMMENT ON COLUMN kubera_delivery.kubera_customer_delivery_payment.payment_method IS
  'upi_qr = show cafe UPI QR; cod = cash on delivery';

COMMENT ON COLUMN kubera_delivery.kubera_customer_delivery_payment.amount_to_pay IS
  'Final amount customer must pay after coupon';

CREATE INDEX IF NOT EXISTS idx_delivery_pay_coupon_code
  ON kubera_delivery.kubera_customer_delivery_payment (coupon_code);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_payment_method
  ON kubera_delivery.kubera_customer_delivery_payment (payment_method);

-- 3) Snapshot coupon on order map (customer history / WhatsApp)
ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS coupon_code text;

ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS discount_percent numeric(8,2);

ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) DEFAULT 0;

ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS amount_before_discount numeric(12,2);

ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS amount_to_pay numeric(12,2);

ALTER TABLE kubera_delivery.kubera_customer_order_map
  ADD COLUMN IF NOT EXISTS payment_method text;                 -- upi_qr | cod

-- Sample coupon (optional)
INSERT INTO kubera_delivery.delivery_coupon (
  code, description, discount_type, discount_value, min_order_amount, max_discount_amount, is_active
)
SELECT 'KUBERA10', '10% off delivery orders', 'percent', 10, 100, 100, true
WHERE NOT EXISTS (
  SELECT 1 FROM kubera_delivery.delivery_coupon WHERE lower(code) = lower('KUBERA10')
);
