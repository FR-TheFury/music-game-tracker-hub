
-- Supprimer l'ancienne fonction puis créer la nouvelle avec les emails
DROP FUNCTION IF EXISTS public.get_all_users_for_admin();

CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  username text,
  user_email text,
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
    COALESCE(pv.user_email, 'Email non disponible') as user_email,
    ur.role,
    ur.created_at,
    ur.approved_at,
    ur.approved_by
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN public.pending_validations pv ON pv.user_id = ur.user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY ur.created_at DESC;
$$;
