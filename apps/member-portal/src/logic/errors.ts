// Turning Supabase errors into honest, actionable messages.

export interface ErrorLike {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

/**
 * Sign-up is refused by a database trigger when the invite is missing, wrong,
 * used, revoked or expired. Supabase reports every such refusal as a generic
 * 500 "Database error saving new user" and deliberately does not say which, so
 * the message names the likely causes without claiming to know.
 */
export function signUpErrorMessage(err: ErrorLike | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.';
  const msg = (err.message ?? '').toLowerCase();
  if (err.status === 500 || msg.includes('database error saving new user')) {
    return 'We could not create an account with that email and invitation code. Check that the email matches your invitation exactly and the code has not been used or expired. If it still fails, ask the person who invited you for a new code.';
  }
  if (msg.includes('already registered') || err.code === 'user_already_exists') {
    return 'An account already exists for this email. Sign in, or reset your password.';
  }
  if (msg.includes('password') && (msg.includes('least') || msg.includes('weak') || err.code === 'weak_password')) {
    return 'That password is too weak. Use at least 10 characters.';
  }
  if (err.status === 429 || msg.includes('rate limit')) {
    return 'Too many attempts. Wait a few minutes and try again.';
  }
  if (msg.includes('email address not authorized') || err.code === 'email_address_not_authorized') {
    return 'The portal cannot send confirmation emails yet. The administrator needs to finish email setup.';
  }
  return err.message || 'Something went wrong. Please try again.';
}

export function signInErrorMessage(err: ErrorLike | null | undefined): string {
  if (!err) return 'Something went wrong. Please try again.';
  const msg = (err.message ?? '').toLowerCase();
  if (msg.includes('invalid login') || err.code === 'invalid_credentials') return 'Email or password is incorrect.';
  if (msg.includes('email not confirmed') || err.code === 'email_not_confirmed') return 'Confirm your email first — open the link we sent when you signed up.';
  if (err.status === 429 || msg.includes('rate limit')) return 'Too many attempts. Wait a few minutes and try again.';
  return err.message || 'Something went wrong. Please try again.';
}

/** Generic data errors: keep RLS refusals plain. */
export function dataErrorMessage(err: ErrorLike | null | undefined): string {
  if (!err) return '';
  if (err.code === '42501' || (err.message ?? '').toLowerCase().includes('row-level security')) {
    return 'You do not have permission to do that.';
  }
  return err.message || 'Something went wrong.';
}
