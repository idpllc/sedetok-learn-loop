-- Add educoins column to profiles table
ALTER TABLE profiles
ADD COLUMN educoins integer NOT NULL DEFAULT 0;

-- Create table for educoin transactions
CREATE TABLE educoin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  educoins integer NOT NULL,
  payment_method text NOT NULL DEFAULT 'epayco',
  payment_status text NOT NULL DEFAULT 'pending',
  transaction_ref text,
  epayco_ref text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE educoin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for educoin_transactions
CREATE POLICY "Users can view own transactions"
ON educoin_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON educoin_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_educoin_transactions_user_id ON educoin_transactions(user_id);
CREATE INDEX idx_educoin_transactions_status ON educoin_transactions(payment_status);