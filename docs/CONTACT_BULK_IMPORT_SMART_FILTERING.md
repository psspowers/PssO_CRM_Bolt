# Contact Bulk Import - Smart Deal Filtering

## Overview
Implemented intelligent filtering for bulk contact imports to ensure only contacts with active deals appear in The Pulse "For You" feed.

## Implementation Details

### 1. Smart Deal Lookup
When loading the internal feed in PulseScreen, the system now:
- Identifies all contact creation logs
- Extracts their associated account IDs
- Queries the database for active opportunities linked to those accounts
- Filters: `stage != 'Won' AND stage != 'Lost'`

### 2. Intelligent Filtering Logic
Contacts are displayed in "For You" tab only if:
- ✅ Contact has an existing account (account_id is not null)
- ✅ That account has at least one active opportunity/deal
- ❌ Contacts without accounts are filtered out
- ❌ Contacts whose accounts have no active deals are filtered out
- ❌ Contacts whose accounts only have Won/Lost deals are filtered out

### 3. Display Format
Contact creations now display with proper deal context:

```
Line 1: Deal Name | 150 MW [link icon]
Line 2: John Doe | Create | 2h
Line 3: Created new Contact: Jane Smith
```

### 4. Link Icon Functionality
- The link icon (ExternalLink) on contact creation items now points directly to the associated opportunity/deal
- Clicking the icon navigates to the Opportunities screen
- This allows users to quickly jump from the contact creation notification to the relevant deal

## Code Changes

### Modified File: `src/components/screens/PulseScreen.tsx`

#### A. Added Contact-to-Deal Mapping (lines 735-802)
```typescript
const contactAccountIds: string[] = [];
const accountToContactMap = new Map<string, string>();
const accountToOpportunityMap = new Map<string, { id: string; name: string; target_capacity: number | null }>();

// Collect account IDs from contact creations
if (isContactCreation && logDetails.account_id) {
  contactAccountIds.push(logDetails.account_id);
  accountToContactMap.set(log.id, logDetails.account_id);
}

// Query active opportunities for those accounts
if (contactAccountIds.length > 0) {
  const { data: accountOpportunities } = await supabase
    .from('opportunities')
    .select('id, name, target_capacity, linked_account_id')
    .in('linked_account_id', contactAccountIds)
    .neq('stage', 'Won')
    .neq('stage', 'Lost')
    .order('created_at', { ascending: false });

  // Build mapping
  accountOpportunities.forEach((opp) => {
    if (!accountToOpportunityMap.has(opp.linked_account_id)) {
      accountToOpportunityMap.set(opp.linked_account_id, {
        id: opp.id,
        name: opp.name,
        target_capacity: opp.target_capacity
      });
    }
  });
}
```

#### B. Filter Contacts Without Active Deals (lines 843-851)
```typescript
if (isContactCreation && logDetails.account_id) {
  const opportunity = accountToOpportunityMap.get(logDetails.account_id);
  if (!opportunity) {
    return; // Skip this contact - no active deal
  }
  logDealName = opportunity.name;
  logTargetMW = opportunity.target_capacity;
  logOpportunityId = opportunity.id;
}
```

#### C. Pass Opportunity ID to Feed Items (line 876)
```typescript
rawFeed.push({
  // ... other fields
  opportunity_id: logOpportunityId
});
```

#### D. Update formatFeedItem for Contact Links (lines 443, 480-481)
```typescript
const isContactCreation = entityType === 'Contact' && rawItem.opportunity_id;

return {
  // ... other fields
  relatedToId: isContactCreation ? rawItem.opportunity_id : (details.entity_id || parsedDetails?.id),
  relatedToType: isContactCreation ? 'Opportunity' : (details.entity_type || entityType),
};
```

## Impact on Other Imports

✅ **No Impact on Other Bulk Imports**
- Accounts: Continue to display normally
- Opportunities: Continue to display normally
- Partners: Continue to display normally
- Projects: Continue to display normally
- Activities: Continue to display normally

This filtering only applies to contact creation logs and does not affect any other entity types.

## Database Query Optimization

The implementation uses efficient queries:
1. Single query to fetch all contact account IDs
2. Single batch query to fetch opportunities for all accounts
3. In-memory mapping for O(1) lookups
4. No N+1 query problems

## Testing Checklist

- [ ] Import contacts with accounts that have active deals → Should appear in feed
- [ ] Import contacts with accounts that have only Won deals → Should NOT appear
- [ ] Import contacts with accounts that have only Lost deals → Should NOT appear
- [ ] Import contacts without accounts → Should NOT appear
- [ ] Click link icon on contact → Should navigate to opportunity
- [ ] Deal name and MW display correctly
- [ ] User name, timestamp display correctly
- [ ] Other bulk imports (accounts, opportunities) still work

## Benefits

1. **Reduced Noise**: Users only see relevant contacts connected to active deals
2. **Better Context**: Deal information provides immediate context for why the contact matters
3. **Quick Navigation**: Link icon enables fast access to the related opportunity
4. **Smart Filtering**: Automatically excludes closed deals (Won/Lost)
5. **Scalable**: Efficient queries prevent performance degradation with large imports
