# LifeStreak permissions and data flows

Last verified: 2026-08-28

This is the repository permission-to-feature and data-flow inventory for #59 and #63. Store declarations must be reviewed against a built release and current platform forms before submission.

## Native and browser permissions

| Permission/capability | Platform declaration | Reachable feature | Request timing | Data treatment |
|---|---|---|---|---|
| Local notifications | Android `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`; Capacitor Local Notifications | Optional habit and specialist reminders | Only after the user selects the notification control in Settings | Generic text by default; habit names require explicit opt-in. No remote push token or developer server is used. |
| Internet | Android `INTERNET`; normal iOS/web networking | Load the packaged web app, open allowlisted resources, optional user-configured Ollama connection | No permission prompt | Habit databases and specialist stores remain local. See network flows below. |
| Local files chosen by user | Browser/native web file picker | Import a LifeStreak JSON backup | Only after the user selects Import | File is parsed locally, bounded, validated, and not uploaded. |
| Download/share initiated by user | Browser/native web download/share surface | Export backups or explicitly share a summary | Only after a user action | Exported content is created locally; the chosen destination is controlled by the operating system/user. |

## Explicitly absent permissions and capabilities

- No Calendar permission or calendar plugin. Schedule calculations use local dates inside LifeStreak and do not read or write the device calendar.
- No App Tracking Transparency permission, advertising identifier, advertising SDK, analytics SDK, or cross-app tracking feature.
- No Contacts, Photos, Camera, Microphone, Health, Fitness, Location, Bluetooth, or background-location permission.
- No Capacitor Push Notifications dependency or configuration, push token registration, or remote push service.
- Android backup is disabled so private local records are not silently copied into platform cloud backup.

## Network flows

| Flow | Trigger | Sent | Received/used | Default state |
|---|---|---|---|---|
| Allowlisted external resource open | User selects a JW.org/Ashbi resource link | Standard browser request metadata; no LifeStreak database payload | Public page in the system browser | Available only from explicit links |
| Ollama connection test/chat | User configures an allowlisted local/Ollama host and initiates AI use | User-entered prompt plus optional session-only API credential | Model response shown in the app | Optional; no key is persisted or exported |
| Disabled news API | Legacy endpoint request | Standard HTTP request metadata | Empty disabled-feed response | Not part of the habit-first navigation |
| Production/PWA asset requests | App load/update | Standard web request metadata | Static LifeStreak assets and service-worker updates | Required for web install/update; installed cached use can work offline |

No habit names, schedules, completion history, quantitative values, notes, service records, reading records, goals, memories, or local error logs are intentionally sent to the developer by default.

## Diagnostics

`ls-error-logs` stores a bounded local record of errors, source/component stack, current URL, timestamp, and user agent. It is not transmitted automatically. Before release, verify error messages and URLs cannot include private habit content, and provide explicit local review/deletion if diagnostics remain enabled.

## Store disclosure gate

Before release:

1. Inspect the merged Android manifest and built iOS app entitlements/usage descriptions.
2. Exercise a clean install and record every permission prompt and the action that caused it.
3. Capture runtime network traffic for first launch, ordinary tracking, reminders, import/export, Collections, optional AI, and link opening.
4. Reconcile Apple Privacy Manifest/App Privacy and Google Data Safety answers with that evidence.
5. Re-run after any SDK, plugin, permission, analytics, crash-reporting, AI, sync, or notification change.

