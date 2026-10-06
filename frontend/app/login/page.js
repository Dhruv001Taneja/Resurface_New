import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Sign In — RESecure",
  description: "Sign in to your RESecure AI Screenshot Intelligence account.",
};

export default function LoginPage() {
  return <AuthForm initialMode="login" />;
}
