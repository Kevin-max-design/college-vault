-- Create classroom_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat_code TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, user_id)
);

-- RLS for classroom_members
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'classroom_members' AND policyname = 'Users can read all classroom_members'
    ) THEN
        CREATE POLICY "Users can read all classroom_members"
        ON public.classroom_members FOR SELECT
        USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'classroom_members' AND policyname = 'Users can insert their own classroom_members'
    ) THEN
        CREATE POLICY "Users can insert their own classroom_members"
        ON public.classroom_members FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'classroom_members' AND policyname = 'Admin/HOD can delete classroom_members'
    ) THEN
        CREATE POLICY "Admin/HOD can delete classroom_members"
        ON public.classroom_members FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('hod', 'principal')
          )
        );
    END IF;
END $$;
