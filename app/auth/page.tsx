import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{ mode?: string; message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const initialMode = params.mode === "signup" ? "signup" : "signin";

  return <main className="auth-shell"><AuthForm initialMode={initialMode} message={params.message} /></main>;
}
