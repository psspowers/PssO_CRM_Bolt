import React, { useState, useMemo, useEffect } from 'react';
import { SearchBar, SimpleModal, ProjectForm } from '../crm';
import { ProjectCard } from '../crm/ProjectCard';
import { useAppContext } from '../../contexts/AppContext';
import { Project, ProjectStatus } from '../../types/crm';
import { Loader2, Plus, FolderKanban, Zap, MapPin, ChevronDown, X, ExternalLink, Users, Clock, FileText, Building2, Pencil, Trash2 } from 'lucide-react';

const PROJECT_STATUSES: string[] = ['Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'];

const statusColors: Record<string, string> = {
  'Won': 'bg-emerald-500',
  'Engineering': 'bg-blue-500',
  'Permit/EPC': 'bg-purple-500',
  'Construction': 'bg-orange-500',
  'Commissioning': 'bg-amber-500',
  'Operational': 'bg-green-600',
};

interface ProjectsScreenProps {
  forcedOpenId?: string | null;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({ forcedOpenId }) => {
  const {
    opportunities,
    accounts,
    partners,
    loading,
    currentUser,
    updateOpportunity,
    canCreate,
    canEdit,
    canDelete
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | 'All'>('All');
  const [countryFilter, setCountryFilter] = useState<string>('All');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convert opportunities to projects (post-win opportunities only)
  const projects = useMemo(() => {
    const postWinStages = ['Won', 'Engineering', 'Permit/EPC', 'Construction', 'Commissioning', 'Operational'];
    return opportunities
      .filter(opp => postWinStages.includes(opp.stage))
      .map(opp => ({
        id: opp.id,
        name: opp.name,
        country: 'Unknown',
        capacity: opp.targetCapacity || 0,
        status: opp.stage,
        linkedAccountId: opp.linkedAccountId || opp.accountId,
        ownerId: opp.ownerId,
        clickupLink: opp.clickupLink,
        notes: opp.notes,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
        linkedPartnerIds: []
      }));
  }, [opportunities]);

  useEffect(() => {
    if (forcedOpenId && projects.length > 0) {
      const target = projects.find(p => p.id === forcedOpenId);
      if (target) {
        setSelectedProject(target);
      }
    }
  }, [forcedOpenId, projects]);

  // Get unique countries
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(projects.map(p => p.country))];
    return uniqueCountries.sort();
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.country.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
      const matchesCountry = countryFilter === 'All' || project.country === countryFilter;
      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [projects, searchQuery, statusFilter, countryFilter]);

  // Calculate totals
  const totalCapacity = filteredProjects.reduce((sum, p) => sum + (Number(p.capacity) || 0), 0);
  const statusCounts = PROJECT_STATUSES.reduce((acc, status) => {
    acc[status] = filteredProjects.filter(p => p.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  // Get account name helper
  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  // Get partner count helper
  const getPartnerCount = (partnerIds: string[]) => {
    return partnerIds?.length || 0;
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('All');
    setCountryFilter('All');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'All' || countryFilter !== 'All' || searchQuery !== '';

  // Handle create project - Projects are now created as opportunities with "Won" stage
  const handleCreateProject = async (data: any) => {
    // Projects are managed through opportunities, not supported in this view
    console.log('Create project functionality needs to be implemented through opportunities');
    setShowForm(false);
  };

  // Handle update project
  const handleUpdateProject = async (data: any) => {
    if (!editingProject) return;
    await updateOpportunity(editingProject.id, {
      stage: data.status,
      notes: data.notes,
      clickupLink: data.clickupLink
    });
    setEditingProject(null);
    setShowForm(false);
    setSelectedProject(null);
  };

  // Handle delete project - Projects can't be deleted, only opportunities
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to remove this project? This will move it back to opportunities.')) return;

    setIsDeleting(true);
    try {
      // Move back to opportunities by changing stage to Lost
      await updateOpportunity(projectId, { stage: 'Lost' });
      setSelectedProject(null);
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open edit form
  const handleEditClick = (project: any) => {
    setEditingProject(project);
    setShowForm(true);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="text-slate-500">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{filteredProjects.length}</p>
              <p className="text-sm text-slate-500">Total Projects</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{totalCapacity.toFixed(1)} MW</p>
              <p className="text-sm text-slate-500">Total Capacity</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{statusCounts['Operational'] || 0}</p>
              <p className="text-sm text-slate-500">Operational</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{countries.length}</p>
              <p className="text-sm text-slate-500">Countries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Pipeline by Status</h3>
          <span className="text-sm text-slate-500">{filteredProjects.length} projects</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
          {PROJECT_STATUSES.map(status => {
            const count = statusCounts[status] || 0;
            const percentage = filteredProjects.length > 0 ? (count / filteredProjects.length) * 100 : 0;
            if (percentage === 0) return null;
            return (
              <div
                key={status}
                className={`${statusColors[status]} transition-all`}
                style={{ width: `${percentage}%` }}
                title={`${status}: ${count} projects`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3 mt-3">
          {PROJECT_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
              className={`flex items-center gap-1.5 lg:gap-2 text-[10px] lg:text-xs px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-lg transition-all font-medium ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full ${statusColors[status]}`} />
              <span>{status}</span>
              <span className="font-bold">{statusCounts[status] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search projects by name or country..."
            />
          </div>
          {/* Add Project Button - Desktop */}
          {canCreate() && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowForm(true);
              }}
              className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2.5 bg-orange-500 text-white rounded-xl text-xs lg:text-sm font-semibold hover:bg-orange-600 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
          {/* Country Filter */}
          <div className="relative flex-shrink-0">
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg lg:rounded-xl px-3 lg:px-4 py-2 lg:py-2.5 pr-8 lg:pr-10 text-xs lg:text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 whitespace-nowrap"
            >
              <option value="All">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 lg:right-3 top-1/2 -translate-y-1/2 w-3 h-3 lg:w-4 lg:h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 bg-slate-100 text-slate-600 rounded-lg lg:rounded-xl text-xs lg:text-sm font-medium hover:bg-slate-200 transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 lg:w-4 lg:h-4" />
              <span>Clear</span>
            </button>
          )}

          {/* Add Project Button - Mobile */}
          {canCreate() && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowForm(true);
              }}
              className="sm:hidden flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors flex-shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">No projects found</h3>
          <p className="text-slate-500 text-sm mb-4">
            {hasActiveFilters 
              ? 'Try adjusting your filters to see more results.'
              : 'Projects will appear here once added.'}
          </p>
          {canCreate() && !hasActiveFilters && (
            <button
              onClick={() => {
                setEditingProject(null);
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              accountName={getAccountName(project.linkedAccountId)}
              partnerCount={getPartnerCount(project.linkedPartnerIds)}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && !showForm && (
        <SimpleModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          title={selectedProject.name}
        >
          <div className="space-y-6">
            {/* Status Badge & Actions */}
            <div className="flex items-center justify-between">
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                selectedProject.status === 'Operational' ? 'bg-green-50 text-green-600 border-green-200' :
                selectedProject.status === 'Commissioning' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                selectedProject.status === 'Construction' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                selectedProject.status === 'Permit/EPC' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                selectedProject.status === 'Engineering' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                selectedProject.status === 'Won' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {selectedProject.status}
              </div>
              <div className="flex items-center gap-2">
                {selectedProject.clickupLink && (
                  <a
                    href={selectedProject.clickupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ClickUp
                  </a>
                )}
                {canEdit(selectedProject.ownerId) && (
                  <button
                    onClick={() => handleEditClick(selectedProject)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {canDelete(selectedProject.ownerId) && (
                  <button
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    disabled={isDeleting}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-xs text-slate-500 uppercase font-bold">Capacity</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{(selectedProject.capacity || 0).toFixed(3)} MW</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 uppercase font-bold">Location</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{selectedProject.country}</p>
              </div>
            </div>

            {/* Account */}
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-500 uppercase font-bold">Linked Account</span>
              </div>
              <p className="text-lg font-semibold text-slate-900">{getAccountName(selectedProject.linkedAccountId)}</p>
            </div>

            {/* Partners */}
            {selectedProject.linkedPartnerIds && selectedProject.linkedPartnerIds.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-500 uppercase font-bold">Partners ({selectedProject.linkedPartnerIds.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.linkedPartnerIds.map(partnerId => {
                    const partner = partners.find(p => p.id === partnerId);
                    return partner ? (
                      <span key={partnerId} className="px-3 py-1 bg-white rounded-lg text-sm text-slate-700 border border-slate-200">
                        {partner.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedProject.notes && (
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-500 uppercase font-bold">Notes</span>
                </div>
                <p className="text-slate-700">{selectedProject.notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created: {new Date(selectedProject.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated: {new Date(selectedProject.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </SimpleModal>
      )}

      {/* Project Form Modal */}
      {showForm && (
        <SimpleModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProject(null);
          }}
          title={editingProject ? 'Edit Project' : 'New Project'}
          maxWidth="lg"
        >
          <ProjectForm
            project={editingProject || undefined}
            accounts={accounts}
            partners={partners}
            currentUserId={currentUser?.id}
            onSave={editingProject ? handleUpdateProject : handleCreateProject}
            onCancel={() => {
              setShowForm(false);
              setEditingProject(null);
            }}
          />
        </SimpleModal>
      )}
    </div>
  );
};
