export function getMissingBackendEnv(env = process.env) {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

  return required.filter((key) => {
    const value = env[key];
    return !value || !value.trim() || value.includes('YOUR_');
  });
}

export function ensureBackendEnv(env = process.env) {
  const missing = getMissingBackendEnv(env);

  if (missing.length > 0) {
    throw new Error(
      `Missing required backend environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env and fill in your Supabase project values.`
    );
  }

  return true;
}
