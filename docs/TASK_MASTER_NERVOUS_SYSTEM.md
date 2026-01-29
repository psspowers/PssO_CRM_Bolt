# Task Master: "Nervous System" Edition

## Overview
The Task Master has been rebuilt as a "Unified Deal Stream" that groups tasks by Deal, shows visual threads, and drives gamification through the Watts system.

## Architecture

### UI Components
- **Segmented Filter**: Clean filter control (All | Mine | Delegated) that filters the unified list in place
- **Accordion Deal Groups**: Each deal is an expandable accordion item with rich headers
- **Visual Threading**: Vertical gray lines connect parent tasks to child tasks, creating a visual hierarchy
- **Gamification Hooks**: Integrated Watts rewards for task completion (+10W) and pickup (+5W)

### Deal Header Design
Each deal header includes:
- **Left Side**:
  - Target icon
  - Deal name (bold, white text)
  - Stage badge (colored)
  - Account name
  - AI Suggest button (✨ stub for future Gemini integration)

- **Right Side**:
  - Progress percentage with trophy icon: "X% to Jackpot"
  - Visual progress bar (green gradient)
  - Task completion count

### Task Row Styling

#### Task States
1. **My Tasks** (Assigned to me):
   - White background
   - Bold text
   - Blue "In Progress" badge
   - Blue border highlight

2. **Delegated Tasks** (I created, assigned to others):
   - Gray background
   - Avatar of assignee displayed
   - Normal weight text

3. **Unassigned Tasks**:
   - Amber/yellow background
   - "Pickup (+5⚡)" button
   - Emphasizes available work

4. **Completed Tasks**:
   - Gray background with reduced opacity
   - Strikethrough text
   - Green checkmark icon

### Visual Threading
- Parent tasks at depth 0 (no indent)
- Child tasks show vertical gray lines connecting to parent
- Lines connect through multiple levels
- Thread depth visually represents task hierarchy

### Gamification Features

#### Task Completion
- Click checkbox to toggle completion
- Triggers confetti animation
- Awards +10 Watts
- Toast notification: "+10 Watts Earned!"
- Updates `watts_ledger` table

#### Task Pickup
- Available on unassigned tasks in "All" view
- Click "Pickup (+5⚡)" button
- Assigns task to current user
- Awards +5 Watts
- Confetti animation
- Toast notification: "+5 Watts Earned!"

### Filter Modes

1. **All Tasks**: Shows all tasks across all deals (including unassigned)
2. **Mine**: Shows only tasks assigned to me
3. **Delegated**: Shows only tasks I created and assigned to others

### Database Function
`get_task_threads(p_user_id, p_filter)`

Returns JSON structure:
```json
[
  {
    "deal": {
      "id": "uuid",
      "name": "Deal Name",
      "stage": "Negotiation",
      "value": 1000000,
      "account_name": "Acme Corp"
    },
    "progress": 67,
    "total_tasks": 12,
    "completed_tasks": 8,
    "tasks": [
      {
        "id": "uuid",
        "summary": "Task name",
        "details": "Task description",
        "status": "Pending|In Progress|Completed|Cancelled",
        "priority": "Low|Medium|High",
        "dueDate": "2026-01-29T00:00:00Z",
        "assignedToId": "uuid|null",
        "assigneeName": "John Doe",
        "assigneeAvatar": "url|null",
        "parentTaskId": "uuid|null",
        "depth": 0,
        "createdAt": "2026-01-29T00:00:00Z"
      }
    ]
  }
]
```

### Key Features

1. **Real-time Progress Tracking**: Each deal shows completion percentage
2. **Visual Hierarchy**: Thread lines show parent-child relationships
3. **Smart Filtering**: Three views (All/Mine/Delegated) filter the same dataset
4. **Gamified Actions**: Every action earns Watts
5. **AI-Ready**: Stub for future AI suggestions per deal
6. **Responsive Design**: Smooth animations and hover states
7. **Status Indicators**: Due dates, priorities, overdue warnings
8. **Avatar Display**: Shows who's working on what

### Future Enhancements
- **AI Suggest**: Will use Gemini to analyze deal context and suggest next actions
- **Swipe Gestures**: Mobile swipe-to-complete functionality
- **Bulk Actions**: Select multiple tasks for batch operations
- **Smart Notifications**: Alert on approaching deadlines
- **Task Templates**: Quick-create common task sequences
- **Team Capacity**: Show team workload distribution

## Technical Notes

### Database Migration
File: `supabase/migrations/20260129_fix_avatar_column.sql`
- Fixed avatar column reference from `avatar_url` to `avatar`
- Ensures RPC returns correct assignee avatar data

### Component Location
File: `src/components/crm/TaskMaster.tsx`

### Dependencies
- `@radix-ui/react-accordion` - Collapsible deal sections
- `canvas-confetti` - Celebration animations
- `date-fns` - Date formatting and comparisons
- Custom `SegmentedControl` - Filter UI

### Performance
- Uses accordion to lazy-render only expanded deals
- Filters applied server-side in RPC function
- Tree building happens client-side for flexibility

## Usage

The Task Master is accessed via the "Tasks" screen in the main navigation. Users can:
1. Switch between All/Mine/Delegated views
2. Expand/collapse deals to focus on specific opportunities
3. Complete tasks by clicking checkboxes
4. Pick up unassigned work to earn bonus Watts
5. View task hierarchies with visual threading
6. See real-time progress toward deal completion

The "Nervous System" metaphor reflects how tasks flow through the organization, with the Task Master serving as the central command center for execution velocity.
