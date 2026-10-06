import { PlaceholderPage } from "@/components/placeholder-page";
import { getCurrentUser } from "@/lib/auth/user";
import { StatusBadge } from "@/components/ui";

export default async function AccountPage() {
  const user = await getCurrentUser();
  return <PlaceholderPage eyebrow="Identity" title="Account" description="Your local demo identity and assigned recruitment permissions."><section className="profile-panel"><div><span className="profile-label">Name</span><strong>{user?.fullName}</strong></div><div><span className="profile-label">Email</span><strong>{user?.email}</strong></div><div><span className="profile-label">Role</span><div className="role-list">{user?.roles.map((role) => <StatusBadge key={role} tone="active">{role.replaceAll("_", " ")}</StatusBadge>)}</div></div></section></PlaceholderPage>;
}
