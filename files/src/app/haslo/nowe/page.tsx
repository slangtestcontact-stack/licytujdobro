import { resetPasswordAction } from "@/actions/auth";
import { NewPasswordForm } from "./new-password-form";

type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function NewPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] ?? "" : params.token ?? "";
  return <NewPasswordForm action={resetPasswordAction} token={token} />;
}
