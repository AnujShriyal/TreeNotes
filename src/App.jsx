import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotesProvider, useNotes } from './context/NotesContext';
import LoginScreen from './components/auth/LoginScreen';
import Sidebar from './components/tree/Sidebar';
import TreeDiagram from './components/tree/TreeDiagram';
import NoteEditor from './components/notes/NoteEditor';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';

// Inner shell — has access to both Auth and Notes contexts
function AppContent({ sidebarOpen, setSidebarOpen, mobileTab, setMobileTab }) {
  const { viewMode, setViewMode, selectNode } = useNotes();

  // When user clicks a node in the diagram: open it in editor, switch to sidebar view
  const handleDiagramSelect = (nodeId) => {
    selectNode(nodeId);
    setViewMode('sidebar');
    setMobileTab('note');
  };

  // Switch to diagram view
  const handleShowDiagram = () => {
    setViewMode('diagram');
    setMobileTab('tree');
  };

  const isDiagram = viewMode === 'diagram';

  return (
    <div className="app-shell">
      <Header onMenuOpen={() => setSidebarOpen(true)} />

      <div className="app-body">
        {/* Sidebar — always shows the tree list */}
        <Sidebar
          mobileOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onShowDiagram={handleShowDiagram}
        />

        {/* Main area — either diagram or editor */}
        <main className={`app-main ${mobileTab === 'tree' && !isDiagram ? 'app-main--hidden-mobile' : ''}`}>
          {isDiagram ? (
            <TreeDiagram onSelect={handleDiagramSelect} />
          ) : (
            <NoteEditor onShowDiagram={handleShowDiagram} />
          )}
        </main>
      </div>

      <MobileNav
        activeTab={mobileTab}
        onTabChange={(tab) => {
          setMobileTab(tab);
          if (tab === 'tree') setSidebarOpen(true);
          if (tab === 'note' && isDiagram) setViewMode('sidebar');
        }}
      />
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('note');

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NotesProvider>
      <AppContent
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
      />
    </NotesProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
