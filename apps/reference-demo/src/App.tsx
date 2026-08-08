import React from 'react';
import { AppProvider, useAppContext } from './state/context';
import { useHash, parseRoute } from './hooks/useHash';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { ProjectView } from './pages/ProjectView';
import { ThermalModelDemo } from './pages/ThermalModelDemo';
import { ComponentGallery } from './pages/ComponentGallery';
import { PolicyManagement } from './pages/PolicyManagement';

function AppRouter() {
  const [hash, navigate] = useHash();
  const { state, dispatch } = useAppContext();

  const route = parseRoute(hash);

  let content: React.ReactNode;
  switch (route.path) {
    case '/':
      content = <HomePage onNavigate={navigate} />;
      break;
    case '/project/:id':
      content = <ProjectView projectId={route.params['id'] ?? 'demo'} onNavigate={navigate} />;
      break;
    case '/thermal-model':
      content = <ThermalModelDemo />;
      break;
    case '/components':
      content = <ComponentGallery />;
      break;
    case '/policies/:projectId':
      content = (
        <PolicyManagement projectId={route.params['projectId'] ?? state.currentProjectId} />
      );
      break;
    default:
      content = <HomePage onNavigate={navigate} />;
  }

  return (
    <MainLayout
      projectId={state.currentProjectId}
      onProjectChange={(id) => dispatch({ type: 'SET_PROJECT', projectId: id })}
      onNavigate={navigate}
      currentPath={route.path}
    >
      {content}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
