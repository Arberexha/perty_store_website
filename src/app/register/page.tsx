import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return <main className="auth-page"><div className="auth-copy"><span className="eyebrow">MAKE IT YOURS</span><h1>Save every idea you make.</h1><p>Create an account to keep designs and track your future orders.</p></div><div className="auth-card"><h2>Create account</h2><AuthForm mode="register" /></div></main>;
}
