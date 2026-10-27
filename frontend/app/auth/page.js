import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Authentication — ReSurface",
  description: "Sign in or register for your ReSurface account.",
};

export default function AuthPage() {
  return <AuthForm initialMode="login" />;
}
