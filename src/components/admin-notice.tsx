export function AdminNotice({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <div className="admin-notice error" role="alert">{error}</div>;
  if (saved) return <div className="admin-notice success" role="status">Changes saved.</div>;
  return null;
}
