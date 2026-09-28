import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccountPage() {
  const user = await requireUser();
  return <main className="inner-page"><span className="eyebrow">YOUR SPACE</span><h1>Hello, {user.name}.</h1><p>Your designs and orders will appear here as the store takes shape.</p><div className="account-card"><div><strong>Account</strong><p>{user.email}</p></div><SignOutButton /></div>{user.role === "admin" && <Link className="button button-primary" href="/admin">Open admin dashboard</Link>}</main>;
}
