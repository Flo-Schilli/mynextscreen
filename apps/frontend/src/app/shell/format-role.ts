/**
 * Maps a backend org-membership role key to a short human-readable label.
 * Shared by the top bar org indicator and the organisation-switch modal so the
 * label stays consistent across both surfaces.
 */
export function formatRole(role: string): string {
  switch (role) {
    case 'org_admin':
      return 'Admin';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Viewer';
    default:
      return role;
  }
}
