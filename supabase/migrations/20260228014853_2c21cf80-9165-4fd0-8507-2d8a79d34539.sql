
-- Create trigger on custom_gifts to send telegram notification on new insert
CREATE TRIGGER notify_telegram_custom_gifts
AFTER INSERT ON public.custom_gifts
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram();
