import { requestPasswordResetAction } from "@/actions/auth";
import { ResetRequestForm } from "./reset-request-form";

export default function PasswordResetPage() {
  return <ResetRequestForm action={requestPasswordResetAction} />;
}
