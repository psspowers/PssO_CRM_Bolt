# 🔒 10-Second Safe Duplication Checklist

**Use this before duplicating this project in Bolt, Git, or any other tool.**

---

## ⏸️ BEFORE Duplication

☐ `.env.ORIGINAL_BACKUP` exists
☐ `DATABASE_SAFETY_SYSTEM.md` is present
☐ `db_identity` table exists in Supabase
☐ App currently boots with:
```
✅ Database identity verified: PRODUCTION_ORIGINAL (shrglaqikuzcvoihzpyt)
```

**If ANY box is ❌ → STOP**

---

## 🚨 DURING Duplication

☐ Duplicate **project / chat / repo** ONLY
☐ DO NOT duplicate Supabase project
☐ DO NOT accept "fix migrations" prompts
☐ DO NOT allow database provisioning

### **If You See:**
- "Out of sync"
- "Fix database"
- "Provisioning database"
- "Apply migrations automatically"

**→ ABORT IMMEDIATELY**

---

## ✅ AFTER Duplication (Mandatory)

Run these commands in the duplicated project:

```bash
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

### **Expected Result:**

```
✅ Database identity verified: PRODUCTION_ORIGINAL (shrglaqikuzcvoihzpyt)
```

**Anything else → STOP**

---

## 🆘 Recovery (If Something Goes Wrong)

### **Symptom: App shows database error**

```bash
# In the duplicated project
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

### **Symptom: Original project suddenly broken**

```bash
# In the original project
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

### **Symptom: Bolt says "database out of sync"**

**DO NOT CLICK "FIX"**

Close the prompt and run:
```bash
cp .env.ORIGINAL_BACKUP .env
```

---

## 📖 Why This Works

**The Problem:**
Duplicating a project often triggers tools to "helpfully" provision a new database, overwrite .env, or apply migrations to the wrong target.

**The Solution:**
- `.env.ORIGINAL_BACKUP` is your restore point
- `db_identity` table prevents silent operation on wrong DB
- Checklist catches issues at each stage
- Single recovery command works every time

---

## 🎯 Quick Reference

**Before:** Check 4 boxes
**During:** Watch for 4 red flags
**After:** Run 2 commands
**Expected:** See 1 success message

---

*This checklist protects your production data. Follow it exactly.*
