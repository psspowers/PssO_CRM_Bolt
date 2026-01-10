# QuickAddModal Pre-fill Enhancement

## Overview
Upgraded `QuickAddModal.tsx` to support pre-filling form data from external sources, enabling deep integration with other features like The Pulse screen's "Create Task" action.

## Changes Made

### 1. Interface Update
Added optional `initialData` prop to `QuickAddModalProps`:

```typescript
interface QuickAddModalProps {
  // ... existing props
  initialData?: {
    mode?: 'activity' | 'entity';
    isTask?: boolean;
    summary?: string;
    details?: string;
    relateToType?: 'Account' | 'Opportunity';
    relateToId?: string;
  };
}
```

### 2. Initialization Logic
Updated the `useEffect` hook to handle three scenarios:

**Scenario 1: Opening with Initial Data**
- Pre-fills form fields from `initialData` prop
- Sets mode (activity/entity)
- Sets task flag
- Populates summary and details
- Links to related entity if provided

**Scenario 2: Opening without Initial Data**
- Resets to default values
- Mode: 'activity'
- Task: false
- Empty fields

**Scenario 3: Closing Modal**
- Complete reset of all form state
- Clears both activity and entity forms

```typescript
useEffect(() => {
  if (isOpen) {
    if (initialData) {
      // Pre-fill from props
      setMode(initialData.mode || 'activity');
      setIsTask(initialData.isTask || false);
      setSummary(initialData.summary || '');
      setDetails(initialData.details || '');
      if (initialData.relateToType) setRelateToType(initialData.relateToType);
      if (initialData.relateToId) setRelateToId(initialData.relateToId);
    } else {
      // Reset to defaults
      // ...
    }
  } else {
    // Complete reset when closing
    // ...
  }
}, [isOpen, initialData]);
```

## Usage Examples

### Example 1: Create Task from Market News
```typescript
// In PulseScreen or similar component
const handleCreateTaskFromNews = (news: MarketNews) => {
  setQuickAddInitialData({
    mode: 'activity',
    isTask: true,
    summary: `Follow up on: ${news.title}`,
    details: news.summary || '',
    relateToType: news.related_account_id ? 'Account' : undefined,
    relateToId: news.related_account_id || undefined,
  });
  setShowQuickAdd(true);
};
```

### Example 2: Log Activity for Specific Deal
```typescript
const handleLogActivity = (opportunityId: string, opportunityName: string) => {
  setQuickAddInitialData({
    mode: 'activity',
    isTask: false,
    summary: `Meeting with ${opportunityName}`,
    relateToType: 'Opportunity',
    relateToId: opportunityId,
  });
  setShowQuickAdd(true);
};
```

### Example 3: Normal Usage (No Pre-fill)
```typescript
// Opens with empty form, defaults to activity mode
<QuickAddModal
  isOpen={showQuickAdd}
  onClose={() => setShowQuickAdd(false)}
  onAdd={handleAddActivity}
  entities={entities}
  users={users}
  // No initialData - uses defaults
/>
```

## Benefits

1. **Reduced Friction**: Users don't need to re-type information when creating tasks from context
2. **Context Preservation**: Automatically links tasks/activities to the correct entities
3. **Workflow Integration**: Enables seamless cross-feature workflows (e.g., Pulse → Task)
4. **Backward Compatible**: Existing usage without `initialData` continues to work exactly as before

## Technical Details

- **State Management**: Uses existing React state, no additional state management needed
- **Type Safety**: Full TypeScript support with optional prop pattern
- **Performance**: No performance impact - initialization happens on modal open
- **Validation**: All existing validation rules still apply to pre-filled data

## Testing Recommendations

1. Open modal without initialData - should show empty form
2. Open modal with partial initialData - should fill provided fields only
3. Open modal with complete initialData - should fill all fields
4. Close and reopen modal - should reset properly
5. Submit form with pre-filled data - should work as normal
6. Switch between modes - should maintain initialData when reopening

## Future Enhancements

1. Support pre-filling entity forms (Account/Opportunity)
2. Add `activityType` to initialData for pre-selecting activity icons
3. Support `assignedToId` for task pre-assignment
4. Add `priority` and `dueDate` to initialData
