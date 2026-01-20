import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Activity as ActivityIcon, Building2, TrendingUp, Zap, FileText, MessageSquare, CheckSquare, AlertTriangle, Cpu, Calculator } from 'lucide-react';
import { DealNotes } from './DealNotes';
import { DealDocuments } from './DealDocuments';
import { DealTasks } from './DealTasks';
import { DealPulse } from './DealPulse';
import { InvestmentModeler } from './InvestmentModeler';
import { CreditRiskHub } from './CreditRiskHub';
import { LoadAnalyzer } from './LoadAnalyzer';
import { MediaVault } from './MediaVault';
import { Activity, Contact, Account, Partner, Relationship } from '../../types/crm';

interface DetailModalUser { id: string; name: string; avatar: string; }

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  entityId: string;
  entityType: 'Contact' | 'Account' | 'Partner' | 'Opportunity';
  clickupLink?: string;
  children: React.ReactNode;
  velocityContent?: React.ReactNode;
  activities: Activity[];
  users: DetailModalUser[];
  contacts?: Contact[];
  accounts?: Account[];
  partners?: Partner[];
  relationships?: Relationship[];
  accountId?: string | null;
}

type Tab = 'overview' | 'velocity' | 'activity' | 'pulse';
type VelocityTab = 'risk' | 'tech' | 'math';
type ActivityTab = 'notes' | 'tasks' | 'dox';

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen, onClose, title, subtitle, entityId, entityType, clickupLink, children,
  velocityContent, activities, users, contacts = [], accounts = [], partners = [], relationships = [],
  accountId
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [velocityTab, setVelocityTab] = useState<VelocityTab>('risk');
  const [activityTab, setActivityTab] = useState<ActivityTab>('notes');

  const showPulse = (entityType === 'Opportunity' || entityType === 'Account');
  const showVelocity = entityType === 'Opportunity' && velocityContent;

  useEffect(() => {
    setActiveTab('overview');
    setVelocityTab('risk');
    setActivityTab('notes');
  }, [entityId]);

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    ...(showVelocity ? [{ id: 'velocity' as Tab, label: 'Velocity', icon: TrendingUp }] : []),
    { id: 'activity', label: 'Activity', icon: ActivityIcon },
    ...(showPulse ? [{ id: 'pulse' as Tab, label: 'Pulse', icon: Zap }] : []),
  ];

  const velocitySubTabs: { id: VelocityTab; label: string; icon: React.ElementType }[] = [
    { id: 'risk', label: 'Risk', icon: AlertTriangle },
    { id: 'tech', label: 'Tech', icon: Cpu },
    { id: 'math', label: 'Math', icon: Calculator },
  ];

  const activitySubTabs: { id: ActivityTab; label: string; icon: React.ElementType }[] = [
    { id: 'notes', label: 'Notes', icon: MessageSquare },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'dox', label: 'Dox', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 id="detail-modal-title" className="font-semibold text-gray-900 truncate">{title}</h2>
              {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {clickupLink && (
                <a href={clickupLink} target="_blank" rel="noopener noreferrer"
                  className="p-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  aria-label="Open in ClickUp">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-lg" aria-label="Close modal"><X className="w-5 h-5" /></button>
            </div>
          </div>
          {/* Main Tabs - Row 1 */}
          <div className="flex gap-1 mt-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Sub-Tabs - Row 2 (Pill Style) */}
          {activeTab === 'velocity' && showVelocity && (
            <div className="flex gap-2 mt-2 px-1">
              {velocitySubTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setVelocityTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    velocityTab === id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="flex gap-2 mt-2 px-1">
              {activitySubTabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActivityTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activityTab === id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto pb-32">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-4">{children}</div>
          )}

          {/* Velocity Tab with Sub-Tabs */}
          {activeTab === 'velocity' && showVelocity && (
            <div className="p-4">
              {velocityTab === 'risk' && (
                <CreditRiskHub opportunityId={entityId} />
              )}
              {velocityTab === 'tech' && (
                <div className="space-y-6">
                  <LoadAnalyzer opportunityId={entityId} />
                  <MediaVault
                    entityId={entityId}
                    entityType={entityType.toLowerCase() as 'partner' | 'account' | 'contact' | 'opportunity' | 'project'}
                  />
                </div>
              )}
              {velocityTab === 'math' && (
                <InvestmentModeler opportunityId={entityId} />
              )}
            </div>
          )}

          {/* Activity Tab with Sub-Tabs */}
          {activeTab === 'activity' && (
            <div className="p-4">
              {activityTab === 'notes' && (
                <DealNotes
                  entityId={entityId}
                  entityType={entityType as 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project'}
                />
              )}
              {activityTab === 'tasks' && (
                <DealTasks entityId={entityId} />
              )}
              {activityTab === 'dox' && (
                <DealDocuments
                  entityId={entityId}
                  entityType={entityType as 'Partner' | 'Account' | 'Contact' | 'Opportunity' | 'Project'}
                />
              )}
            </div>
          )}

          {/* Pulse Tab */}
          {activeTab === 'pulse' && showPulse && (
            <DealPulse accountId={accountId} />
          )}
        </div>
      </div>
    </div>
  );
};
