# FreelanceOS Projects Module - Complete Feature Documentation

## Overview
The Projects module transforms FreelanceOS into a real project control center for freelancers. It goes beyond a simple project list by providing comprehensive tracking of scope, time, money, deliverables, deadlines, and project health.

---

## Core Features

### 1. Project Overview & Key Metrics

**What it shows:**
- Total hours logged on the project
- Total earnings/revenue
- Total expenses
- Profit estimate (earnings - expenses)
- Project completion percentage
- Client name and assignment
- Budget tracking
- Billable status
- Risk level (Low/Medium/High)

**Where to access:**
- Projects List: `/app/projects` (grid or list view)
- Project Detail: `/app/projects/:id` → Overview tab

**UI Elements:**
- Stat cards showing key metrics with color coding
- Progress bars for completion tracking
- Risk badges with visual indicators
- Timeline visualization showing start and due dates
- Budget status display

---

### 2. Deliverables Management

**What it does:**
- Create and organize deliverables for each project
- Track status: Pending, In Progress, Completed, Approved, or Rejected
- Set due dates for individual deliverables
- Add descriptions for clarity
- View all deliverables in a checklist format

**Why it matters:**
- Clearly defines what you're delivering to the client
- Protects you by documenting scope
- Helps organize work into tangible outputs
- Prevents ambiguity about what's included

**Features:**
- Add/edit/delete deliverables
- Status filters for organization
- Inline editing and deletion
- Due date tracking with visual indicators
- Empty state with helpful explanation

**API Endpoints:**
```
POST   /projects/{project_id}/deliverables
PUT    /projects/{project_id}/deliverables/{deliverable_id}
DELETE /projects/{project_id}/deliverables/{deliverable_id}
```

---

### 3. Scope Changes & Revisions Tracking

**What it does:**
- Log all scope changes, revisions, and extra work
- Track three types of changes:
  - **Revisions**: Redo existing work (same scope)
  - **Extra Work**: Adding to scope (increasing complexity)
  - **Scope Reduction**: Removing from scope (decreasing complexity)
- Mark each change's status: Pending, Approved, Implemented, Rejected
- Document impact on budget, hours, and timeline

**Why it matters:**
- Prevents scope creep by documenting all changes
- Justifies change orders to clients
- Protects your margins from untracked extra work
- Shows client communication history

**Features:**
- Create scope change entries with impact analysis
- Optional fields for budget impact, hours impact, timeline impact (days)
- Status tracking for each change
- Clear visual indicators for change type
- Helps you see when projects are still on budget after changes

**API Endpoints:**
```
POST   /projects/{project_id}/scope-changes
PUT    /projects/{project_id}/scope-changes/{change_id}
DELETE /projects/{project_id}/scope-changes/{change_id}
```

---

### 4. Time & Expense Tracking

**What it shows:**
- Total hours logged to this specific project
- All time entries linked to the project
- Total expenses (materials, contractor payments, etc.)
- Automatic earnings calculation based on logged hours and hourly rate
- Profit calculation (earnings - expenses)

**How it works:**
- Time entries created in `/app/time` can be linked to projects
- Expenses created in `/app/expenses` can be linked to projects
- Backend automatically calculates totals and profit
- Updates in real-time as you log time and expenses

**Why it matters:**
- See true project profitability immediately
- Know exactly how much time you're spending
- Catch underpriced projects early
- Separate billing by project

---

### 5. Deliverables & Files Management

**What it stores:**
- Contracts and agreements
- Project briefs and requirements
- Deliverable files (designs, code, documents)
- Reference materials
- Any other project-related files

**File Types:**
- Contract (agreements with client)
- Brief (project requirements and scope)
- Deliverable (final outputs to send to client)
- Reference (background materials)
- Other (miscellaneous files)

**Features:**
- Upload multiple file types
- Add descriptions for each file
- Track file types for organization
- Easy access to all project documentation
- Single place to keep everything related to the project

**API Endpoints:**
```
POST   /projects/{project_id}/files
GET    /projects/{project_id}/files?file_type=deliverable
DELETE /projects/{project_id}/files/{file_id}
```

---

### 6. Project Risk & Deadline Tracking

**What it shows:**
- Countdown to deadline
- Overdue status with visual warning
- Risk level assessment (Low/Medium/High)
- Days remaining before due date
- Completion percentage vs. estimated time

**Risk Calculation Logic:**
- **High Risk** if:
  - Project is overdue
  - Logged hours exceed estimated hours
  - Due within 3 days with less than 50% completion
  - Project is unprofitable
- **Medium Risk** if:
  - Due within 7 days with less than 50% completion
- **Low Risk** otherwise

**Why it matters:**
- Get alerts when projects are at risk
- Identify problems before they become critical
- Plan better by seeing which projects need attention
- Adjust scope or timeline proactively

---

### 7. Project Health Metrics

**Calculated Automatically:**
- **Completion Percentage**: Based on task completion (tasks marked as "Done")
- **Profit Estimate**: Total earnings - total expenses
- **Total Hours**: Sum of all time entries on project
- **Total Earnings**: Hours × hourly rate (capped at budget if fixed-price)
- **Is Overdue**: Current date > due date
- **Days Until Due**: Number of days remaining (negative if overdue)

**Budget Tracking:**
- Fixed-price projects: earnings capped at project budget
- Hourly projects: earnings calculated based on actual hours logged
- Can switch between fixed and hourly rates per project

---

## Navigation & Workflows

### Creating a Project
1. Go to `/app/projects`
2. Click "+ New Project" button
3. Fill in:
   - Project name (required)
   - Client (optional)
   - Status (lead, active, on hold, completed, cancelled)
   - Budget and budget type
   - Start and due dates
   - Estimated hours
   - Billable status
4. Click "Create Project"

### Viewing Project Details
1. From projects list, click on any project card
2. Navigates to `/app/projects/:id`
3. View project in tabs:
   - **Overview**: Key metrics and project summary
   - **Deliverables**: Manage deliverables checklist
   - **Scope Changes**: Track revisions and scope modifications
   - **Files**: Manage contracts, briefs, and deliverables
   - **Tasks**: Kanban board for task management
   - **Time Log**: View all time entries for this project

### Adding Deliverables
1. On project detail, go to "Deliverables" tab
2. Click "+ Add Deliverable"
3. Enter:
   - Title (what you're delivering)
   - Description (optional details)
   - Status (pending, in progress, completed, approved, rejected)
   - Due date (optional)
4. Click "Add Deliverable"

### Logging Scope Changes
1. On project detail, go to "Scope Changes" tab
2. Click "+ Log Change"
3. Enter:
   - Change title
   - Description of what changed
   - Change type (revision, extra work, or scope reduction)
   - Status (pending, approved, implemented, rejected)
   - Optional: Budget impact, hours impact, timeline impact
4. Click "Log Change"

### Uploading Files
1. On project detail, go to "Files" tab
2. Click "+ Upload File"
3. Enter:
   - File name
   - File URL (S3, Supabase, or other CDN)
   - File type (contract, brief, deliverable, reference, other)
   - Description (optional)
4. Click "Upload File"

### Filtering Projects
1. On projects list, use:
   - Search box: Find by project name or client name
   - Status dropdown: Filter by status
   - View toggle: Switch between grid and list view

---

## Data Model

### Project
```
{
  id: int,
  name: string,
  description: string?,
  status: "lead" | "active" | "on_hold" | "completed" | "cancelled",
  client_id: int?,
  budget: decimal?,
  budget_type: "fixed" | "hourly",
  hourly_rate: decimal?,
  start_date: date?,
  due_date: date?,
  estimated_hours: decimal?,
  is_billable: boolean,
  color: hex_color,
  created_at: datetime
}
```

### Deliverable
```
{
  id: int,
  project_id: int,
  title: string,
  description: string?,
  status: "pending" | "in_progress" | "completed" | "approved" | "rejected",
  due_date: date?,
  notes: string?,
  order: int
}
```

### Scope Change
```
{
  id: int,
  project_id: int,
  title: string,
  description: string?,
  change_type: "revision" | "extra_work" | "scope_reduction",
  impact_on_budget: decimal?,
  impact_on_hours: decimal?,
  impact_on_timeline: int? (days),
  status: "pending" | "approved" | "implemented" | "rejected",
  created_at: datetime,
  approved_at: datetime?
}
```

### Project File
```
{
  id: int,
  project_id: int,
  file_name: string,
  file_type: "contract" | "brief" | "deliverable" | "reference" | "other",
  file_url: string (S3/Supabase URL),
  file_size: int?,
  uploaded_by_user: boolean,
  description: string?,
  created_at: datetime
}
```

---

## API Reference

### Projects
```
GET    /projects                          - List all projects
GET    /projects?status_filter=active     - Filter by status
POST   /projects                          - Create new project
GET    /projects/{id}                     - Get single project
GET    /projects/{id}/detail              - Get detailed project info with all relationships
PUT    /projects/{id}                     - Update project
DELETE /projects/{id}                     - Delete project
```

### Deliverables
```
POST   /projects/{project_id}/deliverables
PUT    /projects/{project_id}/deliverables/{id}
DELETE /projects/{project_id}/deliverables/{id}
```

### Scope Changes
```
POST   /projects/{project_id}/scope-changes
PUT    /projects/{project_id}/scope-changes/{id}
DELETE /projects/{project_id}/scope-changes/{id}
```

### Files
```
POST   /projects/{project_id}/files                    - Upload file
GET    /projects/{project_id}/files                    - List files
GET    /projects/{project_id}/files?file_type=brief   - Filter by type
DELETE /projects/{project_id}/files/{id}              - Delete file
```

---

## Frontend Components

### ProjectsPage (`/frontend/src/pages/ProjectsPage.tsx`)
- Main projects list with grid/list view toggle
- Search and filter functionality
- New project creation modal
- Project card component showing key metrics
- Empty state with feature explanation cards

### ProjectDetailPageEnhanced (`/frontend/src/pages/ProjectDetailPageEnhanced.tsx`)
- Tabbed interface for different sections
- Overview with metrics dashboard
- Deliverables management interface
- Scope changes log
- Files manager
- Kanban board for tasks
- Time entry view

### ProjectCard (in ProjectsPage)
- Shows project name, client, and color indicator
- Displays progress bar with completion %
- Shows hours logged, earnings, and due date
- Hover menu for edit/delete
- Clickable to navigate to detail page

---

## Backend Features

### Health Calculation (`calculate_project_health`)
Automatically computes for each project:
- Total hours from all linked time entries
- Total expenses from all linked expenses
- Total earnings (hours × rate, capped at budget if fixed)
- Profit estimate (earnings - expenses)
- Completion percentage (done tasks / total tasks)
- Days until due and overdue status
- Risk level based on multiple factors

### Data Enrichment
List endpoints automatically include computed metrics so you see:
- `total_hours`: Sum of billable time
- `total_earnings`: Calculated revenue
- `total_expenses`: Sum of project expenses
- `completion_percentage`: Task completion %
- `task_count`: Number of tasks

---

## Empty State & Onboarding

When you have no projects, you see:
1. Main empty state with "+ New Project" button
2. 6 feature cards explaining:
   - **Project Overview**: Client, budget, dates, billable status
   - **Time & Money Tracking**: Hours logged, expenses, profit
   - **Deliverables & Scope**: Define outputs and track changes
   - **Deadline Tracking**: Risk warnings and countdowns
   - **Task Management**: Kanban boards for task organization
   - **File Management**: Store contracts, briefs, deliverables

This helps new users understand what the Projects module can do and why they should use it.

---

## Real-World Scenarios

### Scenario 1: Tracking a Fixed-Price Web Design Project
1. Create project: "Website Redesign" for Client ABC, $5,000 budget, due in 30 days
2. Add deliverables: Homepage design, Inner page templates, Mobile mockups
3. Log time entries: Time goes to `/app/time` and links to this project
4. See real-time: "20 hours logged, $5,000 earned (capped at budget)"
5. If client asks for revisions: Log scope change, track whether it's still profitable
6. Upload files: Contract, design brief, final deliverables
7. When done: Mark deliverables as "Approved", see profit estimate

### Scenario 2: Tracking an Hourly Project Gone Overlong
1. Create project: "Mobile App Development" at $150/hour, estimated 80 hours
2. Start logging time against the project
3. At 60 hours logged: See "12h remaining in estimate"
4. At 85 hours: Risk level changes to "HIGH" (over estimated hours)
5. Log scope changes if client added features
6. See profit calculation: "127.5 hours × $150 = $19,125 earned"
7. Know exactly what extra hours cost the project

### Scenario 3: Managing Scope Creep
1. Project starts with clear scope in deliverables
2. Client requests "quick changes" → Log as revision
3. Client adds "one more page" → Log as extra work
4. After 3 scope changes, you can see: "Scope changes added 15 estimated hours"
5. Decide whether to request change order or absorb the work
6. Track if project is still profitable after all changes

---

## Performance Notes

- Projects list loads with computed metrics (no N+1 queries)
- Detail endpoint uses `joinedload` for efficient loading
- All calculations done server-side to keep frontend fast
- Metrics cached in response (no client-side computation)
- Indexes on user_id, project_id for quick filtering

---

## Testing the Features

1. **Start Backend**: `python -m uvicorn main:app --host 127.0.0.1 --port 8000`
2. **Start Frontend**: `npm run dev` (runs on localhost:5173)
3. **Access App**: http://localhost:5173/app/projects
4. **Create Test Project**: Fill out the form and save
5. **Add Deliverables**: Go to detail page, add a deliverable
6. **Log Time**: Go to `/app/time`, create entry linked to project
7. **View Metrics**: Project card and detail page show live calculations
8. **Log Scope Change**: Track a revision or extra work request
9. **Upload File**: Add a contract or deliverable file
10. **See Risk Indicator**: Verify risk level changes based on project state

---

## Future Enhancements

Potential additions for future versions:
- Email notifications for overdue projects
- Automatic milestone creation from deliverables
- Client access to project status (read-only portal)
- Budget variance analysis
- Historical profit trends per project
- Project templates for common types
- Recurring project support
- Team collaboration on projects
- Project archiving
- Project profitability reports

---

## Troubleshooting

**Q: Why doesn't my profit show correctly?**
A: Ensure you have:
1. Time entries linked to the project (go to time tracker)
2. Expenses linked to the project (go to expenses)
3. Hourly rate set on the project or user profile

**Q: My risk level isn't updating?**
A: Risk is calculated on-demand. Refresh the page or:
1. Log new time entry
2. Check estimated hours vs. actual hours
3. Check if project is overdue

**Q: How do I link time to a project?**
A: When creating a time entry in `/app/time`, select the project from the dropdown.

**Q: Can I change project budget type after creation?**
A: Yes! Edit the project and change budget_type from "fixed" to "hourly" or vice versa.

**Q: Why aren't deliverables showing up?**
A: Make sure you're on the project detail page (not the list), then go to the Deliverables tab.

---

## Key Takeaways

The Projects module provides real project management for freelancers by:
- ✅ Showing what you're delivering and tracking completion
- ✅ Monitoring time and money in real-time
- ✅ Warning you when projects go at-risk
- ✅ Documenting all scope changes for client communication
- ✅ Keeping contracts and deliverables organized
- ✅ Calculating profitability automatically
- ✅ Preventing scope creep and underpricing

Every feature solves a real freelancer problem. No decorative UI. No fake data. Just real project control.
