import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-copy"><span className="eyebrow">WELCOME BACK</span><h1>Your next idea starts here.</h1><p>Sign in to keep your designs and orders together.</p></div><div className="auth-card"><h2>Sign in</h2><AuthForm mode="login" /></div></main>;
}
