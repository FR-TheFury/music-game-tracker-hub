
-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'editor', 'viewer', 'pending');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create pending_validations table for email notifications
CREATE TABLE public.pending_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  username TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_validations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own role" 
  ON public.user_roles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
  ON public.user_roles FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" 
  ON public.user_roles FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- RLS policies for pending_validations
CREATE POLICY "Admins can view all pending validations" 
  ON public.pending_validations FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pending validations" 
  ON public.pending_validations FOR UPDATE 
  USING (public.is_admin(auth.uid()));

-- Update existing RLS policies to include role checks
DROP POLICY IF EXISTS "Users can view their own artists" ON public.artists;
DROP POLICY IF EXISTS "Users can create their own artists" ON public.artists;
DROP POLICY IF EXISTS "Users can update their own artists" ON public.artists;
DROP POLICY IF EXISTS "Users can delete their own artists" ON public.artists;

CREATE POLICY "Users can view their own artists or admins/editors can view all" 
  ON public.artists FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Editors and admins can create artists" 
  ON public.artists FOR INSERT 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Users can update their own artists or admins/editors can update all" 
  ON public.artists FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Users can delete their own artists or admins can delete all" 
  ON public.artists FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Update games policies
DROP POLICY IF EXISTS "Users can view their own games" ON public.games;
DROP POLICY IF EXISTS "Users can create their own games" ON public.games;
DROP POLICY IF EXISTS "Users can update their own games" ON public.games;
DROP POLICY IF EXISTS "Users can delete their own games" ON public.games;

CREATE POLICY "Users can view their own games or admins/editors can view all" 
  ON public.games FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor') OR
    public.has_role(auth.uid(), 'viewer')
  );

CREATE POLICY "Editors and admins can create games" 
  ON public.games FOR INSERT 
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Users can update their own games or admins/editors can update all" 
  ON public.games FOR UPDATE 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'editor')
  );

CREATE POLICY "Users can delete their own games or admins can delete all" 
  ON public.games FOR DELETE 
  USING (
    auth.uid() = user_id OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user_with_roles()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

  -- Check if this is the first user (admin)
  SELECT COUNT(*) INTO admin_count FROM auth.users;
  
  IF admin_count = 1 THEN
    -- First user becomes admin
    INSERT INTO public.user_roles (user_id, role, approved_at)
    VALUES (NEW.id, 'admin', NOW());
  ELSE
    -- Subsequent users are pending
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
    
    -- Add to pending validations for admin notification
    INSERT INTO public.pending_validations (user_id, user_email, username)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'username');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_with_roles();
