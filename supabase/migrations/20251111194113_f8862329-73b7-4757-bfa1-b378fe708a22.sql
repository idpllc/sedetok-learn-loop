-- Allow superadmins to create educoin transactions for any user
CREATE POLICY "Superadmins can create transactions for any user"
ON educoin_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Allow superadmins to view all educoin transactions
CREATE POLICY "Superadmins can view all transactions"
ON educoin_transactions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
);