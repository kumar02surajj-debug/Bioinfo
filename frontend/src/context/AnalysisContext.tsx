import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  AnalysisStep,
  HealthResponse,
  UploadResponse,
  QCResponse,
  PCAResponse,
  DifferentialResponse,
  ClusteringResponse,
  EnrichmentResponse,
  SurvivalResponse,
} from '../types';
import * as api from '../services/api';

export interface SavedSession {
  version: string;
  saved_at: string;
  activeStep: AnalysisStep;
  dataset: UploadResponse | null;
  qcResults: QCResponse | null;
  pcaResults: PCAResponse | null;
  degResults: DifferentialResponse | null;
  clusteringResults: ClusteringResponse | null;
  enrichmentResults: EnrichmentResponse | null;
  survivalResults: SurvivalResponse | null;
  parameters: {
    selectedControl: string;
    selectedTreatment: string;
    log2fcCutoff: number;
    fdrCutoff: number;
    selectedSurvivalGene: string;
  };
}

interface AnalysisContextType {
  activeStep: AnalysisStep;
  setActiveStep: (step: AnalysisStep) => void;
  backendHealth: HealthResponse | null;
  isBackendConnected: boolean;
  isCheckingHealth: boolean;
  checkBackendConnection: () => Promise<void>;

  // Datasets and results
  dataset: UploadResponse | null;
  setDataset: (data: UploadResponse | null) => void;
  qcResults: QCResponse | null;
  setQcResults: (data: QCResponse | null) => void;
  pcaResults: PCAResponse | null;
  setPcaResults: (data: PCAResponse | null) => void;
  degResults: DifferentialResponse | null;
  setDegResults: (data: DifferentialResponse | null) => void;
  clusteringResults: ClusteringResponse | null;
  setClusteringResults: (data: ClusteringResponse | null) => void;
  enrichmentResults: EnrichmentResponse | null;
  setEnrichmentResults: (data: EnrichmentResponse | null) => void;
  survivalResults: SurvivalResponse | null;
  setSurvivalResults: (data: SurvivalResponse | null) => void;

  // Selected parameters
  selectedControl: string;
  setSelectedControl: (val: string) => void;
  selectedTreatment: string;
  setSelectedTreatment: (val: string) => void;
  log2fcCutoff: number;
  setLog2fcCutoff: (val: number) => void;
  fdrCutoff: number;
  setFdrCutoff: (val: number) => void;
  selectedSurvivalGene: string;
  setSelectedSurvivalGene: (gene: string) => void;

  // UI / Status states
  loadingState: Record<string, boolean>;
  setLoading: (key: string, isLoading: boolean) => void;
  errorState: Record<string, string | null>;
  setError: (key: string, error: string | null) => void;
  clearErrors: () => void;
  resetSession: () => void;

  // Session State Persistence & Portability
  exportSessionJSON: () => void;
  importSessionJSON: (file: File) => Promise<boolean>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeStep, setActiveStep] = useState<AnalysisStep>('dashboard');
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(true);

  const [dataset, setDataset] = useState<UploadResponse | null>(null);
  const [qcResults, setQcResults] = useState<QCResponse | null>(null);
  const [pcaResults, setPcaResults] = useState<PCAResponse | null>(null);
  const [degResults, setDegResults] = useState<DifferentialResponse | null>(null);
  const [clusteringResults, setClusteringResults] = useState<ClusteringResponse | null>(null);
  const [enrichmentResults, setEnrichmentResults] = useState<EnrichmentResponse | null>(null);
  const [survivalResults, setSurvivalResults] = useState<SurvivalResponse | null>(null);

  const [selectedControl, setSelectedControl] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<string>('');
  const [log2fcCutoff, setLog2fcCutoff] = useState<number>(1.0);
  const [fdrCutoff, setFdrCutoff] = useState<number>(0.05);
  const [selectedSurvivalGene, setSelectedSurvivalGene] = useState<string>('');

  const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});
  const [errorState, setErrorState] = useState<Record<string, string | null>>({});

  const setLoading = (key: string, isLoading: boolean) => {
    setLoadingState((prev) => ({ ...prev, [key]: isLoading }));
  };

  const setError = (key: string, error: string | null) => {
    setErrorState((prev) => ({ ...prev, [key]: error }));
  };

  const clearErrors = () => {
    setErrorState({});
  };

  const checkBackendConnection = async () => {
    setIsCheckingHealth(true);
    try {
      const health = await api.checkHealth();
      setBackendHealth(health);
      setIsBackendConnected(health.status === 'ok');
      setError('backend', null);
    } catch (err: any) {
      setIsBackendConnected(false);
      setBackendHealth(null);
      setError('backend', err.message || 'Backend unreachable');
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update default contrast groups when dataset changes
  useEffect(() => {
    if (dataset && dataset.conditions.length >= 2) {
      const conds = dataset.conditions;
      const ctrl = conds.find(c => c.toLowerCase().includes('ctrl') || c.toLowerCase().includes('control')) || conds[0];
      const trt = conds.find(c => c !== ctrl) || conds[1];
      setSelectedControl(ctrl);
      setSelectedTreatment(trt);
    }
  }, [dataset]);

  const resetSession = () => {
    setDataset(null);
    setQcResults(null);
    setPcaResults(null);
    setDegResults(null);
    setClusteringResults(null);
    setEnrichmentResults(null);
    setSurvivalResults(null);
    setSelectedSurvivalGene('');
    clearErrors();
    setActiveStep('upload');
  };

  const exportSessionJSON = () => {
    const sessionData: SavedSession = {
      version: '1.0.0',
      saved_at: new Date().toISOString(),
      activeStep,
      dataset,
      qcResults,
      pcaResults,
      degResults,
      clusteringResults,
      enrichmentResults,
      survivalResults,
      parameters: {
        selectedControl,
        selectedTreatment,
        log2fcCutoff,
        fdrCutoff,
        selectedSurvivalGene,
      },
    };

    const jsonString = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nameSlug = dataset ? dataset.dataset_name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'workspace';
    a.download = `TranscriptoX_Session_${nameSlug}_${new Date().toISOString().slice(0, 10)}.transcriptox.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const importSessionJSON = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const sessionData: SavedSession = JSON.parse(text);

      if (sessionData.dataset) setDataset(sessionData.dataset);
      if (sessionData.qcResults) setQcResults(sessionData.qcResults);
      if (sessionData.pcaResults) setPcaResults(sessionData.pcaResults);
      if (sessionData.degResults) setDegResults(sessionData.degResults);
      if (sessionData.clusteringResults) setClusteringResults(sessionData.clusteringResults);
      if (sessionData.enrichmentResults) setEnrichmentResults(sessionData.enrichmentResults);
      if (sessionData.survivalResults) setSurvivalResults(sessionData.survivalResults);

      if (sessionData.parameters) {
        if (sessionData.parameters.selectedControl) setSelectedControl(sessionData.parameters.selectedControl);
        if (sessionData.parameters.selectedTreatment) setSelectedTreatment(sessionData.parameters.selectedTreatment);
        if (typeof sessionData.parameters.log2fcCutoff === 'number') setLog2fcCutoff(sessionData.parameters.log2fcCutoff);
        if (typeof sessionData.parameters.fdrCutoff === 'number') setFdrCutoff(sessionData.parameters.fdrCutoff);
        if (sessionData.parameters.selectedSurvivalGene) setSelectedSurvivalGene(sessionData.parameters.selectedSurvivalGene);
      }

      if (sessionData.activeStep) {
        setActiveStep(sessionData.activeStep);
      } else if (sessionData.degResults) {
        setActiveStep('results');
      }

      clearErrors();
      return true;
    } catch (err: any) {
      setError('import', 'Failed to load session JSON: ' + (err.message || 'Invalid session format.'));
      return false;
    }
  };

  return (
    <AnalysisContext.Provider
      value={{
        activeStep,
        setActiveStep,
        backendHealth,
        isBackendConnected,
        isCheckingHealth,
        checkBackendConnection,
        dataset,
        setDataset,
        qcResults,
        setQcResults,
        pcaResults,
        setPcaResults,
        degResults,
        setDegResults,
        clusteringResults,
        setClusteringResults,
        enrichmentResults,
        setEnrichmentResults,
        survivalResults,
        setSurvivalResults,
        selectedControl,
        setSelectedControl,
        selectedTreatment,
        setSelectedTreatment,
        log2fcCutoff,
        setLog2fcCutoff,
        fdrCutoff,
        setFdrCutoff,
        selectedSurvivalGene,
        setSelectedSurvivalGene,
        loadingState,
        setLoading,
        errorState,
        setError,
        clearErrors,
        resetSession,
        exportSessionJSON,
        importSessionJSON,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
