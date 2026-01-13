-- Add user_email and user_name columns to feedback table
ALTER TABLE public.feedback
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create index for user_email for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON public.feedback (user_email);

