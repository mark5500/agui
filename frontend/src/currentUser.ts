/** Stand-in for a real auth/session system — there's no login flow in this demo,
 * so this is the one "logged in" identity everything (the profile menu, feedback
 * submissions) attributes to. */
export const CURRENT_USER = {
  name: 'John Smith',
  email: 'john@example.com',
  initials: 'JS',
}
