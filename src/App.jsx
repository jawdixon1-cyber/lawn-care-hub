import { useState } from 'react';
import {
  Home as HomeIcon,
  CheckSquare,
  BookOpen,
  Wrench,
  Users,
  Lock,
  Unlock,
} from 'lucide-react';

import {
  initialAnnouncements,
  initialStandards,
  initialGuides,
  initialEquipment,
  initialIdeas,
  initialPolicies,
} from './data';

import Home from './pages/Home';
import Standards from './pages/Standards';
import HowToGuides from './pages/HowToGuides';
import EquipmentIdeas from './pages/EquipmentIdeas';
import HRPolicies from './pages/HRPolicies';

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'standards', label: 'Standards', icon: CheckSquare },
  { id: 'guides', label: 'How-To', icon: BookOpen },
  { id: 'equipment', label: 'Equipment', icon: Wrench },
  { id: 'hr', label: 'HR', icon: Users },
];

function App() {
  const [tab, setTab] = useState('home');
  const [ownerMode, setOwnerMode] = useState(false);

  const [announcements] = useState(initialAnnouncements);
  const [standards, setStandards] = useState(initialStandards);
  const [guides, setGuides] = useState(initialGuides);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [ideas, setIdeas] = useState(initialIdeas);
  const [policies, setPolicies] = useState(initialPolicies);

  const toggleOwnerMode = () => {
    if (!ownerMode) {
      const code = prompt('Enter edit mode password:');
      if (code === 'admin') {
        setOwnerMode(true);
      }
    } else {
      setOwnerMode(false);
    }
  };

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

            <button
              onClick={toggleOwnerMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                ownerMode
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={ownerMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            >
              {ownerMode ? <Unlock size={18} /> : <Lock size={18} />}
              <span className="hidden sm:inline">{ownerMode ? 'Editing' : 'Edit Mode'}</span>
            </button>
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
        {tab === 'home' && <Home announcements={announcements} />}
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
          />
        )}
        {tab === 'hr' && (
          <HRPolicies items={policies} setItems={setPolicies} ownerMode={ownerMode} />
        )}
      </main>
    </div>
  );
}

export default App;
