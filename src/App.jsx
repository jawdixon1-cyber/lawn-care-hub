import { useState } from 'react';
import {
  Home as HomeIcon,
  CheckSquare,
  BookOpen,
  Wrench,
  Users,
  LogOut,
} from 'lucide-react';

import {
  initialAnnouncements,
  initialStandards,
  initialGuides,
  initialEquipment,
  initialIdeas,
  initialPolicies,
  initialTimeOffRequests,
  initialOwnerStartChecklist,
  initialOwnerEndChecklist,
} from './data';

import NameSelector from './components/NameSelector';
import Home from './pages/Home';
import OwnerDashboard from './pages/OwnerDashboard';
import Standards from './pages/Standards';
import HowToGuides from './pages/HowToGuides';
import EquipmentIdeas from './pages/EquipmentIdeas';
import HRPolicies from './pages/HRPolicies';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'guides', label: 'Playbooks', icon: BookOpen },
  { id: 'standards', label: 'Standards', icon: CheckSquare },
  { id: 'hr', label: 'HR', icon: Users },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
];

function App() {
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('greenteam-user'));
  const [tab, setTab] = useState('home');
  const ownerMode = currentUser === 'Jude Wilson';

  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [ownerTodos, setOwnerTodos] = useState([]);
  const [ownerStartChecklist, setOwnerStartChecklist] = useState(initialOwnerStartChecklist);
  const [ownerEndChecklist, setOwnerEndChecklist] = useState(initialOwnerEndChecklist);
  const [standards, setStandards] = useState(initialStandards);
  const [guides, setGuides] = useState(initialGuides);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [ideas, setIdeas] = useState(initialIdeas);
  const [policies, setPolicies] = useState(initialPolicies);
  const [timeOffRequests, setTimeOffRequests] = useState(initialTimeOffRequests);

  const handleSwitchUser = () => {
    localStorage.removeItem('greenteam-user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <NameSelector onSelect={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏡</span>
              <span className="font-bold text-gray-900 text-lg hidden sm:block">GreenTeam</span>
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
                onClick={handleSwitchUser}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title="Switch user"
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
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            timeOffRequests={timeOffRequests}
            setTimeOffRequests={setTimeOffRequests}
            equipment={equipment}
            setEquipment={setEquipment}
            ideas={ideas}
            setIdeas={setIdeas}
            ownerTodos={ownerTodos}
            setOwnerTodos={setOwnerTodos}
            ownerStartChecklist={ownerStartChecklist}
            setOwnerStartChecklist={setOwnerStartChecklist}
            ownerEndChecklist={ownerEndChecklist}
            setOwnerEndChecklist={setOwnerEndChecklist}
            onNavigate={setTab}
          />
        ) : (
          <Home announcements={announcements} onNavigate={setTab} />
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
      </main>
    </div>
  );
}

export default App;
