-- Allow admins/superadmins to see ALL plan purchases (until now each user only saw their own rows)
CREATE POLICY "Admins view all subscriptions"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins view all subscription payments"
ON public.subscription_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

-- checkout_orders (/pagar school purchases) was service-role only; let admins read it
GRANT SELECT ON public.checkout_orders TO authenticated;
CREATE POLICY "Admins view all checkout orders"
ON public.checkout_orders FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));