import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Não foi possível carregar os dados. Tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-danger-light flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-danger" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">Algo deu errado</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
