import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchParticipants } from '../services/participants';
import { useAuth } from './AuthContext';
import type { ParticipantStatus, ParticipantWithGuardian, ShirtSize } from '../types/database';

interface ParticipantsDataContextType {
  participants: ParticipantWithGuardian[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: (force?: boolean) => Promise<void>;
  patchParticipantLocal: (
    id: string,
    updates: Partial<Pick<ParticipantWithGuardian, 'status' | 'shirt_purchased' | 'shirt_size'>>
  ) => void;
  patchStatusLocal: (id: string, status: ParticipantStatus) => void;
  patchShirtLocal: (id: string, purchased: boolean, size: ShirtSize | null) => void;
}

const ParticipantsDataContext = createContext<ParticipantsDataContextType | undefined>(undefined);

export function ParticipantsDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ParticipantWithGuardian[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const hasLoaded = Boolean(userId && loadedUserId === userId);

  const load = useCallback(
    async (force = false) => {
      if (!userId) return;
      if (loadedUserId === userId && !force) return;

      if (loadedUserId !== userId) setLoading(true);
      else setRefreshing(true);

      setError(null);
      try {
        const data = await fetchParticipants();
        setParticipants(data);
        setLoadedUserId(userId);
        setLastUpdated(new Date());
      } catch {
        setError('Não foi possível carregar os inscritos. Verifique sua conexão e tente novamente.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, loadedUserId]
  );

  useEffect(() => {
    if (userId && !hasLoaded) {
      void load(true);
    }
  }, [userId, hasLoaded, load]);

  const activeParticipants = userId && loadedUserId === userId ? participants : [];
  const activeLastUpdated = userId && loadedUserId === userId ? lastUpdated : null;

  const patchParticipantLocal = useCallback(
    (
      id: string,
      updates: Partial<Pick<ParticipantWithGuardian, 'status' | 'shirt_purchased' | 'shirt_size'>>
    ) => {
      setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    []
  );

  const patchStatusLocal = useCallback(
    (id: string, status: ParticipantStatus) => {
      patchParticipantLocal(id, { status });
    },
    [patchParticipantLocal]
  );

  const patchShirtLocal = useCallback(
    (id: string, shirt_purchased: boolean, shirt_size: ShirtSize | null) => {
      patchParticipantLocal(id, { shirt_purchased, shirt_size });
    },
    [patchParticipantLocal]
  );

  return (
    <ParticipantsDataContext.Provider
      value={{
        participants: activeParticipants,
        loading,
        refreshing,
        error,
        lastUpdated: activeLastUpdated,
        refresh: () => load(true),
        patchParticipantLocal,
        patchStatusLocal,
        patchShirtLocal,
      }}
    >
      {children}
    </ParticipantsDataContext.Provider>
  );
}

export function useParticipantsData(): ParticipantsDataContextType {
  const ctx = useContext(ParticipantsDataContext);
  if (!ctx) {
    throw new Error('useParticipantsData must be used inside ParticipantsDataProvider');
  }
  return ctx;
}
