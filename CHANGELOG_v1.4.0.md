# Smaran v1.4.0

## Product direction
Smaran is now centered on the actual core loop:

**Create group → share phone-ready invite → add reminder/alarm → every member gets the shared event → enabled devices receive alerts automatically.**

## Removed from the UI
- Live acknowledgement roster
- Acknowledgement counts
- Member-by-member alarm status panels
- Roster language from onboarding and alarm screens

The old `event_acknowledgments` table is intentionally retained in the database for non-destructive migration compatibility, but the application no longer reads or writes it.

## Mobile/share fixes
- Invite modal detects the PC's private LAN IPv4 address through `/api/network-info`.
- QR codes and copied invite links use the phone-ready LAN URL during local development.
- Deployed apps use the normal HTTPS origin.
- Landing-page navigation uses regular anchors for maximum mobile robustness.
- Updated service-worker cache version and activation cleanup.

## Alert improvements
- Device-alert onboarding is available directly on the dashboard and join page.
- Browser notification fallback for new shared events when a tab is hidden.
- Existing push subscriptions are automatically refreshed when notification permission is already granted.
- Production Edge Function now claims both LOUD alarms and configured warning windows.

## Reliability
- Removed roster/ack data from the primary dashboard data path.
- Reduced realtime state to events and memberships.
- Group/event UI is smaller and faster on mobile.
