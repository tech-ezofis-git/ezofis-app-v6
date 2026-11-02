# Request comments refetch

Commit: `20abf7c4` on `dev-raja` — fix(requests): refetch agent comments without reopening the request

## Problem

Agents post their comments with (or just after) their result. The request page
only loaded comments once, so new agent comments showed up only after closing
and reopening the request. A slow or failed comments call could also wipe the
list to `[]`.

## Changes

| File | Change |
| --- | --- |
| `components/request/Request.tsx` | Refetch comments along with attachments when a document is generated and on `REQUEST_ATTACHMENTS_CHANGED_EVENT`. A new effect refetches comments 3s after agent data changes (request detail `dataUpdatedAt`, stage, transaction id, agent data, AP agent job completion). |
| `hooks/useComments.ts` | Only the latest call may update the state (sequence ref). The list is cleared only when the workflow/instance id changes; a failed refresh keeps the last good list. |
| `components/request/components/generic-overview/AgentSummaryBoxes.tsx` | Now exports `isShownInRequestPage` (moved from `GenericRequestOverview.tsx`). |
| `components/request/components/generic-overview/GenericRequestOverview.tsx` | Imports `isShownInRequestPage` instead of defining it. |
| `components/workflow-request/WorkflowRequest.tsx` | The new-request status cards show only agents with "Show agent on request page" set, the same rule as the request page after it is created. |

## How to check

1. Open a generic workflow request that has an agent stage.
2. Let the agent finish: its comments should appear within a few seconds without reopening the request.
3. On a new request, agents with "Show agent on request page" off should not show a status card.
