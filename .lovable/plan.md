

## Plan: Replace Ranking API with Fast DB Proxy for Sender/Receiver Data

### What Changes

**File: `src/components/AdminHomeView.tsx`**

Replace the slow background enrichment calls (lines 1081-1117) that use the Ranking API (`galalivechat.com/api/ranking`) with two fast DB proxy calls:

- `https://hola-chat.com/db-proxy.php?key=ghala2026proxy&action=top-senders` → get `total_diamond_send`
- `https://hola-chat.com/db-proxy.php?key=ghala2026proxy&action=top-receivers` → get `total_diamond_received`

These replace the monthly ranking fetches and don't require a token or admin login.

### Technical Details

In the background enrichment IIFE (line 1058-1119), remove the two ranking API blocks (lines 1081-1117) and replace with:

```typescript
// Fast DB proxy for sender/receiver totals
const [sendersRes, receiversRes] = await Promise.all([
  fetch("https://hola-chat.com/db-proxy.php?key=ghala2026proxy&action=top-senders").then(r => r.json()).catch(() => ({ data: [] })),
  fetch("https://hola-chat.com/db-proxy.php?key=ghala2026proxy&action=top-receivers").then(r => r.json()).catch(() => ({ data: [] })),
]);

const senders = sendersRes?.data || [];
const receivers = receiversRes?.data || [];
const thisUserSent = senders.find((u: any) => String(u.uuid) === target);
const thisUserRecv = receivers.find((u: any) => String(u.uuid) === target);

if (thisUserSent || thisUserRecv) {
  setSearchResult((prev: any) => prev ? {
    ...prev,
    ...(thisUserSent ? { _sent_total: thisUserSent.total_diamond_send, _sent_usd: +(thisUserSent.total_diamond_send / 7500).toFixed(2) } : {}),
    ...(thisUserRecv ? { _recv_total: thisUserRecv.total_diamond_received, _recv_usd: +(thisUserRecv.total_diamond_received / 7500).toFixed(2) } : {}),
  } : prev);
}
```

The VIP enrichment via `find/users` + `profile/get` stays unchanged. Only the ranking calls are replaced.

