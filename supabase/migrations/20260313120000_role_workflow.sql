-- RoomEase role workflow: club memberships, member → executive requests, booking provenance.
-- Run in Supabase SQL editor or via supabase db push.

CREATE TABLE IF NOT EXISTS public.club_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL,
  user_email text NOT NULL,
  role_in_club text NOT NULL CHECK (role_in_club IN ('member', 'executive')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_name, user_email)
);

CREATE INDEX IF NOT EXISTS idx_club_memberships_user ON public.club_memberships (lower(user_email));

CREATE TABLE IF NOT EXISTS public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_email text NOT NULL,
  created_by_name text,
  target_executive_email text NOT NULL,
  club_name text NOT NULL,
  room_id text NOT NULL,
  event_name text,
  organizer_name text,
  group_size int,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending_exec_review',
  executive_note text,
  request_source text NOT NULL DEFAULT 'member_recommendation',
  reviewed_at timestamptz,
  reviewed_by_email text,
  booking_id uuid REFERENCES public.bookings (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_target ON public.booking_requests (lower(target_executive_email), status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_creator ON public.booking_requests (lower(created_by_email));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS club_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS workflow_source text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS originated_by_email text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS originated_by_role text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS executive_email text;
