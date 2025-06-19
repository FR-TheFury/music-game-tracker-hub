
-- Fonction pour rechercher des utilisateurs par username (accessible aux viewers)
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_term text)
RETURNS TABLE (
  user_id uuid,
  username text,
  role user_role,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    ur.user_id,
    COALESCE(p.username, 'Utilisateur') as username,
    ur.role,
    ur.created_at
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE 
    ur.role IN ('admin', 'editor', 'viewer') AND
    ur.approved_at IS NOT NULL AND
    LOWER(COALESCE(p.username, '')) ILIKE LOWER('%' || search_term || '%')
  ORDER BY p.username ASC
  LIMIT 20;
$$;

-- Fonction pour récupérer les artistes d'un utilisateur spécifique (lecture seule pour viewers)
CREATE OR REPLACE FUNCTION public.get_user_artists(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  platform text,
  url text,
  image_url text,
  spotify_id text,
  followers_count integer,
  popularity integer,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    a.id,
    a.name,
    a.platform,
    a.url,
    a.image_url,
    a.spotify_id,
    a.followers_count,
    a.popularity,
    a.created_at
  FROM public.artists a
  JOIN public.user_roles ur ON ur.user_id = a.user_id
  WHERE 
    a.user_id = target_user_id AND
    ur.role IN ('admin', 'editor', 'viewer') AND
    ur.approved_at IS NOT NULL
  ORDER BY a.created_at DESC;
$$;

-- Fonction pour récupérer les jeux d'un utilisateur spécifique (lecture seule pour viewers)
CREATE OR REPLACE FUNCTION public.get_user_games(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  platform text,
  url text,
  image_url text,
  price text,
  discount text,
  release_date text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    g.id,
    g.name,
    g.platform,
    g.url,
    g.image_url,
    g.price,
    g.discount,
    g.release_date,
    g.created_at
  FROM public.games g
  JOIN public.user_roles ur ON ur.user_id = g.user_id
  WHERE 
    g.user_id = target_user_id AND
    ur.role IN ('admin', 'editor', 'viewer') AND
    ur.approved_at IS NOT NULL
  ORDER BY g.created_at DESC;
$$;
