# 🔐 Supabase Credentials Verification

## Issue: Password Authentication Failed

Your Supabase connection is failing with: `FATAL: password authentication failed for user "postgres"`

This means the password in the connection string is **incorrect or needs to be reset**.

---

## ✅ How to Fix - 3 Steps

### **Step 1: Go to Supabase Dashboard**
1. Open: https://app.supabase.com/
2. Select your project
3. Go to **Settings → Database**

### **Step 2: Find Your Credentials**
Look for the section labeled "Connection string" or "PostgreSQL Connection"

You should see a connection URL that looks like:
```
postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres
```

### **Step 3: Verify/Reset Password**
**Option A: If you see the password**
- Copy the exact connection string
- Replace in your `.env` and `render.yaml` with the correct one
- Make sure to add `?sslmode=require` at the end

**Option B: If password is wrong or forgotten**
- Go to **Database → Roles** in Supabase
- Find the `postgres` role
- Click **Reset Password**
- Copy the new connection string
- Update your `.env` and `render.yaml`

---

## Current Connection String

**In your `.env` and `render.yaml`:**
```
postgresql://postgres:Anshul-777@db.zxsloquwsmicadpanclo.supabase.co:5432/postgres?sslmode=require
```

**If this password is incorrect**, Supabase dashboard will show you the correct one.

---

## After You Verify Credentials

1. **Update `.env` file** with correct connection string + `?sslmode=require`
2. **Update `render.yaml`** with same connection string
3. **Test locally:**
   ```bash
   cd backend
   python test_db_connection.py
   ```
4. **If test passes:** Push to Git and redeploy
5. **If test fails:** Double-check credentials again

---

## Test Output Should Look Like:
```
✓ Supabase Connection OK
✓ PostgreSQL Version: PostgreSQL 15.1 on x86_64-pc-linux-gnu...
✓ Tables in database: 13
✓ Tables: clients, expenses, invoice_items, invoices, notes, notifications, projects, recurring_expenses, tasks, time_entries, user_workspaces, users, workspaces
✓ All database checks passed!
```

---

## Need Help?

1. Check your Supabase project name at: https://app.supabase.com/
2. Verify the database host: `db.zxsloquwsmicadpanclo.supabase.co` (should match your project)
3. Make sure `postgres` user exists (it's the default admin user)
4. If still failing, create a new database and project
