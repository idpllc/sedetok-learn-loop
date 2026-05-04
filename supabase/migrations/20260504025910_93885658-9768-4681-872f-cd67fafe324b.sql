INSERT INTO public.subscription_plans (
  code,
  name,
  price_cop,
  monthly_educoins,
  max_notebooks,
  max_sources_per_notebook,
  voice_chat_access,
  read_aloud_access,
  premium_courses_access,
  is_active,
  sort_order
)
VALUES
  ('free', 'Free', 0, 20, 1, 3, false, false, false, true, 1),
  ('premium', 'Premium', 14900, 100, 20, 50, true, true, false, true, 2),
  ('ultra', 'Ultra', 29500, 300, NULL, NULL, true, true, true, true, 3)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cop = EXCLUDED.price_cop,
  monthly_educoins = EXCLUDED.monthly_educoins,
  max_notebooks = EXCLUDED.max_notebooks,
  max_sources_per_notebook = EXCLUDED.max_sources_per_notebook,
  voice_chat_access = EXCLUDED.voice_chat_access,
  read_aloud_access = EXCLUDED.read_aloud_access,
  premium_courses_access = EXCLUDED.premium_courses_access,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();