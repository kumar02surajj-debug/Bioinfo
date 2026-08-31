import React from 'react';
import { AnalysisProvider, useAnalysis } from './context/AnalysisContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { WorkflowStepper } from './components/layout/WorkflowStepper';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { QCPage } from './pages/QCPage';
import { DifferentialPage } from './pages/DifferentialPage';
import { ClusteringPage } from './pages/ClusteringPage';
import { EnrichmentPage } from './pages/EnrichmentPage';
import { SurvivalPage } from './pages/SurvivalPage';
import { ResultsPage } from './pages/ResultsPage';
import { DocumentationPage } from './pages/DocumentationPage';

const MainContent: React.FC = () => {
  const { activeStep } = useAnalysis();

  const renderActivePage = () => {
    switch (activeStep) {
      case 'dashboard':
        return <DashboardPage />;
      case 'upload':
        return <UploadPage />;
      case 'qc':
        return <QCPage />;
      case 'differential':
        return <DifferentialPage />;
      case 'clustering':
        return <ClusteringPage />;
      case 'enrichment':
        return <EnrichmentPage />;
      case 'survival':
        return <SurvivalPage />;
      case 'results':
        return <ResultsPage />;
      case 'docs':
        return <DocumentationPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header />
      <WorkflowStepper />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AnalysisProvider>
      <MainContent />
    </AnalysisProvider>
  );
}

export default App;
