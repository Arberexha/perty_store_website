export function AdminNotice({ saved, deleted, error }: { saved?: string; deleted?: string; error?: string }) {
  if (error) return <div className="admin-notice error" role="alert">{error}</div>;
  if (deleted) return <div className="admin-notice success" role="status">Product deleted.</div>;
  if (saved) return <div className="admin-notice success" role="status">Changes saved.</div>;
  return null;
}
