import { loginAction } from "@/actions/auth";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
    error?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedReturnTo = first(params.returnTo);
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/dashboard";

  return (
    <LoginForm
      action={loginAction}
      returnTo={returnTo}
      oauthError={first(params.error)}
    />
  );
}
