-- =============================================================================
-- Café Kubera — Customer delivery address (EXISTING profile DB)
-- Schema: kubera_profile  |  Source: kubera_profile (stirring-pup-80)
-- GraphQL: kubera_profile_customer_address
-- =============================================================================

CREATE TABLE IF NOT EXISTS kubera_profile.customer_address (
  id                    serial PRIMARY KEY,
  customer_details_id   integer NOT NULL REFERENCES kubera_profile.customer_details(id) ON DELETE CASCADE,
  full_name             text NOT NULL,
  phone                 text NOT NULL,
  line1                 text NOT NULL,
  line2                 text,
  landmark              text,
  city                  text,
  pincode               text,
  lat                   numeric(10,7),
  lng                   numeric(10,7),
  is_default            boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_address_customer_details_id
  ON kubera_profile.customer_address (customer_details_id);

CREATE INDEX IF NOT EXISTS idx_customer_address_is_default
  ON kubera_profile.customer_address (customer_details_id, is_default);

COMMENT ON TABLE kubera_profile.customer_address IS
  'Saved delivery addresses for customer profile; lat/lng used for 5km radius check';

-- Hasura relationships (already applied via API if created by agent):
-- customer_address.customer_detail  -> customer_details
-- customer_details.customer_addresses -> customer_address[]
