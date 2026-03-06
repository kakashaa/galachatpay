DROP TRIGGER IF EXISTS on_support_ticket_insert ON public.support_tickets;
DROP TRIGGER IF EXISTS on_ticket_reply_insert ON public.ticket_replies;
DROP TRIGGER IF EXISTS notify_support_ticket ON public.support_tickets;
DROP TRIGGER IF EXISTS notify_ticket_reply ON public.ticket_replies;
DROP TRIGGER IF EXISTS telegram_notify_support_tickets ON public.support_tickets;
DROP TRIGGER IF EXISTS telegram_notify_ticket_replies ON public.ticket_replies;
DROP TRIGGER IF EXISTS notify_telegram_support_tickets ON public.support_tickets;
DROP TRIGGER IF EXISTS notify_telegram_ticket_replies ON public.ticket_replies;