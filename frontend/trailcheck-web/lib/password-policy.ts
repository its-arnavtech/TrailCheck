export const PASSWORD_POLICY_HINT =
  'Use 12-128 characters with uppercase, lowercase, a number, and a symbol.';

export function passwordMeetsPolicy(password: string) {
  return (
    password.length >= 12 &&
    password.length <= 128 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
