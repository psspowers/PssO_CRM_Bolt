import React from 'react';
import { ZaapScreenTwo } from '@/components/screens/ZaapScreenTwo';
import { Header, BottomNav } from '@/components/crm';

const ZaapTwo: React.FC = () => {
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <Header
        onQuickAdd={() => {}}
        activeTab="tasks"
        onSearchClick={() => {}}
      />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          <ZaapScreenTwo />
        </div>
      </main>

      <BottomNav activeTab="tasks" onTabChange={() => {}} />
    </div>
  );
};

export default ZaapTwo;
