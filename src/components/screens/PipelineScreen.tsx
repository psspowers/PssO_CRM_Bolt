import React, { useState } from 'react';
import { OpportunitiesScreen } from './OpportunitiesScreen';
import { ProjectsScreen } from './ProjectsScreen';
import { Target, FolderKanban } from 'lucide-react';

interface PipelineScreenProps {
  forcedOpenId?: string | null;
  forcedStageFilter?: string | null;
}

export const PipelineScreen: React.FC<PipelineScreenProps> = ({ forcedOpenId, forcedStageFilter }) => {
  const [activeView, setActiveView] = useState<'opportunities' | 'projects'>('opportunities');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-2 p-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="inline-flex rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setActiveView('opportunities')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeView === 'opportunities'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4" />
            Opportunities
          </button>
          <button
            onClick={() => setActiveView('projects')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeView === 'projects'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Projects
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeView === 'opportunities' ? (
          <OpportunitiesScreen forcedOpenId={forcedOpenId} forcedStageFilter={forcedStageFilter} />
        ) : (
          <ProjectsScreen forcedOpenId={forcedOpenId} />
        )}
      </div>
    </div>
  );
};
