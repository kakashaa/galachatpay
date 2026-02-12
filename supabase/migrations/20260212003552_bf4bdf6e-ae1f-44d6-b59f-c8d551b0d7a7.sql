-- Create support chat feedback table
CREATE TABLE public.support_chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_uuid VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chat_feedback ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.support_chat_feedback
FOR SELECT
USING (user_uuid = COALESCE(auth.uid()::text, 'guest'));

-- Allow users to insert feedback
CREATE POLICY "Users can insert feedback"
ON public.support_chat_feedback
FOR INSERT
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_support_feedback_user_uuid ON public.support_chat_feedback(user_uuid);
CREATE INDEX idx_support_feedback_created_at ON public.support_chat_feedback(created_at DESC);