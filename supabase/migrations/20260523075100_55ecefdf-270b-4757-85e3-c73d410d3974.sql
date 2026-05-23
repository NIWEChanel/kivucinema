CREATE TABLE public.share_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID,
  user_id UUID,
  method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert share events"
ON public.share_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins read share events"
ON public.share_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_share_events_video ON public.share_events(video_id);
CREATE INDEX idx_share_events_created ON public.share_events(created_at DESC);