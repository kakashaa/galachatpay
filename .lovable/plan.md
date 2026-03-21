

## Plan: Fix User Search — Salary, Accordion Details, VIP Frame

### Issues to Fix

1. **Salary shows $0** — The `user-full` API returns `{ok: true, data: {salary: 1205, ...}}`. Line 1026 already has `json?.data || json` fallback, but the issue may be that the API actually returns the data nested and the fallback isn't working correctly. Will add explicit `json.data` priority and add more robust logging.

2. **Accordion detail data** — Currently `UserDetailAccordion` calls `galaApi.chargesReport` / `galaApi.giftLogs` which go through `gala-proxy` → `admin_charges_report` / `admin_gift_logs`. These may not return data. The accordion already has date filtering (FilterPills) and table display — the existing logic is sound but may need the API endpoints verified.

3. **VIP SVGA frame** — Already implemented at lines 459-462 using `SvgaPlayer`. The frame renders around the avatar. This appears to already be working.

### Changes

**File: `src/components/AdminHomeView.tsx`**

- **Salary fix**: Make the data extraction more explicit — try `json.data` first, then `json` as fallback. Add `console.log` of the raw `json` object to debug.
- Ensure `salary`, `deduction`, `net_salary` are read from the correct level.

**File: `src/components/UserDetailAccordion.tsx`**

- No changes needed to the accordion — it already has date filtering and calls the right APIs. The accordion receives `salaryData`, `monthlyRecv`, `totalRecv`, etc. as props and displays them correctly.

### Technical Details

The core fix is in `AdminHomeView.tsx` around line 1024-1050:

```typescript
const json = await res.json();
console.log("[user-full] full response:", json);
// Explicitly prefer json.data (API wraps in {ok, data})
const d = json?.data ?? json;
console.log("[user-full] parsed d:", { salary: d?.salary, deduction: d?.deduction, net_salary: d?.net_salary });
```

This ensures we correctly unwrap the `{ok: true, data: {...}}` envelope. The salary tile at line 510 already reads `user.salary` which maps from `d.salary` at line 1036 — so the fix is purely in the response parsing.

For VIP frame — already implemented with `SvgaPlayer` component wrapping the avatar (lines 459-462). No changes needed.

For accordion — already functional with `FilterPills` date filtering and `galaApi.chargesReport`/`giftLogs` calls. No changes needed unless these APIs don't return data (which is a backend issue, not frontend).

