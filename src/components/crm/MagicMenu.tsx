import React from 'react';
import { Search, Building2, Users, User } from 'lucide-react';

interface MagicMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const MagicMenu: React.FC<MagicMenuProps> = ({ isOpen, onClose, onNavigate }) => {
  if (!isOpen) return null;

  const radius = 80;
  const centerSize = 56;
  const orbitSize = 48;

  const orbits = [
    {
      id: 'accounts',
      icon: Building2,
      angle: -90,
      color: 'bg-blue-500'
    },
    {
      id: 'contacts',
      icon: User,
      angle: 30,
      color: 'bg-emerald-500'
    },
    {
      id: 'partners',
      icon: Users,
      angle: 150,
      color: 'bg-amber-500'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pb-24 pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-64 h-64 mx-auto mb-8 pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300">

        {orbits.map((orbit) => {
          const angleRad = (orbit.angle * Math.PI) / 180;
          const x = radius * Math.cos(angleRad);
          const y = radius * Math.sin(angleRad);
          const Icon = orbit.icon;

          return (
            <button
              key={orbit.id}
              onClick={() => { onNavigate(orbit.id); onClose(); }}
              className={`absolute ${orbit.color} text-white rounded-full flex items-center justify-center
                         transition-all duration-200 ease-out shadow-lg
                         hover:scale-[1.15] hover:opacity-100 hover:shadow-2xl
                         opacity-90`}
              style={{
                width: `${orbitSize}px`,
                height: `${orbitSize}px`,
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}

        <button
          onClick={() => { onNavigate('search'); onClose(); }}
          className="absolute left-1/2 top-1/2 bg-white text-slate-900 rounded-full flex items-center justify-center
                     shadow-xl transition-all duration-200 ease-out
                     hover:scale-110 hover:shadow-2xl"
          style={{
            width: `${centerSize}px`,
            height: `${centerSize}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Search className="w-6 h-6" />
        </button>

      </div>
    </div>
  );
};
