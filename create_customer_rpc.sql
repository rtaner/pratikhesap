-- RPC for incrementing customer balance (debt)
CREATE OR REPLACE FUNCTION public.increment_customer_balance(c_id uuid, amount decimal)
RETURNS void AS $$
BEGIN
  UPDATE public.customers
  SET balance = balance + amount
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
