# Unified Pipeline Toggle: Deals + Projects

## Overview
Merged Projects view into the Opportunities Screen with a seamless toggle switch, allowing users to view either the Sales Pipeline (Deals) or Execution Pipeline (Projects) from the same screen.

## Implementation

### 1. State Management
Added new state variables to `OpportunitiesScreen.tsx`:
```typescript
const [pipelineMode, setPipelineMode] = useState<'deals' | 'projects'>('deals');
const [projects, setProjects] = useState<Project[]>([]);
const [loadingProjects, setLoadingProjects] = useState(false);
```

### 2. Header Layout Update
**Location:** Top row, right-aligned

Modified the hierarchy view section to use `justify-between`:
- **Left:** Me/Team toggle (existing)
- **Right:** NEW Pipeline Switcher

```tsx
<div className="bg-slate-100 p-1 rounded-lg flex items-center">
  <button /* Deals */> ... </button>
  <button /* Projects */> ... </button>
</div>
```

**Styling:**
- Active state: White background with colored text (orange for Deals, blue for Projects)
- Inactive state: Slate text, transparent background
- Smooth transition effects

### 3. Conditional Rendering

#### Stage Filter Pills
Only visible when `pipelineMode === 'deals'`:
- Prospect, Qualified, Proposal, Negotiation, Term Sheet, Won stages
- Hidden when viewing Projects

#### Pipeline Velocity Widget
Only visible when:
- `!selectionMode && pipelineMode === 'deals'`
- Shows stagnation metrics for active deals

#### Main Content Area
Conditional rendering based on `pipelineMode`:

**Deals Mode:**
- Renders `OpportunityCard` list
- Shows filtered opportunities with team badges
- Empty state: "No deals found"

**Projects Mode:**
- Renders `ProjectCard` list
- Shows all projects with account names and partner counts
- Empty state: "No projects found - Projects will appear here once deals are won"
- Loading state with spinner during initial fetch

### 4. Data Fetching
Added `useEffect` hook to fetch projects when switching to projects view:
```typescript
useEffect(() => {
  if (pipelineMode === 'projects' && projects.length === 0) {
    setLoadingProjects(true);
    const data = await fetchProjects();
    setProjects(data);
  }
}, [pipelineMode, projects.length]);
```

Lazy loading strategy: Projects are only fetched when first accessed, not on initial page load.

### 5. Results Count
Dynamic results counter:
- Deals mode: Shows `filtered.length` with milestone/comment/attachment stats
- Projects mode: Shows `projects.length` without additional stats

## User Experience Flow

1. **Default View:** Opens to "Deals" pipeline
2. **Switch to Projects:** Click "Projects" button → Loading spinner → Projects list appears
3. **Switch back to Deals:** Instant transition (data already loaded)
4. **Stage filters:** Only visible in Deals mode
5. **Velocity metrics:** Only visible in Deals mode

## Design Decisions

### Why Right-Aligned Toggle?
- Primary action area (Me/Team) stays left-aligned
- Secondary navigation (pipeline type) on the right
- Maintains visual hierarchy and prevents cognitive overload

### Why Conditional Stage Filters?
- Project stages are different from deal stages (Won, Engineering, Construction, etc.)
- Reduces UI clutter when viewing projects
- Clear separation between sales and execution phases

### Why Lazy Loading?
- Performance optimization: Don't fetch projects until needed
- Most users primarily view deals
- Reduces initial page load time

## Files Modified
1. `src/components/screens/OpportunitiesScreen.tsx` - Main implementation
2. Added imports:
   - `ProjectCard` from crm components
   - `fetchProjects` from API
   - `Project` type from types
   - `FolderKanban` icon from lucide-react

## Testing Checklist
- ✅ Toggle switches between Deals and Projects
- ✅ Stage filters appear only in Deals mode
- ✅ Velocity widget appears only in Deals mode
- ✅ Projects fetch only once on first view
- ✅ Loading state shows while fetching projects
- ✅ Empty states display correctly for both modes
- ✅ Results counter updates based on current mode
- ✅ Build completes without errors

## Future Enhancements
- Add project filtering (by status, owner, etc.)
- Add project-specific metrics widget
- Enable project detail modal with timeline
- Add quick actions for project status updates
