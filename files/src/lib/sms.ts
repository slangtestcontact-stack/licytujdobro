import "server-only";

export interface SmsProvider {
  send(phone: string, message: string): Promise<{ ok: boolean }>;
}

class DevSmsProvider implements SmsProvider {
  async send(phone: string, message: string) {
    console.log(`[DEV SMS] do ${phone}: ${message}`);
    return { ok: true };
  }
}

class HttpSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<{ ok: boolean }> {
    const url = process.env.SMS_API_URL?.trim();
    const apiKey = process.env.SMS_API_KEY?.trim();
    if (!url || !apiKey) {
      throw new Error("Brak SMS_API_URL lub SMS_API_KEY.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        message,
        from: process.env.SMS_FROM || "LicytujDobro",
      }),
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(`Dostawca SMS zwrócił HTTP ${response.status}: ${details}`);
    }
    return { ok: true };
  }
}

class TwilioSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<{ ok: boolean }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_FROM?.trim() || process.env.SMS_FROM?.trim();

    if (!accountSid || !authToken || !from) {
      throw new Error(
        "Brak TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN lub TWILIO_FROM.",
      );
    }

    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: message,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(
        accountSid,
      )}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString(
            "base64",
          )}`,
        },
        body,
      },
    );

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500);
      throw new Error(`Twilio zwróciło HTTP ${response.status}: ${details}`);
    }
    return { ok: true };
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = (
    process.env.SMS_PROVIDER ||
    process.env.SMS_MODE ||
    "dev"
  ).toLowerCase();

  if (provider === "dev") return new DevSmsProvider();
  if (provider === "twilio") return new TwilioSmsProvider();
  return new HttpSmsProvider();
}

export function isSmsDevMode() {
  const provider = (
    process.env.SMS_PROVIDER ||
    process.env.SMS_MODE ||
    "dev"
  ).toLowerCase();
  return provider === "dev";
}

export function generateNumericCode(length = 6) {
  const bytes = new Uint32Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => String(value % 10)).join("");
}
