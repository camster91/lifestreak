# LifeStreak design system

LifeStreak uses one semantic interaction contract across the habit-first app and optional Collections interface. This records the roles that must remain stable while the two interfaces are progressively consolidated; it is not a rebrand.

## Principles

- One primary action per view or destructive confirmation. Secondary actions remain visually quieter.
- Meaning never depends on colour alone. Status text, icons, patterns, or accessible names accompany colour.
- Interactive controls are at least 44 by 44 CSS pixels and expose a visible keyboard focus ring.
- Motion confirms change but is never required to understand state. Reduced-motion preference removes non-essential transitions and animations globally.
- Stored values and derived progress remain truthful: empty, unknown, partial, skipped, offline, and failed states are labelled rather than approximated.

## Semantic tokens

| Role              | Habit-first token       | Collections token                          | Use                                              |
| ----------------- | ----------------------- | ------------------------------------------ | ------------------------------------------------ |
| Canvas            | `--habit-bg`            | `--color-base-200`                         | Page background                                  |
| Surface           | `--habit-surface`       | `--color-base-100`                         | Cards, dialogs, navigation                       |
| Muted surface     | `--habit-surface-muted` | `--color-base-200`                         | Secondary regions and inactive controls          |
| Text              | `--habit-text`          | `--color-base-content`                     | Primary copy                                     |
| Muted text        | `--habit-text-muted`    | base-content opacity utilities             | Supporting copy                                  |
| Primary           | `--habit-primary`       | `--color-primary`                          | The single primary action and selected state     |
| Success           | `--habit-success`       | DaisyUI success role                       | Completed and verified states                    |
| Warning           | `--habit-warning`       | DaisyUI warning role                       | Partial, skipped, paused, and attention states   |
| Danger            | `--habit-danger`        | `--ls-danger-*` / DaisyUI error role       | Failed, destructive, and storage-recovery states |
| Focus             | `--habit-focus`         | `--ls-focus-ring`                          | Three-pixel visible focus outline                |
| Control radius    | 12px                    | `--ls-control-radius`                      | Buttons and compact fields                       |
| Touch size        | 44px                    | `--ls-control-min-size`                    | Minimum interactive target                       |
| Overlay elevation | `--habit-shadow`        | `--ls-overlay-shadow`                      | Dialogs, recovery alerts, mode switch            |
| Motion            | 140ms                   | `--ls-motion-fast`, `--ls-motion-standard` | Hover, press, and state transitions              |

Token aliases intentionally preserve the existing indigo habit character and blue/green Collections character while assigning the same semantic roles. New components must use a role token or framework semantic class, not a one-off hex value for UI state.

## Component and state contract

| Component                | Required states                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Button                   | default, hover, focus-visible, active, disabled, loading; primary, secondary, quiet, danger                     |
| Field                    | empty, populated, focus-visible, disabled, invalid with associated message                                      |
| Card                     | default, selected, completed, partial, failed, skipped, paused, archived, offline                               |
| Navigation               | default, hover, focus-visible, current/selected, disabled where applicable                                      |
| Calendar/history cell    | completed, partial, failed, skipped, unscheduled, future, paused, archived; visible label in addition to colour |
| Progress/chart           | named value, zero/empty, partial, complete, unknown/malformed; textual calculation available                    |
| Dialog/prompt            | labelled, initial focus, contained Tab order, Escape/cancel, destructive confirmation, focus restoration        |
| Toast/operation banner   | loading, success, warning, error; status announced without stealing focus                                       |
| Achievement              | earned and dismissed; reduced-motion equivalent without confetti or pulsing                                     |
| Offline/storage recovery | persistent named status, actionable recovery, retry, dismiss                                                    |

## Hierarchy

The current screen title and its main task establish the visual hierarchy. Creation or save is primary; navigation, export, edit, and disclosure are secondary; delete/reset is danger and requires a distinct confirmation. A screen must not present multiple visually primary buttons unless they are mutually exclusive choices within one task.

## Verification matrix

The production UI contract runs at 320x568, 390x844, 768x1024, and 1440x900 with reduced motion enabled. It checks overflow, accessible control names, 44px targets, dialog focus/containment/restoration, privacy opt-in, reading progress, portable backup round-trip, and offline persistence. Before closing #78, add stable screenshots for every route in light and dark themes plus the required empty, selected, loading, success, warning, error, offline, dialog, and achievement states, and complete manual contrast and assistive-technology review.
