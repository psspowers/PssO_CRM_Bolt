import React from 'react';
import { ZaapScreen } from '@/components/screens/ZaapScreen';
import { Header, BottomNav } from '@/components/crm';

const Zaap: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-y-auto">
      <Header
        onQuickAdd={() => {}}
        activeTab="tasks"
        onSearchClick={() => {}}
      />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto w-full">
          <ZaapScreen />
        </div>
      </main>

      <BottomNav activeTab="tasks" onTabChange={() => {}} />
    </div>
  );
};

export default Zaap;
