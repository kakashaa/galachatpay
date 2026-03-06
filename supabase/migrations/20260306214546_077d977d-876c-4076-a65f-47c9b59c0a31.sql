
CREATE OR REPLACE FUNCTION public.notify_telegram()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  payload jsonb;
  table_type text;
  func_url text;
  anon_key text;
BEGIN
  -- Map table name to notification type
  -- NOTE: support_tickets and ticket_replies are handled by frontend calls with full data (attachments etc)
  CASE TG_TABLE_NAME
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

  SELECT value INTO func_url FROM public.app_settings WHERE key = 'supabase_functions_url';
  SELECT value INTO anon_key FROM public.app_settings WHERE key = 'supabase_anon_key';

  IF func_url IS NOT NULL AND anon_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := func_url || '/telegram-notify',
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Telegram notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
