
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a generic function that sends HTTP POST to telegram-notify edge function
CREATE OR REPLACE FUNCTION public.notify_telegram()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  table_type text;
BEGIN
  -- Map table name to notification type
  CASE TG_TABLE_NAME
    WHEN 'support_tickets' THEN table_type := 'support_ticket';
    WHEN 'support_chat_sessions' THEN table_type := 'vip_chat';
    WHEN 'salary_requests' THEN table_type := 'salary_request';
    WHEN 'animated_photo_requests' THEN table_type := 'animated_photo';
    WHEN 'quick_support_requests' THEN table_type := 'quick_support';
    WHEN 'custom_gifts' THEN table_type := 'custom_gift';
    WHEN 'ban_reports' THEN table_type := 'ban_report';
    WHEN 'bd_registration_requests' THEN table_type := 'bd_registration';
    WHEN 'bd_withdrawals' THEN table_type := 'bd_withdrawal';
    WHEN 'vip_requests' THEN table_type := 'vip_request';
    ELSE table_type := TG_TABLE_NAME;
  END CASE;

  payload := jsonb_build_object(
    'type', table_type,
    'record', row_to_json(NEW)::jsonb
  );

  PERFORM extensions.http_post(
    url := (SELECT value FROM public.app_settings WHERE key = 'supabase_functions_url') || '/telegram-notify',
    body := payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.app_settings WHERE key = 'supabase_anon_key')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the INSERT if notification fails
  RAISE WARNING 'Telegram notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create triggers for all relevant tables
CREATE TRIGGER trg_telegram_support_tickets
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_support_chat_sessions
  AFTER INSERT ON public.support_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_salary_requests
  AFTER INSERT ON public.salary_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_animated_photo_requests
  AFTER INSERT ON public.animated_photo_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_quick_support_requests
  AFTER INSERT ON public.quick_support_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_custom_gifts
  AFTER INSERT ON public.custom_gifts
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_ban_reports
  AFTER INSERT ON public.ban_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_bd_registration_requests
  AFTER INSERT ON public.bd_registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_bd_withdrawals
  AFTER INSERT ON public.bd_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER trg_telegram_vip_requests
  AFTER INSERT ON public.vip_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();
