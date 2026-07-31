import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ ok: boolean }>;
}

class DevEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.log(
      `[DEV EMAIL] do ${message.to}: ${message.subject}\n${message.text}`,
    );
    return { ok: true };
  }
}

class HttpEmailProvider implements EmailProvider {
  constructor(private readonly defaultUrl?: string) {}

  async send(message: EmailMessage): Promise<{ ok: boolean }> {
    const url = process.env.EMAIL_API_URL?.trim() || this.defaultUrl;
    const apiKey = process.env.EMAIL_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();

    if (!url || !apiKey || !from) {
      throw new Error("Brak EMAIL_API_URL, EMAIL_API_KEY lub EMAIL_FROM.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(
        `Dostawca e-mail zwrócił HTTP ${response.status}: ${details}`,
      );
    }
    return { ok: true };
  }
}

export function getEmailProvider(): EmailProvider {
  const provider = (
    process.env.EMAIL_PROVIDER ||
    process.env.EMAIL_MODE ||
    "dev"
  ).toLowerCase();

  if (provider === "dev") return new DevEmailProvider();
  if (provider === "resend") {
    return new HttpEmailProvider("https://api.resend.com/emails");
  }
  return new HttpEmailProvider();
}

export function isEmailDevMode() {
  const provider = (
    process.env.EMAIL_PROVIDER ||
    process.env.EMAIL_MODE ||
    "dev"
  ).toLowerCase();
  return provider === "dev";
}
