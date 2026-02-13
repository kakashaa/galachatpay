-- Enable realtime for salary_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_requests;

-- Enable realtime for animated_photo_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.animated_photo_requests;