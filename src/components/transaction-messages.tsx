"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  sendTransactionMessageAction,
  type MessageActionResult,
  type TransactionMessageDto,
} from "@/actions/messages";
import { ArrowRightIcon, MailIcon } from "@/components/icons";
import { Alert, Button, inputClass } from "@/components/ui";

const initialState: MessageActionResult = { ok: false };

function mergeMessages(
  current: TransactionMessageDto[],
  incoming: TransactionMessageDto[],
) {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TransactionMessages({
  transactionId,
  currentUserId,
  counterpartNickname,
  initialMessages,
  readOnly = false,
}: {
  transactionId: string;
  currentUserId: string;
  counterpartNickname: string;
  initialMessages: TransactionMessageDto[];
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [state, formAction, pending] = useActionState(
    sendTransactionMessageAction,
    initialState,
  );
  const [body, setBody] = useState("");
  const handledMessageId = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.ok || !state.message) return;
    if (handledMessageId.current === state.message.id) return;
    handledMessageId.current = state.message.id;
    setMessages((current) => mergeMessages(current, [state.message!]));
    setBody("");
  }, [state]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    let active = true;

    async function refreshMessages() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(
          `/api/transactions/${transactionId}/messages`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          ok?: boolean;
          messages?: TransactionMessageDto[];
        };
        if (!active || !data.ok || !data.messages) return;
        setMessages((current) => mergeMessages(current, data.messages!));
      } catch {
        // Rozmowa nadal działa. Kolejna próba odbędzie się automatycznie.
      }
    }

    const interval = window.setInterval(refreshMessages, 12_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [transactionId]);

  return (
    <div className="flex min-h-[560px] flex-col">
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-800">
            <MailIcon size={18} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-ink">
              Rozmowa z {counterpartNickname}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Piszcie wyłącznie w sprawie odbioru tego przedmiotu.
            </p>
          </div>
        </div>
      </div>

      <div
        className="flex-1 space-y-3 overflow-y-auto py-5 pr-1"
        aria-live="polite"
      >
        {messages.length ? (
          messages.map((message) => {
            const own = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${own ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-xl px-4 py-3 sm:max-w-[72%] ${
                    own
                      ? "bg-brand-100 text-brand-900"
                      : "border border-slate-200 bg-white text-ink"
                  }`}
                >
                  {!own ? (
                    <p className="mb-1 text-[11px] font-bold text-brand-700">
                      {message.senderNickname}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.body}
                  </p>
                  <time className="mt-1.5 block text-right text-[10px] text-slate-500">
                    {formatTime(message.createdAt)}
                  </time>
                </div>
              </div>
            );
          })
        ) : (
          <div className="mx-auto my-12 max-w-md rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-6 text-center">
            <MailIcon size={24} className="mx-auto text-brand-700" />
            <p className="mt-3 font-bold text-ink">Rozpocznij rozmowę</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ustalcie dogodny termin i publiczne miejsce osobistego odbioru.
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {readOnly ? (
        <div className="border-t border-slate-100 pt-4 text-sm text-slate-500">
          Administrator ma wyłącznie podgląd rozmowy.
        </div>
      ) : (
        <form action={formAction} className="border-t border-slate-100 pt-4">
          <input type="hidden" name="transactionId" value={transactionId} />
          {state.error ? (
            <div className="mb-3">
              <Alert tone="danger">{state.error}</Alert>
            </div>
          ) : null}
          <label htmlFor="transaction-message" className="sr-only">
            Napisz wiadomość
          </label>
          <div className="flex items-end gap-2">
            <textarea
              id="transaction-message"
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={`${inputClass} min-h-11 resize-none`}
              rows={2}
              maxLength={1000}
              placeholder="Napisz wiadomość…"
              required
              disabled={pending}
            />
            <Button
              type="submit"
              disabled={pending || body.trim().length === 0}
              className="shrink-0"
            >
              {pending ? (
                "Wysyłanie…"
              ) : (
                <>
                  <span className="hidden sm:inline">Wyślij</span>
                  <ArrowRightIcon size={17} />
                </>
              )}
            </Button>
          </div>
          <div className="mt-2 flex justify-between gap-3 text-[11px] text-slate-400">
            <span>Nie podawaj kodów BLIK ani haseł.</span>
            <span>{body.length}/1000</span>
          </div>
        </form>
      )}
    </div>
  );
}
