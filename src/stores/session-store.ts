/**
 * Enhanced session store with update/delete actions
 * @filepath src/stores/session-store.ts
 */

import { create } from 'zustand';
import { Session, ImageRecord } from '@/lib/types';

interface SessionState {
  // State
  sessions: Session[];
  currentSession: Session | null;
  currentImages: ImageRecord[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchSessions: () => Promise<void>;
  createSession: (name: string, description?: string) => Promise<Session>;
  updateSession: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
  refreshCurrentSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state
  sessions: [],
  currentSession: null,
  currentImages: [],
  loading: false,
  error: null,
  
  // Fetch all sessions
  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sessions');
      }
      
      set({ sessions: data.data, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions',
        loading: false 
      });
    }
  },
  
  // Create new session
  createSession: async (name: string, description?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }
      
      const newSession = data.data;
      set(state => ({ 
        sessions: [newSession, ...state.sessions],
        loading: false 
      }));
      
      return newSession;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create session',
        loading: false 
      });
      throw error;
    }
  },
  
  // Update session
  updateSession: async (id: string, updates: Partial<Session>) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update session');
      }
      
      // Update in local state
      set(state => ({
        sessions: state.sessions.map(s => 
          s.id === id ? { ...s, ...data.data } : s
        ),
        currentSession: state.currentSession?.id === id 
          ? { ...state.currentSession, ...data.data }
          : state.currentSession,
        loading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update session',
        loading: false 
      });
      throw error;
    }
  },
  
  // Delete session
  deleteSession: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/sessions/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete session');
      }
      
      // Remove from local state
      set(state => ({
        sessions: state.sessions.filter(s => s.id !== id),
        currentSession: state.currentSession?.id === id ? null : state.currentSession,
        loading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete session',
        loading: false 
      });
      throw error;
    }
  },
  
  // Select and load session details
  selectSession: async (sessionId: string) => {
    set({ loading: true, error: null });
    try {
      const [sessionRes, imagesRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}`),
        fetch(`/api/sessions/${sessionId}/images`),
      ]);
      
      const sessionData = await sessionRes.json();
      const imagesData = await imagesRes.json();
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to load session');
      }
      
      set({
        currentSession: sessionData.data,
        currentImages: imagesData.data || [],
        loading: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load session',
        loading: false 
      });
    }
  },
  
  // Refresh current session
  refreshCurrentSession: async () => {
    const { currentSession } = get();
    if (currentSession) {
      await get().selectSession(currentSession.id);
    }
  },
  
  // Clear error
  clearError: () => set({ error: null }),
}));