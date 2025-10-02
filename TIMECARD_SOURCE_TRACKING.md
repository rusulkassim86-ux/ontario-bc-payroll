# Timecard Source Tracking & Pay Calendar Assignment

## Overview
The timesheet system now automatically tracks the source of hours entries and assigns the correct `pay_calendar_id` to prevent "null value in column pay_calendar_id" errors.

## Key Features

### 1. Automatic Pay Calendar Assignment
**Function**: `get_pay_calendar_for_date(p_employee_id, p_work_date)`

This function automatically:
- Finds the employee's company and pay frequency
- Searches for a pay calendar that covers the work date
- Falls back to the nearest pay calendar if an exact match isn't found
- Returns a user-friendly error if no pay calendar exists

**Error Handling**:
- If no pay calendar is found, the system displays: 
  > "No pay calendar was found for this date. Please contact your payroll administrator to create a pay calendar first."
- The entry is skipped (not saved) to prevent database constraint violations

### 2. Source Tracking
**Field**: `timesheets.source` (TEXT)

**Values**:
- `'manual'` - Hours entered directly by a user
- `'punch'` - Hours calculated from time clock punches
- `'hidden'` - Source masked for non-admin users (RBAC)

**Automatic Detection**:
```typescript
v_source := CASE 
  WHEN v_hours IS NOT NULL THEN 'manual'  // User typed hours
  ELSE 'punch'                             // Calculated from punches
END;
```

### 3. Pay Code Auto-Fill
If a pay code is missing or empty, the system defaults to `'REG'` (Regular Hours).

### 4. Permissions
**Source Column Visibility**:
- ✅ **Visible to**: Admin (`org_admin`) and Payroll Manager (`payroll_admin`)
- ❌ **Hidden from**: Regular employees, managers, supervisors

**Implementation**:
```typescript
const isAdmin = profile?.role === 'org_admin' || profile?.role === 'payroll_admin';

// In table header
{isAdmin && <TableHead>Source</TableHead>}

// In table row
{isAdmin && row.source !== 'hidden' && (
  <TableCell>
    <Badge variant={row.source === 'manual' ? 'default' : 'secondary'}>
      {row.source === 'manual' ? 'Manual' : 'Machine'}
    </Badge>
  </TableCell>
)}
```

## Database Changes

### New Function: `get_pay_calendar_for_date`
- **Purpose**: Find the correct pay calendar for a given employee and date
- **Security**: `SECURITY DEFINER` with `search_path = public`
- **Return**: UUID of the matching pay calendar
- **Fallback**: If no exact match, finds nearest calendar by date
- **Error**: Raises exception if no calendar exists for the employee's company

### Updated Function: `save_timecard_draft`
**Key Changes**:
1. **Auto-assign pay_calendar_id**: Calls `get_pay_calendar_for_date` for each entry
2. **Track source**: Sets source based on whether hours are manual or punch-based
3. **Validation**: Auto-fills pay_code to 'REG' if missing
4. **Error handling**: Gracefully skips entries if pay calendar lookup fails (with warning)
5. **Returns breakdown**: Includes `pay_calendar_id` in the response breakdown

**Return Format**:
```json
{
  "success": true,
  "entries_saved": 14,
  "total_hours": 80.00,
  "breakdown": [
    {
      "work_date": "2025-10-02",
      "daily_hours": 8.00,
      "source": "manual",
      "manual_hours": 8.00,
      "pay_code": "REG",
      "pay_calendar_id": "uuid-here",
      "time_in": null,
      "time_out": null
    }
  ]
}
```

### Column Comment
```sql
COMMENT ON COLUMN timesheets.source IS 
  'Tracks entry source: manual (user entered) or punch (from time clock). 
   Only visible to Admin/Payroll Manager roles.';
```

## User Experience

### Manual Entry Flow
1. User types hours into the Hours cell
2. System marks `source = 'manual'`
3. System automatically finds the correct `pay_calendar_id`
4. System auto-fills `pay_code = 'REG'` if missing
5. Entry is saved after 400ms (debounced)
6. Admin users see "Manual" badge in Source column

### Punch Entry Flow
1. Employee punches in/out using time clock
2. System calculates hours from punch pairs
3. System marks `source = 'punch'`
4. System automatically finds the correct `pay_calendar_id`
5. Admin users see "Machine" badge in Source column

### Error Scenarios

#### No Pay Calendar Found
**Error**: `No pay calendar found for employee X on date Y. Please create a pay calendar first.`

**User sees**:
- Toast notification: "Pay Calendar Missing"
- Description: "No pay calendar was found for this date. Please contact your payroll administrator to create a pay calendar first."

**Action Required**:
- Payroll admin must create a pay calendar for the company
- Pay calendar must cover the work date or be the nearest one
- Pay calendar frequency must match employee's pay frequency (e.g., biweekly)

#### Locked Timecard
**Error**: Entries on locked timecards are not saved

**Behavior**:
- The `WHERE timesheets.locked_at IS NULL` clause prevents updates to locked timecards
- User is notified that the timecard is locked and cannot be edited

## Approval Process
Manual hours entries flow through the same approval process as punch entries:
1. **Supervisor Approval**: Supervisor/manager approves the timecard
2. **Final Approval**: Payroll admin performs final approval and locks the timecard
3. **Total Hours Validation**: Cannot approve if `total_hours <= 0`

Both manual and punch entries are included in the totals calculation.

## Security

### RLS Policies
- Timesheets table has RLS enabled
- Users can only view/edit timesheets for employees in their company
- Locked timecards cannot be edited (enforced at database level)

### Audit Logging
All saves are logged with:
```json
{
  "entries_saved": 14,
  "total_hours": 80.00,
  "source_tracking": true
}
```

## Troubleshooting

### "null value in column pay_calendar_id" Error
**Cause**: No pay calendar found for the employee on that date

**Solution**:
1. Go to Pay Calendars page
2. Create a new pay calendar for the company
3. Ensure the pay calendar covers the date range of the timesheet
4. Match the frequency (biweekly, weekly, etc.) to the employee's pay frequency

### Source Column Not Visible
**Cause**: User is not an admin or payroll manager

**Solution**: Only admins and payroll managers can see the Source column. This is by design for data privacy.

### Cannot Save Hours
**Cause**: Timecard may be locked, or pay calendar is missing

**Solution**:
1. Check if timecard is locked (approved)
2. Check if pay calendar exists for the date range
3. Ensure you have permissions to edit the timecard

## Backend Function Details

### `get_pay_calendar_for_date` Logic
```
1. Get employee's company_id and pay_frequency
2. Find pay calendar where:
   - company_id matches
   - frequency matches (or defaults to 'biweekly')
   - work_date is between period_start and period_end
3. If not found, find nearest calendar by calculating:
   - ABS(EXTRACT(EPOCH FROM (period_start - work_date)))
   - Order by this value ascending
4. If still not found, raise exception
5. Return calendar UUID
```

### `save_timecard_draft` Logic
```
1. Authenticate user
2. Validate permissions (company match)
3. For each entry:
   a. Parse work_date, hours, pay_code
   b. Determine source (manual if hours provided, else punch)
   c. Get pay_calendar_id using helper function
   d. Auto-fill pay_code to 'REG' if missing
   e. Insert/update timesheet entry
4. Recompute daily hours from punches or manual
5. Calculate total hours
6. Build breakdown with all fields
7. Create audit log
8. Return success response with breakdown
```

## Testing

### Test Manual Entry
1. Navigate to bi-weekly timecard
2. Type hours into the Hours column (e.g., 8)
3. Verify source badge shows "Manual" (admins only)
4. Check that hours are saved after blur/debounce
5. Verify total hours updated correctly

### Test Punch Entry
1. Import punch data for an employee
2. View bi-weekly timecard
3. Verify hours are calculated from punches
4. Verify source badge shows "Machine" (admins only)

### Test Pay Calendar Auto-Assignment
1. Create a timecard entry for a date with no pay calendar
2. Verify error message: "Pay Calendar Missing"
3. Create a pay calendar covering the date
4. Retry saving the entry
5. Verify success

### Test Approval Flow
1. Enter manual hours for a timecard
2. Save draft
3. Supervisor approve
4. HR final approve
5. Verify timecard is locked
6. Attempt to edit hours → should fail

## Summary
The updated timecard system now:
- ✅ Always assigns a valid `pay_calendar_id` (no more constraint violations)
- ✅ Tracks source of hours (manual vs machine)
- ✅ Shows source badge only to admins (RBAC enforced)
- ✅ Auto-fills missing pay codes
- ✅ Gracefully handles missing pay calendars with user-friendly errors
- ✅ Maintains approval workflow for both manual and punch entries
- ✅ Logs all changes for audit trail
