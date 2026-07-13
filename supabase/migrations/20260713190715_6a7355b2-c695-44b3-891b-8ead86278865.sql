
-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_site BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'dark';

-- Watch events
CREATE TABLE IF NOT EXISTS public.watch_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watch_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_events TO authenticated;
GRANT ALL ON public.watch_events TO service_role;
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own watch events" ON public.watch_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own watch events" ON public.watch_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all watch events" ON public.watch_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS watch_events_user_created_idx ON public.watch_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS watch_events_video_idx ON public.watch_events(video_id);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own favorites" ON public.favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
