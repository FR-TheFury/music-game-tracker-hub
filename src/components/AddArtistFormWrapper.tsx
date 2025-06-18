
import React from 'react';
import { AddArtistForm } from './AddArtistForm';
import { RoleGuard } from './RoleGuard';

export const AddArtistFormWrapper: React.FC = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'editor']}>
      <AddArtistForm />
    </RoleGuard>
  );
};
