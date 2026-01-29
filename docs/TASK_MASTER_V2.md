# Task Master V2: Nervous System UI

## Overview
Task Master V2 is a complete rebuild with Monday.com style pills and X-style thread visualization, designed as a deal-centric command center for execution velocity.

## Architecture

### Component Structure
```
TaskMaster (Main Modal)
├── Header (Velocity Command + Stats)
├── SegmentedControl (All | Mine | Delegated)
└── Accordion (Deal Groups)
    └── DealAccordionItem
        ├── Deal Header (Name + Stage + Progress + AI Suggest)
        └── TaskRow (Recursive)
            ├── Status Indicator
            ├── Task Content
            ├── Action Buttons
            └── Child Tasks
```

### Visual Design

#### Deal Headers
- **Left Side**: Deal name (bold) + Stage badge (color-coded)
- **Center**: "AI Suggest" button with sparkles icon (stub)
- **Right Side**:
  - Trophy icon + "X% to Jackpot"
  - Green progress bar (gradient from green-400 to green-600)
  - Completion count

#### Task Row States

1. **My Tasks** (isMine = true)
   - White background
   - Blue border (border-blue-300)
   - Bold text
   - Blue "Complete" button with Zap icon
   - Shadow-sm for elevation

2. **Delegated Tasks** (assigned to others)
   - Slate-50 background
   - Slate-200 border
   - Avatar of assignee displayed
   - Normal weight text

3. **Unassigned Tasks** (no assignee)
   - Amber-50 background
   - Amber-200 border
   - "Pickup +5⚡" button (prominent)
   - Hover scale effect

4. **Completed Tasks**
   - Gray-100 background
   - Reduced opacity (60%)
   - Strikethrough text
   - Green checkmark icon

### Thread Visualization
- Uses `border-l-2` with gray color (#cbd5e1)
- Each depth level indents by 16px
- Visual line connects parent to child tasks
- Depth 0 tasks have no indent or border

### Filter Modes

1. **All**: Shows all tasks including unassigned (team view)
2. **Mine**: Shows only tasks assigned to current user
3. **Delegated**: Shows tasks created by user but assigned to others

### Gamification Integration

#### Task Completion (+10 Watts)
```typescript
completeTask(taskId, taskSummary)
├── Update task status to "Completed"
├── Insert +10 Watts to watts_ledger
├── Trigger confetti animation (100 particles)
└── Show success toast
```

#### Task Pickup (+5 Watts)
```typescript
pickupTask(taskId, taskSummary)
├── Assign task to current user
├── Insert +5 Watts to watts_ledger
├── Trigger confetti animation (50 particles)
└── Show success toast
```

### Action Pills

#### Status Pill (For My Tasks)
- Blue button: "Complete ⚡"
- Only visible on tasks assigned to me
- Triggers completion flow on click

#### Pickup Pill (For Unassigned)
- Amber button: "Pickup [+5⚡]"
- Prominent placement with hover scale
- Rewards initiative-taking behavior

#### AI Suggest Pill (Disabled Stub)
- Sparkles icon
- 40% opacity, disabled state
- Tooltip: "Coming soon"
- Ready for Gemini integration

### Task Metadata Pills

All pills use consistent design:
- Small rounded badges
- Border for structure
- Color-coded for context:
  - **Due Date**: Red (overdue), Orange (today), Gray (future)
  - **Priority**: Red (High), Default (Medium)
  - **Assignee**: Avatar + name in white pill

### Database Integration

#### RPC Function
```sql
get_task_threads(p_user_id, p_filter)
```

Returns:
```json
{
  "deal": { "id", "name", "stage", "value", "account_name" },
  "progress": 67,  // calculated percentage
  "total_tasks": 12,
  "completed_tasks": 8,
  "tasks": [...]
}
```

#### Filter Logic
- `all`: All tasks in active deals
- `mine`: `assigned_to_id = p_user_id`
- `delegated`: `created_by = p_user_id AND assigned_to_id != p_user_id`

### Key Features

1. **Deal-Centric View**: Tasks grouped by opportunity
2. **Visual Threading**: Parent-child relationships shown with lines
3. **Smart Filtering**: Three views without data duplication
4. **Gamified Actions**: Watts rewards for completion and pickup
5. **Status Pills**: Monday.com style action buttons
6. **Progress Tracking**: Real-time "% to Jackpot" calculation
7. **AI-Ready**: Stub buttons for future Gemini suggestions
8. **Responsive Design**: Smooth animations and hover states

### User Flows

#### Completing a Task
1. User sees their task (white bg, bold text)
2. Clicks blue "Complete" button
3. Confetti animation triggers
4. Toast: "+10 Watts Earned!"
5. Task moves to completed state
6. Progress bar updates

#### Picking Up Work
1. User sees unassigned task (amber bg)
2. Clicks "Pickup +5⚡" button
3. Task assigns to user
4. Confetti animation (smaller)
5. Toast: "+5 Watts Earned!"
6. Task moves to "Mine" state

#### Filtering Views
1. User switches segmented control
2. List filters in place
3. Progress bars recalculate
4. No page reload needed

### Integration Points

#### Opened From
- **Magic Menu**: Orange circle button (center top)
- **Bottom Nav**: Tasks icon

#### Closes Via
- Close button (X) in header
- Clicking backdrop overlay
- ESC key (handled by modal wrapper)

### Future Enhancements

1. **AI Suggest**: Gemini analysis per deal
   - Suggest next actions based on stage
   - Recommend task priorities
   - Identify blockers

2. **Swipe Gestures**: Mobile optimization
   - Swipe right to complete
   - Swipe left to delegate
   - Pull to refresh

3. **Bulk Actions**: Multi-select mode
   - Select multiple tasks
   - Batch assign/complete
   - Mass priority updates

4. **Smart Notifications**
   - Approaching deadlines
   - Stagnant tasks
   - Team capacity alerts

## Technical Details

### File Location
`src/components/crm/TaskMaster.tsx`

### Dependencies
- `@radix-ui/react-accordion` - Collapsible sections
- `canvas-confetti` - Celebration effects
- `date-fns` - Date utilities
- `sonner` - Toast notifications

### Performance
- Lazy rendering via accordion
- Tree building on client side
- Server-side filtering in RPC
- Optimistic UI updates

### Styling
- Tailwind CSS utility classes
- Gradient backgrounds for visual hierarchy
- Shadow layering for depth
- Smooth transitions (duration-200 to duration-500)

## Design Principles

1. **Visual Clarity**: Color and structure communicate state
2. **Action Proximity**: Buttons near relevant content
3. **Progressive Disclosure**: Accordion hides detail until needed
4. **Immediate Feedback**: Confetti and toasts reward action
5. **Context First**: Deal name always visible in header

The "Nervous System" metaphor reflects how tasks flow through deals, with Task Master serving as the central command for execution velocity.
