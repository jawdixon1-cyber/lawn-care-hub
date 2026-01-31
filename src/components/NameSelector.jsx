import { User } from 'lucide-react';

const USERS = ['Jude Wilson', 'Ethan Brant', 'Braden Andrus'];

export default function NameSelector({ onSelect }) {
  const handleSelect = (name) => {
    localStorage.setItem('greenteam-user', name);
    onSelect(name);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
        <span className="text-5xl block mb-4">🏡</span>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">GreenTeam Hub</h1>
        <p className="text-gray-500 text-sm mb-8">Select your name to continue</p>
        <div className="space-y-3">
          {USERS.map((name) => (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-800 text-white font-semibold text-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              <User size={22} />
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
