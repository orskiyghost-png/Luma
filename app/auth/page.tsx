import { AuthForm } from "./auth-form";

type AuthPageProps = {
  searchParams: Promise<{ mode?: string; message?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const initialMode = params.mode === "reset" ? "reset" : params.mode === "signup" ? "signup" : "signin";
  return <AuthForm initialMode={initialMode} message={params.message} />;
}
