# Punch-to-Timecard Integration Flow

## Overview
This document describes the automated punch-to-timecard integration system that calculates hours, assigns pay codes, and flows data to payroll.

## Data Flow

### 1. Punch Data Collection
- Employees punch In/Out using time clock devices or manual entry
- Punches are stored in the `punches` table with timestamps
- `usePunches` hook aggregates punches into daily pairs (In + Out)

### 2. Auto-Fill Timecard
**Location:** `src/pages/IndividualTimecardMinimal.tsx` → `mergeEntriesWithPunches()`

**Process:**
```typescript
- For each work date in the bi-weekly period:
  1. Find matching punch pair (In/Out) for that date
  2. Calculate hours: Out time - In time (auto lunch deduction after 6 hours)
  3. Auto-fill timecard fields:
     - Time In: From punch
     - Time Out: From punch  
     - Hours: Calculated from punch times
     - Pay Code: Default to REG (Regular) unless manually changed
```

### 3. Pay Code Assignment
**Default Logic:**
- Punch data auto-fills with pay code = `REG`
- User can override to: `OT`, `OT1`, `OT2`, `SICK`, `VAC`, etc.
- Pay codes are filtered by company via `pay_code_company_map` table

**Filtered by Company:**
- Query: `useTimesheetEarningCodes(company_code)`
- Only active pay codes mapped to employee's company are shown
- Example: OZC employees only see codes mapped to OZC

### 4. Bi-Weekly View & Editing
**Display:**
- Shows 14 days (Week 1: Days 1-7, Week 2: Days 8-14)
- Each row: Date, Weekday, In, Out, Pay Code, Hours, Department
- "P" badge indicates punch data source
- Users can manually adjust times, pay codes, or hours

**Validation:**
- Both Week 1 and Week 2 must have hours entered
- Approval button disabled until both weeks complete

### 5. Approval Workflow
**Location:** `handleApproveTimecard()` 

**Process:**
```typescript
1. Validate: Both weeks must have hours > 0
2. Calculate totals:
   - Regular hours (REG)
   - Overtime hours (daily OT + weekly OT)
   - STAT, VAC, SICK hours by pay code
3. Call database function: approve_timesheet()
   - Saves to timesheet_approvals table
   - Locks timesheets for the period (status = 'approved')
   - Records approver, timestamp, and totals
4. Mark UI entries as approved (visual confirmation)
```

**Approval Requirements:**
- ✅ 14-day bi-weekly period
- ✅ Week 1 has hours entered
- ✅ Week 2 has hours entered
- ✅ All punch data reconciled
- ✅ Pay codes assigned

### 6. Payroll Register Flow
**When timecard approved:**
```sql
-- Data written to timesheet_approvals table:
{
  employee_id: UUID,
  pay_period_start: DATE,
  pay_period_end: DATE,
  total_reg_hours: NUMERIC,
  total_ot_hours: NUMERIC,
  total_stat_hours: NUMERIC,
  total_vac_hours: NUMERIC,
  total_sick_hours: NUMERIC,
  selected_days: JSONB,  -- Array of daily breakdown
  approved_by: UUID,
  approved_at: TIMESTAMP
}
```

**Payroll Run Processing:**
When payroll runs for the period, it:
1. Queries `timesheet_approvals` for approved timecards
2. Reads `selected_days` jsonb for pay code breakdown
3. Creates `pay_run_lines` with earnings by pay code:
   ```json
   {
     "earnings": {
       "REG": { "hours": 80, "rate": 25.00, "amount": 2000 },
       "OT": { "hours": 5, "rate": 37.50, "amount": 187.50 },
       "SICK": { "hours": 8, "rate": 25.00, "amount": 200 }
     }
   }
   ```
4. Calculates taxes, deductions, net pay
5. Generates payroll register for GL posting

## Database Schema

### Key Tables

**earning_codes**
- Master list of all pay codes (REG, OT, OT1, OT2, SICK, VAC, etc.)
- Fields: `code`, `label`, `active`, `allow_in_timesheets`

**pay_code_company_map**
- Links earning codes to company codes
- Ensures only mapped codes show in timecard dropdown
- Fields: `earning_code_id`, `company_code`, `is_active`

**punches**
- Raw punch events from time clocks
- Fields: `employee_id`, `punch_time`, `punch_type` (IN/OUT)

**timesheets**
- Individual daily timecard entries
- Fields: `employee_id`, `work_date`, `pay_code`, `pay_code_id`, `hours_*`, `time_in`, `time_out`
- When approved: `status='approved'`, `locked_at`, `approved_by`

**timesheet_approvals**
- Bi-weekly approval records
- Stores totals and daily breakdown (selected_days jsonb)
- Unique constraint: (employee_id, pay_period_start, pay_period_end)

**pay_run_lines**
- Final payroll register entries
- Generated from approved timecards
- Fields: `earnings` (jsonb), `deductions`, `taxes`, `net_pay`

## User Workflow

### Employee/Manager:
1. View timecard for bi-weekly period
2. Punch data auto-fills hours (In/Out → Hours)
3. Review and adjust pay codes as needed
4. Check Week 1 and Week 2 totals
5. Click "Approve Bi-Weekly Timecard"
6. System locks timecard and saves approval

### Payroll Admin:
1. Navigate to Payroll Run
2. Select pay period and company
3. System includes all approved timecards
4. Review Preview Register (grouped by pay code)
5. Process payroll
6. Generate GL journal entries

## Safety Checks

✅ **Company Code Filtering:**
- Only pay codes mapped to employee's company appear in dropdown
- Prevents cross-company pay code pollution

✅ **Bi-Weekly Validation:**
- Both Week 1 and Week 2 must have hours before approval
- Prevents partial period approvals

✅ **Approval Lock:**
- Once approved, timecards are locked (`locked_at` timestamp)
- Prevents retroactive changes after payroll processing

✅ **REG Default:**
- All punch auto-fills default to REG pay code
- User must explicitly select OT, SICK, VAC, etc.

✅ **Foreign Key Integrity:**
- `timesheets.pay_code_id` references `earning_codes.id`
- Ensures valid pay codes at database level

## Testing Checklist

### Test Case: OZC Employee 324580 (Darren Russel Plourde)

**Setup:**
- Company Code: OZC
- Available Pay Codes: REG, OT, OT1, OT2, SICK, VAC
- Pay Period: 14-day bi-weekly (e.g., 2025-09-29 to 2025-10-12)

**Week 1 (Mon-Fri):**
- Days: 5 weekdays
- Hours per day: 8.0 hours REG
- Total Week 1: 40.0 hours REG

**Week 2 (Mon-Fri + OT):**
- Mon-Fri: 8.0 hours REG each day (40.0 hours)
- One day: Add 2.0 hours OT
- Total Week 2: 40.0 REG + 2.0 OT = 42.0 hours

**Expected Results:**
- Total Period: 80.0 hours REG + 2.0 hours OT = 82.0 hours
- Approval: ✅ Both weeks complete → Can approve
- Payroll Register should show:
  - Line 1: REG - 80.0 hours @ employee rate
  - Line 2: OT - 2.0 hours @ (employee rate × 1.5)
  - GL Account mappings for each pay code

## Future Enhancements

- [ ] Real-time punch notifications
- [ ] Mobile timecard entry app
- [ ] Exception reporting (missed punches, overtime alerts)
- [ ] Manager approval workflow (multi-level)
- [ ] Pay code auto-assignment rules (e.g., auto-OT after 8 hours)
- [ ] Integration with scheduling system
- [ ] Geofencing for remote punch validation
