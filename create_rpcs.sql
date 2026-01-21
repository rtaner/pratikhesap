-- RPC for incrementing stock safely
CREATE OR REPLACE FUNCTION public.increment_stock(p_id uuid, amount int)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = stock_quantity + amount
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for incrementing supplier balance (debt)
CREATE OR REPLACE FUNCTION public.increment_supplier_balance(s_id uuid, amount decimal)
RETURNS void AS $$
BEGIN
  UPDATE public.suppliers
  SET balance = balance + amount
  WHERE id = s_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
