import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Sign In — ReSurface",
  description: "Sign in to your ReSurface AI Screenshot Intelligence account.",
};

export default function LoginPage() {
  return <AuthForm initialMode="login" />;
}
