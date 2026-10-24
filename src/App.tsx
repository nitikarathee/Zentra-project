import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ApiItem, SecurityFinding, CISControl } from './types';
import { apiService } from './services/api';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CompliancePage } from './pages/CompliancePage';
import { RemediationPage } from './pages/RemediationPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { RbacSettingsPage } from './pages/RbacSettingsPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { DevicesPage } from './pages/DevicesPage';
import { TrainingPage } from './pages/TrainingPage';
import { FindingsPage } from './pages/FindingsPage';
import { FindingDetailPage } from './pages/FindingDetailPage';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<NavItem>('dashboard');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  // Desktop sidebar state remembered in localStorage ("zentra_sidebar_open"), default open (true)
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zentra_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zentra_sidebar_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Unified toggle for both keyboard "N" and Header button
  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      toggleDesktopSidebar();
    } else {
      setIsMobileMenuOpen((prev) => !prev);
    }
  };

  // Lock body scroll while mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Window resize: auto-close mobile drawer and reset body scroll when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
        document.body.style.overflow = '';
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut: N toggles sidebar; Escape closes mobile drawer
  useEffect(() => {
    if (showLanding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes mobile drawer if open
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) {
          e.preventDefault();
          setIsMobileMenuOpen(false);
        }
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        // Ignore when modifier keys are held
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // Ignore when typing in input, textarea, select, or contentEditable
        const target = e.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName;
          if (
            tagName === 'INPUT' ||
            tagName === 'TEXTAREA' ||
            tagName === 'SELECT' ||
            target.isContentEditable ||
            target.getAttribute('contenteditable') === 'true'
          ) {
            return;
          }
        }

        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLanding, isMobileMenuOpen, isDesktopSidebarOpen]);

  // Search cached records for fast instant modal querying
  const [searchApis, setSearchApis] = useState<ApiItem[]>([]);
  const [searchFindings, setSearchFindings] = useState<SecurityFinding[]>([]);
  const [searchControls, setSearchControls] = useState<CISControl[]>([]);

  // Load search index
  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        apiService.getApis(),
        apiService.getFindings(),
        apiService.getCompliance(),
      ])
        .then(([apis, findings, compliance]) => {
          setSearchApis(apis);
          setSearchFindings(findings);
          setSearchControls(compliance.controls);
        })
        .catch((err) => console.warn('Search index load error:', err));
    }
  }, [isAuthenticated, currentTab]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-cyan-400 font-mono text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p>INITIALIZING ZENTRA ZERO-TRUST KERNEL...</p>
      </div>
    );
  }

  // Unauthenticated Authentication Screens
  if (!isAuthenticated) {
    if (authView === 'register') {
      return <RegisterPage onNavigateLogin={() => setAuthView('login')} />;
    }
    return <LoginPage onNavigateRegister={() => setAuthView('register')} />;
  }

  // Navigation handlers
  const handleSelectFinding = (id: string) => {
    setSelectedFindingId(id);
    setCurrentTab('findings');
  };

  const handleNavigateTab = (tab: string) => {
    setCurrentTab(tab as NavItem);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFindingsCount = searchFindings.filter((f) => f.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Persistent Zero-Trust Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigateTab(tab)}
        openFindingsCount={openFindingsCount}
        isDesktopOpen={isDesktopSidebarOpen}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Workspace with smooth transition when sidebar toggles */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isDesktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        {/* Top Header */}
        <Header
          onToggleSidebar={toggleSidebar}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          onNavigateTab={handleNavigateTab}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateTab={handleNavigateTab}
              onSelectFinding={handleSelectFinding}
            />
          )}

          {currentTab === 'devices' && <DevicesPage />}

          {currentTab === 'compliance' && <CompliancePage />}

          {currentTab === 'training' && <TrainingPage />}

          {currentTab === 'reports' && (
            <ReportsPage onSelectFinding={handleSelectFinding} />
          )}

          {currentTab === 'remediation' && (
            <RemediationPage onSelectFinding={handleSelectFinding} />
          )}

          {currentTab === 'findings' && (
            selectedFindingId ? (
              <FindingDetailPage
                findingId={selectedFindingId}
                onBack={() => setSelectedFindingId(null)}
                onNavigateRemediation={() => handleNavigateTab('remediation')}
              />
            ) : (
              <FindingsPage onSelectFinding={handleSelectFinding} />
            )
          )}

          {currentTab === 'audit-logs' && <AuditLogsPage />}

          {currentTab === 'knowledge-base' && <KnowledgeBasePage />}

          {currentTab === 'settings' && (
            <RbacSettingsPage onNavigateTab={handleNavigateTab} />
          )}
        </main>
      </div>

      {/* Global Search & Command Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        apis={searchApis}
        findings={searchFindings}
        cisControls={searchControls}
        onSelectApi={(_id) => {
          setIsSearchOpen(false);
          handleNavigateTab('devices');
        }}
        onSelectFinding={(id) => {
          setIsSearchOpen(false);
          handleSelectFinding(id);
        }}
        onNavigateTab={(tab) => {
          setIsSearchOpen(false);
          handleNavigateTab(tab);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
