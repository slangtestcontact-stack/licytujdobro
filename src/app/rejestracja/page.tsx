import { registerAction } from "@/actions/auth";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm action={registerAction} />;
}
