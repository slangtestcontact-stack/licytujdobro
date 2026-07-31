import { EmptyState, LinkButton } from "@/components/ui";
export default function NotFound(){return <main className="page-shell max-w-2xl py-20"><EmptyState title="Nie znaleziono strony" description="Adres jest nieprawidłowy albo treść nie jest publicznie dostępna." action={<LinkButton href="/">Wróć na start</LinkButton>}/></main>}
