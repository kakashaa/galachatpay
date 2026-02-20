-- Drop and recreate all triggers to ensure they exist
DROP TRIGGER IF EXISTS on_support_ticket_insert ON public.support_tickets;
DROP TRIGGER IF EXISTS on_vip_chat_insert ON public.support_chat_sessions;
DROP TRIGGER IF EXISTS on_salary_request_insert ON public.salary_requests;
DROP TRIGGER IF EXISTS on_animated_photo_insert ON public.animated_photo_requests;
DROP TRIGGER IF EXISTS on_quick_support_insert ON public.quick_support_requests;
DROP TRIGGER IF EXISTS on_custom_gift_insert ON public.custom_gifts;
DROP TRIGGER IF EXISTS on_ban_report_insert ON public.ban_reports;
DROP TRIGGER IF EXISTS on_bd_registration_insert ON public.bd_registration_requests;
DROP TRIGGER IF EXISTS on_bd_withdrawal_insert ON public.bd_withdrawals;
DROP TRIGGER IF EXISTS on_vip_request_insert ON public.vip_requests;

CREATE TRIGGER on_support_ticket_insert
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_vip_chat_insert
  AFTER INSERT ON public.support_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_salary_request_insert
  AFTER INSERT ON public.salary_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_animated_photo_insert
  AFTER INSERT ON public.animated_photo_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_quick_support_insert
  AFTER INSERT ON public.quick_support_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_custom_gift_insert
  AFTER INSERT ON public.custom_gifts
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_ban_report_insert
  AFTER INSERT ON public.ban_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_bd_registration_insert
  AFTER INSERT ON public.bd_registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_bd_withdrawal_insert
  AFTER INSERT ON public.bd_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();

CREATE TRIGGER on_vip_request_insert
  AFTER INSERT ON public.vip_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram();