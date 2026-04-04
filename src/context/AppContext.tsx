import React, { createContext, useContext, useReducer } from 'react';
import type { AppState, Action } from '../types';

export const initialState: AppState = {
  screen: 'camera',
  capturedImageUrl: null,
  analysisResult: null,
  error: null,
  isModelLoading: true,
  resultSource: null,
  updateAvailable: false,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'MODEL_LOADED':
      return { ...state, isModelLoading: false };

    case 'CAPTURE':
      return {
        ...state,
        screen: 'analyzing',
        capturedImageUrl: action.imageUrl,
        error: null,
        resultSource: 'capture',
      };

    case 'ANALYSIS_COMPLETE':
      return { ...state, screen: 'result', analysisResult: action.result };

    case 'ERROR':
      return {
        ...state,
        screen: 'camera',
        error: action.message,
        capturedImageUrl: null,
        analysisResult: null,
      };

    case 'RETAKE':
      return {
        ...state,
        screen: 'camera',
        capturedImageUrl: null,
        analysisResult: null,
        resultSource: null,
        error: null,
      };

    case 'SHOW_HISTORY':
      return { ...state, screen: 'history' };

    case 'HIDE_HISTORY':
      return { ...state, screen: 'camera' };

    case 'VIEW_HISTORY_RESULT':
      return {
        ...state,
        screen: 'result',
        capturedImageUrl: action.imageUrl,
        analysisResult: action.result,
        resultSource: 'history',
      };

    case 'BACK_TO_HISTORY':
      return { ...state, screen: 'history' };

    case 'UPDATE_AVAILABLE':
      return { ...state, updateAvailable: true };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
