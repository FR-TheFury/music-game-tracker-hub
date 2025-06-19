
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Database, Settings, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemHealthStatus {
  component: string;
  status: string;
  last_execution: string | null;
  details: string;
}

export const AutonomousSystemMonitor: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<SystemHealthStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const { toast } = useToast();

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      console.log('Checking autonomous system health...');
      
      const { data, error } = await supabase.rpc('check_autonomous_system_health');

      if (error) {
        console.error('Error checking system health:', error);
        throw error;
      }

      console.log('System health data:', data);
      setHealthStatus(data || []);
      setLastCheck(new Date().toLocaleString('fr-FR'));

    } catch (error) {
      console.error('Error in checkSystemHealth:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier l'état du système",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'configured':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'inactive':
      case 'no_users_configured':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'no_recent_activity':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'configured':
        return 'text-green-400';
      case 'inactive':
      case 'no_users_configured':
        return 'text-red-400';
      case 'no_recent_activity':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getComponentName = (component: string) => {
    switch (component) {
      case 'cron_job':
        return 'Tâche Automatique';
      case 'notifications':
        return 'Notifications Récentes';
      case 'notification_settings':
        return 'Paramètres Utilisateurs';
      default:
        return component;
    }
  };

  const getComponentIcon = (component: string) => {
    switch (component) {
      case 'cron_job':
        return <Clock className="h-4 w-4" />;
      case 'notifications':
        return <Database className="h-4 w-4" />;
      case 'notification_settings':
        return <Settings className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  return (
    <Card className="bg-slate-800/90 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            Surveillance du Système Autonome
          </div>
          <Button
            onClick={checkSystemHealth}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-300">
          <p>État en temps réel du système de vérification automatique des nouvelles sorties.</p>
          {lastCheck && (
            <p className="mt-1 text-xs text-gray-400">
              Dernière vérification : {lastCheck}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {healthStatus.map((status, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600"
            >
              <div className="flex items-center gap-3">
                {getComponentIcon(status.component)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">
                      {getComponentName(status.component)}
                    </span>
                    {getStatusIcon(status.status)}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {status.details}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(status.status)}`}>
                  {status.status.replace('_', ' ').toUpperCase()}
                </div>
                {status.last_execution && (
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(status.last_execution).toLocaleString('fr-FR')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {healthStatus.length === 0 && !loading && (
          <div className="text-center py-4 text-gray-400">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucune donnée de surveillance disponible</p>
            <p className="text-xs mt-1">Cliquez sur le bouton de rafraîchissement pour vérifier</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
