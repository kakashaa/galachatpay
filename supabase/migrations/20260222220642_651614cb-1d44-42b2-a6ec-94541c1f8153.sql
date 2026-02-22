CREATE UNIQUE INDEX idx_bd_commission_logs_unique_entry 
ON public.bd_commission_logs (bd_uuid, member_uuid, month, source_amount, member_type);