import { completeQuickAccountAction } from "@/actions/auth";
import { CompleteAccountForm } from "./complete-account-form";

type PageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function CompleteAccountPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = raw?.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  return <CompleteAccountForm action={completeQuickAccountAction} returnTo={returnTo} />;
}
