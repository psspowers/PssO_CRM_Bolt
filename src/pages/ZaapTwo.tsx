import React, { useState } from 'react';
import { ZaapScreenTwo } from '@/components/screens/ZaapScreenTwo';
import { OpportunitiesScreen, PulseScreen, MeScreen } from '@/components/screens';
import { Header, BottomNav, QuickAddModal } from '@/components/crm';
import { useAppContext } from '@/contexts/AppContext';

type Tab = 'home' | 'opportunities' | 'pulse' | 'me';

const ZaapTwo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { createAccount, createOpportunity, createContact, createPartner } = useAppContext();

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <ZaapScreenTwo />;
      case 'opportunities':
        return <OpportunitiesScreen />;
      case 'pulse':
        return <PulseScreen />;
      case 'me':
        return <MeScreen />;
      default:
        return <ZaapScreenTwo />;
    }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
      <Header
        onQuickAdd={() => setShowQuickAdd(true)}
        activeTab={activeTab}
        onSearchClick={() => {}}
      />

      <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          {renderScreen()}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} />

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
