import React from 'react';
import { ZaapScreen } from '@/components/screens/ZaapScreen';
import { Header, BottomNav } from '@/components/crm';

const Zaap: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header
        onQuickAdd={() => {}}
        activeTab="tasks"
        onSearchClick={() => {}}
      />

      <div className="flex-1 overflow-y-auto">
        <ZaapScreen />
      </div>

      <BottomNav activeTab="tasks" onTabChange={() => {}} />
    </div>
  );
};

export default Zaap;
