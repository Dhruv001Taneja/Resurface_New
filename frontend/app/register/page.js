import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Create Account — ReSurface",
  description: "Create a new ReSurface account using MongoDB authentication.",
};

export default function RegisterPage() {
  return <AuthForm initialMode="register" />;
}
