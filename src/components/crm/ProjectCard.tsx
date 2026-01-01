import React from 'react';
import { FolderKanban, Zap, MapPin, ChevronRight, Users, Clock } from 'lucide-react';
import { Project } from '../../types/crm';

interface ProjectCardProps {
  project: Project;
  accountName?: string;
  partnerCount: number;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  'Won': 'bg-slate-100 text-slate-600 border-slate-200',
  'Engineering': 'bg-blue-50 text-blue-600 border-blue-200',
  'Permit/EPC': 'bg-amber-50 text-amber-600 border-amber-200',
  'Construction': 'bg-orange-50 text-orange-600 border-orange-200',
  'Commissioning': 'bg-purple-50 text-purple-600 border-purple-200',
  'Operational': 'bg-emerald-50 text-emerald-600 border-emerald-200',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, accountName, partnerCount, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 p-5 text-left shadow-sm hover:shadow-lg hover:border-orange-200 transition-all group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500">{accountName || 'Unlinked Account'}</p>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${statusColors[project.status] || 'bg-gray-100'}`}>
          {project.status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Capacity</p>
            <p className="text-sm font-bold text-slate-900">{project.capacity} MW</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Location</p>
            <p className="text-sm font-medium text-slate-700">{project.country}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          {partnerCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md">
              <Users className="w-3 h-3" /> {partnerCount} Partners
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" /> Updated {new Date(project.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transition-colors" />
      </div>
    </button>
  );
};
