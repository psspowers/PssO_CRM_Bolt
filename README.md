# PSS Orange CRM

Enterprise CRM system for renewable energy sales and project management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with 2FA
- **Storage**: Supabase Storage

## 📊 Features

### Core CRM
- **Accounts**: Company/organization management
- **Opportunities**: Sales pipeline (Prospect → Won/Lost)
- **Projects**: Post-contract project tracking
- **Contacts**: Individual people at accounts/partners
- **Partners**: EPC contractors and developers
- **Activities**: Notes, calls, meetings, tasks with threading

### Intelligence & Analytics
- **Nexus**: Network relationship mapping for warm introductions
- **Pulse**: Market intelligence feed (opportunities/threats)
- **Pipeline Velocity**: Real-time MW movement tracking
- **Commission Tracking**: Volume-based earnings (THB per MW)

### Security & Compliance
- **Hierarchical RLS**: Managers see subordinates' data automatically
- **Role-Based Access**: super_admin, admin, internal, external
- **Two-Factor Auth**: TOTP-based with backup codes
- **Audit Trail**: Comprehensive activity logging

### Technical Features
- **Media Vault**: GPS-verified document storage
- **Thai Taxonomy**: Industry classification system
- **Counterparty Risk**: Credit assessment matrix
- **Quality Gates**: Milestone tracking
- **Session Management**: Advanced timeout handling

## 🗄️ Database Schema

27+ tables including:
- `crm_users` - User management (11 users)
- `accounts` - Companies (165 accounts)
- `opportunities` - Sales pipeline (145 deals)
- `partners` - EPC contractors (16 partners)
- `contacts` - Individual people (85 contacts)
- `activities` - Activity log (24 items)
- `market_news` - Intelligence feed (298 items)
- `opportunity_stage_history` - Pipeline tracking (76 movements)

See `DATABASE_ARCHITECTURE.md` for complete schema documentation.

## 🔐 Environment Variables

Required in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 📦 Migrating to Your Own Supabase Account

**Currently using Bolt-provisioned Supabase?** Follow these steps:

### Quick Migration Steps:

1. **Create Supabase Account**: [supabase.com](https://supabase.com)
2. **Run Migrations**: Execute all files in `supabase/migrations/` in order
3. **Create Storage Buckets**: `vault` (private) and `avatars` (public)
4. **Deploy Edge Functions**: From `supabase/functions/`
5. **Update Environment Variables**: Copy new credentials to `.env`
6. **Create Admin User**: Use SQL or edge function

### Detailed Guide:

📖 **See `migration-to-own-supabase.md`** for step-by-step instructions

📄 **See `export-current-data.sql`** for data export/import scripts

### What Gets Migrated:
✅ Database schema (all tables, indexes, RLS policies)
✅ Functions (get_pipeline_velocity, find_nexus_paths, etc.)
✅ Triggers (stage tracking, hierarchy refresh, etc.)
✅ Storage buckets (vault, avatars)
✅ Edge functions (user management, 2FA)

### What You'll Recreate:
🔄 User accounts (fresh sign-ups or manual creation)
🔄 Uploaded files (download + re-upload)
🔄 Data records (optional - can export/import)

### Estimated Time: 30-60 minutes

## 🔧 Project Structure

```
src/
├── components/
│   ├── crm/              # CRM feature components
│   ├── screens/          # Main screen views
│   ├── settings/         # Settings panels
│   ├── admin/            # Admin management
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts (Auth, App, Presence)
├── hooks/                # Custom React hooks
├── lib/
│   ├── api/              # API layer for Supabase
│   ├── device/           # Device detection utilities
│   └── supabase.ts       # Supabase client
├── pages/                # Route pages
└── types/                # TypeScript definitions

supabase/
├── migrations/           # Database migrations (100+ files)
└── functions/            # Edge functions (4 functions)
```

## 🎯 Key Features Explained

### Unified Opportunity Flow
Single table for entire lifecycle: Discovery → Proposal → Won → Construction → Operational

### Hierarchical Security (Operation Iron Dome)
- Managers automatically see subordinates' data
- Cached in `user_hierarchy` table
- Auto-refreshes on org changes

### Nexus Network Intelligence
- Discovers degrees of separation between users and contacts
- Finds warm introduction paths
- Weighted by relationship strength

### Pipeline Velocity Analytics
- Tracks MW movement between stages
- Week-over-week and month-over-month trends
- Powers executive dashboard

## 🛡️ Security Features

- **Row Level Security (RLS)**: All tables protected
- **Hierarchical Access**: Based on org structure
- **2FA Authentication**: TOTP + backup codes
- **Trusted Devices**: Device fingerprinting
- **Session Tracking**: Login history + session events
- **Audit Trail**: Admin activity logs (1,880+ events)

## 📱 Responsive Design

- Desktop-first with mobile optimization
- Bottom navigation on mobile
- Touch-friendly UI elements
- Adaptive layouts

## 🎨 UI Components

Built with shadcn/ui:
- Buttons, Cards, Dialogs, Dropdowns
- Forms with validation (react-hook-form + zod)
- Data tables, Charts (recharts)
- Toasts, Tooltips, Modals

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Netlify
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Environment Variables (Production)
Set these in your hosting dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📚 Documentation

- `migration-to-own-supabase.md` - Migration guide
- `export-current-data.sql` - Data export/import scripts
- `docs/MASTER_ARCHITECTURE.md` - System architecture
- `docs/OPERATING_AND_SYSTEMS_MANUAL.md` - Operations guide
- `docs/QUICK_REFERENCE_GUIDE.md` - Feature reference

## 🐛 Troubleshooting

### Can't login after deployment
- Verify environment variables are set correctly
- Check Supabase dashboard for RLS policy status
- Ensure user exists in both `auth.users` and `crm_users`

### "relation does not exist" errors
- Migrations not run or incomplete
- Run migrations in chronological order
- Check Supabase SQL Editor for errors

### RLS policy errors
- User not authenticated
- User role not set correctly
- Check `crm_users` table has correct role value

### Edge function errors
- Verify all functions deployed
- Check function logs in Supabase dashboard
- Ensure CORS headers are present

## 📊 Database Statistics (Current)

- **Total Tables**: 43 (27 public + 16 auth)
- **Total Rows**: ~3,500 across all tables
- **Migrations**: 100+ migration files
- **Functions**: 6 database functions
- **Edge Functions**: 4 serverless functions
- **Storage Buckets**: 2 (vault, avatars)

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## 📝 License

Proprietary - All Rights Reserved

## 🆘 Support

For issues or questions:
1. Check documentation in `/docs` folder
2. Review migration guide
3. Check Supabase logs and browser console
4. Verify environment variables

---

**Built with** ❤️ **for renewable energy sales teams**
