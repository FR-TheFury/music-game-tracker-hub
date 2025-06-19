
-- Nettoyer les fausses données dans pending_validations
DELETE FROM public.pending_validations 
WHERE user_email LIKE '%@domain.local' 
   OR user_email LIKE 'user-%@domain.local'
   OR user_email NOT LIKE '%@%.%';

-- Améliorer la fonction handle_new_user_with_roles pour éviter les fausses données
CREATE OR REPLACE FUNCTION public.handle_new_user_with_roles()
RETURNS TRIGGER AS $$
DECLARE
  is_first_user BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Insert into profiles avec validation du username
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Utilisateur'));

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
    
    -- Add to pending validations avec validation de l'email
    IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%.%' THEN
      INSERT INTO public.pending_validations (user_id, user_email, username)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'username', 'Utilisateur'));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer une fonction pour récupérer les données utilisateur de manière sécurisée
CREATE OR REPLACE FUNCTION public.get_user_profile_data(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  role user_role,
  created_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    ur.user_id,
    COALESCE(p.username, 'Utilisateur') as username,
    ur.role,
    ur.created_at,
    ur.approved_at,
    ur.approved_by
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.user_id = target_user_id;
$$;

-- Créer une fonction pour que les admins récupèrent tous les utilisateurs
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  username text,
  role user_role,
  created_at timestamp with time zone,
  approved_at timestamp with time zone,
  approved_by uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    ur.user_id,
    COALESCE(p.username, 'Utilisateur') as username,
    ur.role,
    ur.created_at,
    ur.approved_at,
    ur.approved_by
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY ur.created_at DESC;
$$;

-- Mettre à jour les politiques RLS pour pending_validations
DROP POLICY IF EXISTS "Admins can view all pending validations" ON public.pending_validations;
DROP POLICY IF EXISTS "Admins can update pending validations" ON public.pending_validations;

CREATE POLICY "Admins can view all pending validations" 
  ON public.pending_validations FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pending validations" 
  ON public.pending_validations FOR UPDATE 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert pending validations" 
  ON public.pending_validations FOR INSERT 
  WITH CHECK (true);
