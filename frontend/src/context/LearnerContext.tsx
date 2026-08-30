import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { LearnerOut } from '@/api/types';
import { listLearners, getLearner } from '@/api/client';

/* ── Context shape ──────────────────────────────────────────────── */

interface LearnerContextValue {
  learner: LearnerOut | null;
  learners: LearnerOut[];
  loading: boolean;
  setLearnerById: (id: string) => void;
  setLearnerDirect: (l: LearnerOut) => void;
  refreshLearners: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

const STORAGE_KEY = 'northstar_learner_id';

/* ── Provider ───────────────────────────────────────────────────── */

export function LearnerProvider({ children }: { children: ReactNode }) {
  const [learner, setLearner] = useState<LearnerOut | null>(null);
  const [learners, setLearners] = useState<LearnerOut[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLearners = useCallback(async () => {
    try {
      const data = await listLearners();
      setLearners(data);
    } catch {
      // If backend is down, start with an empty list
      setLearners([]);
    }
  }, []);

  /* Initialise: load learner list + restore last selected */
  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshLearners();

      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        try {
          const l = await getLearner(savedId);
          setLearner(l);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    })();
  }, [refreshLearners]);

  const setLearnerById = useCallback(
    (id: string) => {
      const found = learners.find((l) => l.id === id);
      if (found) {
        setLearner(found);
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [learners],
  );

  const setLearnerDirect = useCallback((l: LearnerOut) => {
    setLearner(l);
    localStorage.setItem(STORAGE_KEY, l.id);
  }, []);

  return (
    <LearnerContext.Provider
      value={{ learner, learners, loading, setLearnerById, setLearnerDirect, refreshLearners }}
    >
      {children}
    </LearnerContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────────── */

export function useLearner(): LearnerContextValue {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error('useLearner must be used within <LearnerProvider>');
  return ctx;
}
