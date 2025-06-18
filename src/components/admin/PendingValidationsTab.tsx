
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';

interface PendingValidation {
  id: string;
  user_id: string;
  user_email: string;
  username: string | null;
  status: string;
  created_at: string;
}

interface PendingValidationsTabProps {
  pendingValidations: PendingValidation[];
  onApprove: (userId: string, role: 'admin' | 'editor' | 'viewer') => void;
  onReject: (userId: string) => void;
}

export const PendingValidationsTab: React.FC<PendingValidationsTabProps> = ({
  pendingValidations,
  onApprove,
  onReject
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Demandes en attente</h3>
        <Badge variant="secondary" className="bg-[#FF6B9D]/20 text-[#FF6B9D] border-[#FF6B9D]/30">
          {pendingValidations.length} en attente
        </Badge>
      </div>
      
      {pendingValidations.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 rounded-full bg-[#FF0751]/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Check className="h-8 w-8 text-[#FF0751]" />
          </div>
          <p className="text-gray-400">Aucune demande en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingValidations.map((validation) => (
            <div 
              key={validation.id} 
              className="flex items-center justify-between p-4 bg-slate-700/50 border border-[#FF0751]/20 rounded-lg hover:bg-slate-700/70 hover:border-[#FF0751]/40 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/20">
                  <Clock className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{validation.username || 'Sans nom'}</p>
                  <p className="text-sm text-gray-300">{validation.user_email}</p>
                  <p className="text-xs text-gray-400">
                    Demandé le {new Date(validation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(validation.user_id, 'viewer')}
                  className="text-blue-400 border-blue-400 hover:border-blue-300 hover:bg-blue-400/10 transition-all duration-300"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Lecteur
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onApprove(validation.user_id, 'editor')}
                  className="text-green-400 border-green-400 hover:border-green-300 hover:bg-green-400/10 transition-all duration-300"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Éditeur
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(validation.user_id)}
                  className="text-red-400 border-red-400 hover:border-red-300 hover:bg-red-400/10 transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeter
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
