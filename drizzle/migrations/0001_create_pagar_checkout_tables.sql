CREATE TABLE public.school_endpoints (
  origin text PRIMARY KEY,
  name text NOT NULL,
  webhook_secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.checkout_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_origin text NOT NULL,
  school_order_id text NOT NULL,
  school_name text,
  return_url text,
  payer_email text,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payment_relays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_order_id uuid REFERENCES public.checkout_orders(id) ON DELETE CASCADE,
  mp_payment_id text NOT NULL,
  status text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mp_payment_id, status)
);

CREATE INDEX idx_checkout_orders_school_order ON public.checkout_orders (school_origin, school_order_id);
CREATE INDEX idx_checkout_orders_status ON public.checkout_orders (status);

GRANT ALL ON public.school_endpoints TO service_role;
GRANT ALL ON public.checkout_orders TO service_role;
GRANT ALL ON public.payment_relays TO service_role;

ALTER TABLE public.school_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_relays ENABLE ROW LEVEL SECURITY;