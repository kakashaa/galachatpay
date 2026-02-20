
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create triggers for all relevant tables

CREATE TRIGGER on_support_ticket_insert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_vip_chat_insert
  AFTER INSERT ON public.support_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_salary_request_insert
  AFTER INSERT ON public.salary_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_animated_photo_insert
  AFTER INSERT ON public.animated_photo_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_quick_support_insert
  AFTER INSERT ON public.quick_support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_custom_gift_insert
  AFTER INSERT ON public.custom_gifts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_ban_report_insert
  AFTER INSERT ON public.ban_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_bd_registration_insert
  AFTER INSERT ON public.bd_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_bd_withdrawal_insert
  AFTER INSERT ON public.bd_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_vip_request_insert
  AFTER INSERT ON public.vip_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram();
