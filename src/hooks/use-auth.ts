import { useState, useEffect } from 'react';
import { checkSession } from '@/lib/auth';

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkSession()
      .then(ok => setAuthenticated(ok))
      .finally(() => setLoading(false));
  }, []);

  return {
    authenticated,
    loading,
    user: authenticated ? { displayName: 'Admin' } : null,
  };
}
