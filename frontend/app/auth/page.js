import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Authentication — RESecure",
  description: "Sign in or register for your RESecure account.",
};

export default function AuthPage() {
  return <AuthForm initialMode="login" />;
}
