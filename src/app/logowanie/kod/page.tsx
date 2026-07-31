import {
  requestEmailLoginCodeAction,
  verifyEmailLoginCodeAction,
} from "@/actions/auth";
import { EmailCodeForm } from "./email-code-form";

type PageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function EmailCodeLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";

  return (
    <EmailCodeForm
      requestAction={requestEmailLoginCodeAction}
      verifyAction={verifyEmailLoginCodeAction}
      returnTo={returnTo}
    />
  );
}
