-- =============================================================================
-- Café Kubera — Delivery customer history schema
-- Schema: kubera_delivery
-- Run on the NEW Postgres / Hasura project (not the live orders DB)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS kubera_delivery;

-- -----------------------------------------------------------------------------
-- 1) kubera_delivery.kubera_customer_order_map
--    Maps customer ↔ order in existing orders DB (kubera.order)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kubera_delivery.kubera_customer_order_map (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- customer (from existing profile DB)
  customer_details_id                 integer NOT NULL,
  customer_number                     text NOT NULL,

  -- link to existing orders DB
  order_id                            integer NOT NULL,          -- kubera.order.id
  order_ref_id                        text NOT NULL,             -- kubera.order.order_ref_id
  table_no                            text NOT NULL,             -- delivery unique no e.g. D-260806-AB12
  table_place                         text NOT NULL DEFAULT 'ONLINE_DELIVERY',

  -- status (synced from live order / delivery flow)
  order_status                        text NOT NULL,

  -- amounts
  order_summary_amount                numeric(12,2),
  order_additional_service_amount     numeric(12,2) DEFAULT 0,
  order_total_amount                  numeric(12,2) NOT NULL,
  delivery_fee                        numeric(12,2) DEFAULT 0,
  delivery_distance_km                numeric(8,3),              -- must be <= 5

  -- address snapshot
  delivery_address_id                 integer,                   -- profile address id
  delivery_address_text               text,
  delivery_lat                        numeric(10,7),
  delivery_lng                        numeric(10,7),

  comments                            text,
  items_summary                       jsonb,                     -- [{name, qty, cost}] for UI only

  placed_at                           timestamptz NOT NULL DEFAULT now(),
  updated_at                          timestamptz NOT NULL DEFAULT now(),
  delivered_at                        timestamptz
);

COMMENT ON TABLE kubera_delivery.kubera_customer_order_map IS
  'Customer-facing delivery order map. Canonical order + items stay in existing orders DB; order_id = kubera.order.id';

COMMENT ON COLUMN kubera_delivery.kubera_customer_order_map.order_id IS
  'Existing DB kubera.order.id';

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_map_order_id
  ON kubera_delivery.kubera_customer_order_map (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_order_map_order_ref_id
  ON kubera_delivery.kubera_customer_order_map (order_ref_id);

CREATE INDEX IF NOT EXISTS idx_order_map_customer_number
  ON kubera_delivery.kubera_customer_order_map (customer_number);

CREATE INDEX IF NOT EXISTS idx_order_map_customer_details_id
  ON kubera_delivery.kubera_customer_order_map (customer_details_id);

CREATE INDEX IF NOT EXISTS idx_order_map_table_no
  ON kubera_delivery.kubera_customer_order_map (table_no);

CREATE INDEX IF NOT EXISTS idx_order_map_order_status
  ON kubera_delivery.kubera_customer_order_map (order_status);

-- -----------------------------------------------------------------------------
-- 2) kubera_delivery.kubera_customer_delivery_payment
--    Razorpay / delivery payment history (customer app)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kubera_delivery.kubera_customer_delivery_payment (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_details_id                 integer NOT NULL,
  customer_number                     text NOT NULL,

  order_map_id                        uuid REFERENCES kubera_delivery.kubera_customer_order_map(id)
                                        ON DELETE SET NULL,
  order_id                            integer,                   -- existing kubera.order.id (after place)
  order_ref_id                        text,

  gateway                             text NOT NULL DEFAULT 'razorpay',
  gateway_order_id                    text,
  gateway_payment_id                  text,

  amount                              numeric(12,2) NOT NULL,
  currency                            text NOT NULL DEFAULT 'INR',
  status                              text NOT NULL,             -- created | paid | failed | refunded

  raw_response                        jsonb,
  paid_at                             timestamptz,
  created_at                          timestamptz NOT NULL DEFAULT now(),
  updated_at                          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kubera_delivery.kubera_customer_delivery_payment IS
  'Delivery gateway payments. Staff close entry (payment_mode=delivery) stays in existing kubera_payment_details.';

CREATE INDEX IF NOT EXISTS idx_delivery_pay_customer_number
  ON kubera_delivery.kubera_customer_delivery_payment (customer_number);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_order_id
  ON kubera_delivery.kubera_customer_delivery_payment (order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_order_ref_id
  ON kubera_delivery.kubera_customer_delivery_payment (order_ref_id);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_gateway_order_id
  ON kubera_delivery.kubera_customer_delivery_payment (gateway_order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_order_map_id
  ON kubera_delivery.kubera_customer_delivery_payment (order_map_id);

CREATE INDEX IF NOT EXISTS idx_delivery_pay_status
  ON kubera_delivery.kubera_customer_delivery_payment (status);

-- -----------------------------------------------------------------------------
-- 3) kubera_delivery.kubera_customer_order_status_events
--    Timeline for order tracking UI
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kubera_delivery.kubera_customer_order_status_events (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_map_id                        uuid NOT NULL REFERENCES kubera_delivery.kubera_customer_order_map(id)
                                        ON DELETE CASCADE,
  order_id                            integer,                   -- existing kubera.order.id
  order_ref_id                        text NOT NULL,

  status                              text NOT NULL,
  message                             text,

  created_at                          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE kubera_delivery.kubera_customer_order_status_events IS
  'Status timeline events for customer track page';

CREATE INDEX IF NOT EXISTS idx_status_events_order_map_id
  ON kubera_delivery.kubera_customer_order_status_events (order_map_id, created_at);

CREATE INDEX IF NOT EXISTS idx_status_events_order_id
  ON kubera_delivery.kubera_customer_order_status_events (order_id);

CREATE INDEX IF NOT EXISTS idx_status_events_order_ref_id
  ON kubera_delivery.kubera_customer_order_status_events (order_ref_id);

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at fresh on order_map
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION kubera_delivery.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_map_updated_at
  ON kubera_delivery.kubera_customer_order_map;

CREATE TRIGGER trg_order_map_updated_at
  BEFORE UPDATE ON kubera_delivery.kubera_customer_order_map
  FOR EACH ROW
  EXECUTE PROCEDURE kubera_delivery.set_updated_at();

DROP TRIGGER IF EXISTS trg_delivery_pay_updated_at
  ON kubera_delivery.kubera_customer_delivery_payment;

CREATE TRIGGER trg_delivery_pay_updated_at
  BEFORE UPDATE ON kubera_delivery.kubera_customer_delivery_payment
  FOR EACH ROW
  EXECUTE PROCEDURE kubera_delivery.set_updated_at();

-- =============================================================================
-- Hasura notes:
-- 1) Track schema "kubera_delivery" tables in Hasura console
-- 2) order_id has no FK to existing orders DB (cross-project); enforce in app
-- 3) GraphQL names typically: kubera_delivery_kubera_customer_order_map
--    (or customize root fields after tracking)
-- =============================================================================
