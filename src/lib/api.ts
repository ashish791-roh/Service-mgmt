export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  return (
    document.cookie
      .split('; ')
      .find(r => r.startsWith('fixhub_csrf='))
      ?.split('=')[1] ?? ''
  );
}

export function jsonHeaders(): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}

export function triggerGlobalToast(message: string, type: 'success' | 'error' | 'info' = 'error') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fixhub:toast', {
        detail: { message, type },
      })
    );
  }
}
