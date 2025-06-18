
import React from 'react';
import { AddGameForm } from './AddGameForm';
import { RoleGuard } from './RoleGuard';

export const AddGameFormWrapper: React.FC = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'editor']}>
      <AddGameForm />
    </RoleGuard>
  );
};
