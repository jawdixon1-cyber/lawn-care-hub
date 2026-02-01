import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home as HomeIcon,
  CheckSquare,
  BookOpen,
  Users,
  Lightbulb,
  LogOut,
  RefreshCw,
} from 'lucide-react';

import {
  initialAnnouncements,
  initialStandards,
  initialGuides,
  initialFieldOpsGuides,
  initialPMEGuides,
  initialEquipment,
  initialIdeas,
  initialPolicies,
  initialTimeOffRequests,
  initialOwnerStartChecklist,
  initialOwnerEndChecklist,
  initialEquipmentRepairLog,
  initialTeamChecklist,
} from './data';

import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import Home from './pages/Home';
import OwnerDashboard from './pages/OwnerDashboard';
import Standards from './pages/Standards';
import HowToGuides from './pages/HowToGuides';
import EquipmentIdeas from './pages/EquipmentIdeas';
import HRPolicies from './pages/HRPolicies';
import IdeasFeedback from './pages/IdeasFeedback';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'guides', label: 'Playbooks', icon: BookOpen },
  { id: 'standards', label: 'Standards', icon: CheckSquare },
  { id: 'hr', label: 'HR', icon: Users },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
];

/* ─── App (outer) — auth gate + data loading ─── */

function App() {
  const { session, loading: authLoading } = useAuth();
  const [cloudData, setCloudData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('key, value');
      if (error) throw error;
      const map = {};
      if (data) {
        data.forEach((row) => { map[row.key] = row.value; });
      }
      setCloudData(map);
    } catch (err) {
      setDataError(err.message || 'Failed to load data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) loadData();
    else setCloudData(null);
  }, [session, loadData]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  if (dataLoading || !cloudData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading data...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-500 text-sm mb-6">{dataError}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <AppShell cloudData={cloudData} />;
}

/* ─── useCloudState — Supabase-backed state ─── */

function useCloudState(key, initialValue, cloudData) {
  const [state, setState] = useState(() => {
    const cloud = cloudData[key];
    if (cloud !== undefined && cloud !== null) {
      if (Array.isArray(cloud) && cloud.length === 0 && Array.isArray(initialValue) && initialValue.length > 0) {
        return initialValue;
      }
      return cloud;
    }
    return initialValue;
  });

  const initialized = useRef(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('app_state')
          .upsert({ key, value: state }, { onConflict: 'key' });
      } catch {
        /* silently skip — data will sync on next save */
      }
    }, 500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [key, state]);

  return [state, setState];
}

/* ─── AppShell (inner) — the main app ─── */

function AppShell({ cloudData }) {
  const { currentUser, ownerMode, signOut } = useAuth();
  const [tab, setTab] = useState('home');

  const [announcements, setAnnouncements] = useCloudState('greenteam-announcements', initialAnnouncements, cloudData);
  const [ownerTodos, setOwnerTodos] = useCloudState('greenteam-ownerTodos', [], cloudData);
  const [ownerStartChecklist, setOwnerStartChecklist] = useCloudState('greenteam-ownerStartChecklist', initialOwnerStartChecklist, cloudData);
  const [ownerEndChecklist, setOwnerEndChecklist] = useCloudState('greenteam-ownerEndChecklist', initialOwnerEndChecklist, cloudData);
  const [standards, setStandards] = useCloudState('greenteam-standards', initialStandards, cloudData);
  const [guides, setGuides] = useCloudState('greenteam-guides', [...initialGuides, ...initialFieldOpsGuides, ...initialPMEGuides], cloudData);
  const [equipment, setEquipment] = useCloudState('greenteam-equipment', initialEquipment, cloudData);
  const [ideas, setIdeas] = useCloudState('greenteam-ideas', initialIdeas, cloudData);
  const [policies, setPolicies] = useCloudState('greenteam-policies', initialPolicies, cloudData);
  const [timeOffRequests, setTimeOffRequests] = useCloudState('greenteam-timeOffRequests', initialTimeOffRequests, cloudData);
  const [archivedAnnouncements, setArchivedAnnouncements] = useCloudState('greenteam-archivedAnnouncements', [], cloudData);
  const [equipmentRepairLog, setEquipmentRepairLog] = useCloudState('greenteam-equipmentRepairLog', initialEquipmentRepairLog, cloudData);
  const [teamChecklist, setTeamChecklist] = useCloudState('greenteam-teamChecklist', initialTeamChecklist, cloudData);
  const [suggestions, setSuggestions] = useCloudState('greenteam-suggestions', [], cloudData);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Hey Jude's Lawn Care" className="h-10" />
            </div>

            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === t.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 hidden sm:inline">{currentUser}</span>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex border-t border-gray-100 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors min-w-[64px] ${
                  tab === t.id
                    ? 'text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-gray-400'
                }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === 'home' && (ownerMode ? (
          <OwnerDashboard
            currentUser={currentUser}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            archivedAnnouncements={archivedAnnouncements}
            setArchivedAnnouncements={setArchivedAnnouncements}
            timeOffRequests={timeOffRequests}
            setTimeOffRequests={setTimeOffRequests}
            equipment={equipment}
            setEquipment={setEquipment}
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            ownerTodos={ownerTodos}
            setOwnerTodos={setOwnerTodos}
            ownerStartChecklist={ownerStartChecklist}
            setOwnerStartChecklist={setOwnerStartChecklist}
            ownerEndChecklist={ownerEndChecklist}
            setOwnerEndChecklist={setOwnerEndChecklist}
            equipmentRepairLog={equipmentRepairLog}
            setEquipmentRepairLog={setEquipmentRepairLog}
            teamChecklist={teamChecklist}
            setTeamChecklist={setTeamChecklist}
            onNavigate={setTab}
          />
        ) : (
          <Home announcements={announcements} onNavigate={setTab} teamChecklist={teamChecklist} />
        ))}
        {tab === 'standards' && (
          <Standards items={standards} setItems={setStandards} ownerMode={ownerMode} />
        )}
        {tab === 'guides' && (
          <HowToGuides items={guides} setItems={setGuides} ownerMode={ownerMode} />
        )}
        {tab === 'equipment' && (
          <EquipmentIdeas
            equipment={equipment}
            setEquipment={setEquipment}
            ideas={ideas}
            setIdeas={setIdeas}
            ownerMode={ownerMode}
            currentUser={currentUser}
            equipmentRepairLog={equipmentRepairLog}
            setEquipmentRepairLog={setEquipmentRepairLog}
          />
        )}
        {tab === 'hr' && (
          <HRPolicies
            items={policies}
            setItems={setPolicies}
            timeOffRequests={timeOffRequests}
            setTimeOffRequests={setTimeOffRequests}
            ownerMode={ownerMode}
            currentUser={currentUser}
          />
        )}
        {tab === 'ideas' && (
          <IdeasFeedback
            suggestions={suggestions}
            setSuggestions={setSuggestions}
            ownerMode={ownerMode}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  );
}

export default App;
