# Remember Me Specification

## Problem Statement

Users can refresh the current page without losing their session, but the existing email OTP token is
stored only for the current browser tab. Closing the tab discards the frontend token even though the
backend session remains valid for up to seven days.

## Solution

Add an unchecked `Remember me` option to login. A normal login remains scoped to the current browser
session. A remembered login persists across browser restarts, while the backend remains the sole
authority for the existing seven-day session lifetime. An expired or revoked token is removed after
the backend returns `401`.

## User Stories

1. As a returning user, I want to opt into a remembered login, so that reopening the browser does not require another email code while my backend session is valid.
2. As a user on a shared device, I want `Remember me` to be off by default, so that persistent login requires an explicit choice.
3. As a user who does not select `Remember me`, I want refreshes in the current tab to preserve my login, so that ordinary navigation is uninterrupted.
4. As a user who does not select `Remember me`, I want closing the tab to discard the frontend token, so that the next browser session requires login.
5. As a user who selects `Remember me`, I want the frontend token to survive browser restarts, so that I can return without requesting another code.
6. As a user with an expired or revoked backend session, I want to be returned to login, so that the application does not treat stale frontend state as authenticated.
7. As a keyboard user, I want the checkbox and its label to be focusable and operable, so that I can choose persistence without a pointer.
8. As a mobile user, I want the entire checkbox row to provide a usable touch target, so that the option is easy to select.
9. As a developer using mock mode, I want the same persistence choice, so that development behavior represents the production interaction without storing a password.

## Implementation Decisions

- Keep the backend and its existing seven-day Better Auth session policy unchanged.
- Keep the email OTP request contract unchanged; `Remember me` is a frontend persistence choice and is not sent to the backend.
- Store non-remembered tokens in session storage and remembered tokens in local storage.
- Make writes mutually exclusive by clearing both storage locations before writing the selected one.
- Read persistent storage first and fall back to session storage, preserving compatibility with both login modes.
- Clear both locations on explicit sign-out and on an authenticated request returning `401`.
- Preserve the in-memory fallback when Web Storage is unavailable.
- Keep `Remember me` unchecked by default and use the exact visible label `Remember me`.
- Apply the same storage choice to the development-only mock session without storing the mock password.
- Do not duplicate the backend expiry timestamp or run a frontend expiry timer. The authenticated profile request remains the source of truth after application startup.

## Testing Decisions

- Test at the existing email OTP API-client seam because it covers the user-visible persistence choice and the unchanged backend request contract together.
- Assert that remembered login writes only persistent storage and normal login writes only session storage.
- Assert that the email OTP request body remains limited to the existing email and OTP fields.
- Retain the existing API-client test proving that `401` clears the token before the next request.
- Prefer observable requests and Web Storage state over tests of internal helper calls.

## Out of Scope

- Backend session-duration changes, refresh tokens, or schema migrations.
- A selectable seven-day versus thirty-day duration.
- Storing email addresses, passwords, or OTP codes.
- A client-side session countdown or expiry timestamp.
- Replacing the existing Bearer-token authentication architecture with cookie-only authentication.
- Synchronizing logout state across tabs before the backend rejects the token.

## Further Notes

The backend session is authoritative. A remembered token may remain in local storage after its server
session expires, but the existing startup profile request receives `401`, clears both storage
locations, and redirects to login. This avoids maintaining a second expiry policy in the browser.
