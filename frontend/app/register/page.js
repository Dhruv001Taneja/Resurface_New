import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Create Account — RESecure",
  description: "Create a new RESecure account using MongoDB authentication.",
};

export default function RegisterPage() {
  return <AuthForm initialMode="register" />;
}
