# Smart Bulk Import Wizard - Feature Guide

## Overview
The BulkImportWizard now acts as an intelligent translator that automatically maps, cleans, and links CSV data to your database structure.

## Key Features Implemented

### 1. Smart Column Mapping

The wizard automatically recognizes and maps various column header formats:

**Opportunities:**
- `Location` / `Site` / `City` → `location`
- `Task ID` / `Clickup ID` / `ClickUp Link` → `clickup_link`
- `Capacity (MW)` / `Capacity MW` / `MW` → `target_capacity`
- `Max Capacity` / `Customer Max` → `max_capacity`
- `PPA Year` / `PPA Term` → `ppa_term`
- `EPC Cost` / `Construction Cost` → `epc_cost`
- `Probability` / `Probability (%)` / `Win Probability` → `manual_probability`
- `Company Name` / `Company` → `company_name`
- `Partner` / `Partner Name` / `EPC` → Partner linking
- `Owner` / `Leader` / `Assigned To` → User linking

**Partners:**
- `Owner` / `Leader` / `Account Manager` → User linking

### 2. Fuzzy Logic - Stage Normalization

Automatically fixes common typos and variations in Stage values:

| CSV Input | Database Output |
|-----------|----------------|
| "Negotations" / "Negotiaton" | "Negotiation" |
| "Presentation" | "Proposal" |
| "Hold" | "Prospect" |
| "TERMSHEET" / "Term sheet" | "Term Sheet" |
| "Qualified Lead" | "Qualified" |
| "Closed" | "Won" |
| "Dead" | "Lost" |

### 3. Percentage Parsing

Smart handling of probability values:
- `"75%"` → `75`
- `"0.75"` → `75` (auto-converts decimals to percentages)
- `"100%"` → `100`

### 4. User Lookup & Matching

**How it works:**
- Fetches all users from `crm_users` on wizard load
- Uses fuzzy name matching (case-insensitive, handles typos)
- Matching thresholds:
  - **95%+** = Exact match (green badge)
  - **75-94%** = High confidence (blue badge)
  - **50-74%** = Medium confidence (yellow badge)
  - **Below 50%** = Low confidence (orange badge)

**Fallback behavior:**
- If no user match found, assigns to **current logged-in user** with a warning
- User can manually change the assignment in the linking step

### 5. Relationship Linking

**Opportunities can link to:**
- **Accounts** (customers/clients)
- **Partners** (EPC contractors, financiers)
- **Users** (opportunity owners/leaders)

**Partners can link to:**
- **Users** (partner managers)

**Contacts can link to:**
- **Accounts** (employer)
- **Partners**

## Import Workflow

1. **Select Entity Type** - Choose what to import
2. **Upload File** - Drag & drop CSV/Excel
3. **Map Columns** - Auto-mapping applied, review and adjust
4. **Link Entities** - Review fuzzy matches, adjust as needed
5. **Preview** - Final validation check
6. **Import** - Data imported with all transformations applied

## CSV Template Examples

### Opportunity Import Template

```csv
Opportunity Name,Company Name,Value (THB),Stage,Priority,Max Capacity,Target Capacity (MW),PPA Year,EPC Cost,Probability,RE Type,Sector,Industry,Location,ClickUp Link,Next Action,Notes,Account Name,Partner,Leader
ABC Solar Project,ABC Manufacturing,15000000,Qualified,High,3.0,2.5,25,12000000,75%,Solar - Rooftop,Industrial,Manufacturing,Bangkok,https://app.clickup.com/t/123,Site visit scheduled,Large rooftop area,ABC Manufacturing,Solar Solutions Ltd,Chaweng
XYZ Green Energy,XYZ Foods,8000000,Negotations,Medium,1.5,1.0,20,6000000,60%,Solar - Ground,Agriculture,Farming,Chiang Mai,,Send proposal,Ground mount opportunity,XYZ Foods,,Jane
```

### Partner Import Template

```csv
Partner Name,Company Legal Name,Type,Region,Country,Email,Phone,Notes,Owner
Solar Solutions Ltd,Solar Solutions Limited,EPC,Southeast Asia,Thailand,info@solarsolutions.com,+66-2-123-4567,EPC partner,John Smith
Green Energy Corp,Green Energy Corporation,Financier,Asia Pacific,Singapore,contact@greenenergy.sg,+65-6789-0123,Financing partner,Jane Doe
```

## Data Validation & Error Handling

### Automatic Fixes:
- Stage typos normalized
- Percentage formats standardized
- Number formats cleaned (removes commas, currency symbols)
- Empty required fields flagged

### Error Indicators:
- Red badge = Validation error (required field missing, invalid format)
- Yellow badge = Warning (low confidence match)
- Green badge = Valid & ready to import

## Tips for Best Results

1. **Use consistent naming** for companies/people across CSVs
2. **Include Owner/Leader columns** for auto-assignment
3. **Stage values** can be rough - wizard will clean them
4. **Percentages** can be in any format (75%, 0.75, 75)
5. **Review linking step** carefully - verify fuzzy matches before importing

## Keyboard Shortcuts (Coming Soon)
- `Ctrl+I` - Open Import Wizard
- `Enter` - Proceed to next step
- `Esc` - Close wizard

## Notes
- All imports are **validated before execution**
- Invalid rows are **skipped automatically**
- **Rollback not supported** - test with small batches first
- Maximum file size: **10MB**
- Supported formats: **CSV, XLSX, XLS**
