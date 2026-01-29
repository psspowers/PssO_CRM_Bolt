import React, { useState } from 'react';
import { ZaapScreenTwo } from '@/components/screens/ZaapScreenTwo';
import { Header, BottomNav, QuickAddModal } from '@/components/crm';
import { useAppContext } from '@/contexts/AppContext';

const ZaapTwo: React.FC = () => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { createAccount, createOpportunity, createContact, createPartner } = useAppContext();

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <Header
        onQuickAdd={() => setShowQuickAdd(true)}
        activeTab="tasks"
        onSearchClick={() => {}}
      />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          <ZaapScreenTwo />
        </div>
      </main>

      <BottomNav activeTab="tasks" onTabChange={() => {}} />

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAddAccount={createAccount}
        onAddOpportunity={createOpportunity}
        onAddContact={createContact}
        onAddPartner={createPartner}
      />
    </div>
  );
};

export default ZaapTwo;
