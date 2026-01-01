import React from 'react';
import { Opportunity, Project } from '@/types/crm';
import { Target, Briefcase, TrendingUp, Clock } from 'lucide-react';

const stageColors: Record<string, string> = {
  Prospect: 'bg-gray-100 text-gray-700',
  Qualified: 'bg-blue-100 text-blue-700',
  Proposal: 'bg-purple-100 text-purple-700',
  Negotiation: 'bg-orange-100 text-orange-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  Discovery: 'bg-gray-100 text-gray-700',
  'Pre-Dev': 'bg-blue-100 text-blue-700',
  Dev: 'bg-purple-100 text-purple-700',
  Contract: 'bg-orange-100 text-orange-700',
  Construction: 'bg-yellow-100 text-yellow-700',
  Operational: 'bg-green-100 text-green-700',
};

interface Props {
  opportunities: Opportunity[];
  projects: Project[];
}

export const ProfileEntities: React.FC<Props> = ({ opportunities, projects }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          My Opportunities ({opportunities.length})
        </h2>
        {opportunities.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No opportunities assigned</p>
        ) : (
          <div className="space-y-3">
            {opportunities.slice(0, 5).map((opp) => (
              <div key={opp.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{opp.name}</p>
                    <p className="text-sm text-gray-500">{opp.companyName}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${stageColors[opp.stage]}`}>
                    {opp.stage}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    ${(opp.value / 1000).toFixed(0)}K
                  </span>
                  {opp.nextActionDate && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(opp.nextActionDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-orange-500" />
          My Projects ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No projects assigned</p>
        ) : (
          <div className="space-y-3">
            {projects.slice(0, 5).map((proj) => (
              <div key={proj.id} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{proj.name}</p>
                    <p className="text-sm text-gray-500">{proj.country} • {proj.capacity} MWp</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[proj.status]}`}>
                    {proj.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
