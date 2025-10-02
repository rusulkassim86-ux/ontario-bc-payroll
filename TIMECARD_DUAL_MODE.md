# Bi-Weekly Timecard - Dual Mode System

## Overview
The bi-weekly timecard now supports **two data entry modes**:

1. **Manual Hours Entry** - Type hours directly into the Hours column
2. **Machine Punches** - Use In/Out times (calculated from punch clock data)

## How It Works

### Manual Hours Entry
- Click into the **Hours** column for any day
- Type the hours worked (e.g., `8`, `7.5`, `7,25`)
- Accepts both comma (`,`) and dot (`.`) as decimal separators
- Values are automatically snapped to quarter-hour increments (0.25)
- Valid range: **0-24 hours**

**What happens when you enter manual hours:**
- The In/Out fields are automatically **disabled** for that day
- Source badge shows **"Manual"** (red pill) - only visible to admins
- Hours are saved automatically after 400ms of no typing
- Hours are also saved immediately when you click away (blur)

### Machine Punches (Default)
- If you **clear the Hours field** (delete all text), the day reverts to Machine mode
- In/Out fields become **enabled** again
- Source badge shows **"Machine"** (blue pill) - only visible to admins
- Hours are calculated from actual punch clock data

## Validation

### Real-time Validation
- Hours must be between **0 and 24**
- Step resolution: **0.25** (quarter hours)
- Invalid entries (negative, >24, or NaN) are rejected with a toast notification
- On blur, invalid values revert to the last saved server value

### Example Valid Entries
- `8` → 8.00 hours
- `7.5` → 7.50 hours
- `7,25` → 7.25 hours (comma converted to dot)
- `8.33` → 8.25 hours (snapped to nearest quarter)
- Empty string → `null` (reverts to machine punch mode)

## Save Behavior

### Auto-Save (Debounced)
- Changes are saved **400ms** after you stop typing
- Each day's entry is saved individually (not bulk)
- Only the modified day is sent to the server

### Save on Blur
- When you click away from the Hours field, it saves immediately
- If the value is invalid, it reverts to the server value and shows an error

### Server Response
- After save, the server returns updated totals and breakdown
- The UI updates with the latest `daily_hours`, `manual_hours`, and `source` from the server
- Total hours are recalculated and displayed at the bottom

## Source Column (Admins Only)

### Visibility
- The **Source** column is **only visible to admins** (`org_admin` or `payroll_admin` roles)
- Non-admin users (managers, employees) do not see this column
- If the server returns `source: 'hidden'` (RBAC masking), the badge is not shown

### Badge Appearance
- **Manual** (red pill): `background: hsl(var(--badge-manual-bg))`, `color: hsl(var(--badge-manual-fg))`
- **Machine** (blue pill): `background: hsl(var(--badge-punch-bg))`, `color: hsl(var(--badge-punch-fg))`

## Approve Workflow

### Supervisor Approve
- Enabled only when `total_hours > 0`
- Button is **disabled** if total hours are zero (with tooltip explanation)
- Saves draft first, then approves

### HR Final Approve
- Same rules as Supervisor Approve
- Only available to admins
- Locks the timecard after approval (no further edits)

## Total Hours Calculation
- Displayed at the bottom right: **"Total: X.XX hours"**
- Calculated from `daily_hours` (or `hours` if `daily_hours` is null)
- Approve buttons are disabled when total is 0

## CSS Tokens (Design System)

### Badge Colors
```css
--badge-manual-bg: 0 100% 95%;     /* Light red background */
--badge-manual-fg: 0 100% 35%;     /* Dark red text */
--badge-punch-bg: 202 100% 95%;    /* Light blue background */
--badge-punch-fg: 202 100% 30%;    /* Dark blue text */
```

All colors use **HSL** format and are defined in `src/index.css`.

## Back-End Integration

### Save Draft Endpoint
```typescript
POST /api/timecards/:id/save-draft
Body: {
  companyCode: string;
  entries: [{ workDate: string; hours: number|null; payCode?: string }]
}
Response: {
  ok: boolean;
  timecard: { id, status, total_hours };
  days: [{ workDate, daily_hours, manual_hours, source, pay_code }]
}
```

### Approve Endpoint
```typescript
POST /api/timecards/:id/approve
Body: {
  level: 'supervisor' | 'payroll';
  actorId: uuid;
  companyCode: string;
}
```

### Server Recomputation
- When `manual_hours` is `null`, the server uses punch data to calculate `daily_hours`
- When `manual_hours` is set, the server uses that value for `daily_hours`
- `source` is set to `'manual'` or `'punch'` accordingly
- Total hours are always recalculated from the database

## User Experience Notes

- **No more blocked inputs** - the Hours column is now fully editable
- **Forgiving decimal entry** - accepts both `,` and `.` as decimal separators
- **Clear visual feedback** - badges show the data source, In/Out fields are disabled when manual
- **Instant validation** - errors are shown immediately, invalid values are rejected
- **Server truth** - all changes are persisted and the UI is updated from server response
- **Zero-hour protection** - cannot approve timecards with no hours

## Troubleshooting

### "Cannot type in Hours column"
- Check if the timecard is **final approved** (locked)
- Ensure the input is not covered by any pointer-events overlays
- Verify that `disabled` prop is `false`

### "Hours keep reverting"
- Check browser console for save errors
- Ensure the backend endpoint is reachable
- Verify the value is within 0-24 range

### "Source column not showing"
- Only admins can see the Source column
- Check your user role in the profile table
- If `source === 'hidden'`, the badge is intentionally hidden

### "Approve button disabled"
- Ensure `total_hours > 0` (displayed at bottom)
- Save the timecard first before approving
- Check for any validation errors in the toast notifications
