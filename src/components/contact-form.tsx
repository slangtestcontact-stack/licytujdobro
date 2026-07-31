"use client";
import { useActionState } from "react";
import { sendContactMessageAction, type MiscResult } from "@/actions/misc";
import { Alert, Button, Field, inputClass } from "@/components/ui";
const initial: MiscResult = { ok: false };
export function ContactForm() {
  const [state, action, pending] = useActionState(sendContactMessageAction, initial);
  if (state.ok) return <Alert tone="success" title="Wiadomość zapisana">Dziękujemy. Organizator odpowie na podany adres e-mail.</Alert>;
  return <form action={action} className="grid gap-4"><Field label="Imię lub pseudonim" htmlFor="contact-name" required><input id="contact-name" name="name" required className={inputClass}/></Field><Field label="E-mail" htmlFor="contact-email" required><input id="contact-email" name="email" type="email" required className={inputClass}/></Field><Field label="Temat" htmlFor="contact-subject" required><input id="contact-subject" name="subject" required className={inputClass}/></Field><Field label="Wiadomość" htmlFor="contact-message" required><textarea id="contact-message" name="message" required minLength={10} rows={6} className={inputClass}/></Field>{state.error&&<Alert tone="danger">{state.error}</Alert>}<Button type="submit" disabled={pending}>{pending?"Wysyłanie…":"Wyślij wiadomość"}</Button></form>;
}
