
import { useUserRoleContext } from '@/contexts/UserRoleContext';

export type { UserRole } from '@/contexts/UserRoleContext';

export const useUserRole = () => {
  return useUserRoleContext();
};
