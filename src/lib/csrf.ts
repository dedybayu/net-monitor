export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(^| )x-csrf-token=([^;]+)'));
  if (match) {
    return match[2];
  }
  return '';
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}
