
-- Allow partners to view expenses (read-only)
CREATE POLICY "Expenses: partner select"
ON public.expenses
FOR SELECT
TO authenticated
USING (is_partner());

-- Allow partners to view subscriptions (for billing page)
CREATE POLICY "Subscriptions: partner select"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (is_partner());
