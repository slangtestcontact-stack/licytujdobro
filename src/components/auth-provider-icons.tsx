import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

export function FacebookMark({ size = 28, ...props }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} {...props}>
      <circle cx="16" cy="16" r="16" fill="#1877F2" />
      <path fill="#fff" d="M18.1 27V17.2h3.3l.5-3.8h-3.8V11c0-1.1.3-1.9 1.9-1.9h2V5.7c-.3 0-1.5-.2-2.9-.2-2.9 0-4.9 1.8-4.9 5.1v2.8H11v3.8h3.2V27h3.9Z" />
    </svg>
  );
}

export function AppleMark({ size = 28, ...props }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} fill="currentColor" {...props}>
      <path d="M22.9 16.9c0-3.6 3-5.4 3.1-5.5a6.6 6.6 0 0 0-5.2-2.8c-2.2-.2-4.3 1.3-5.4 1.3-1.1 0-2.8-1.3-4.6-1.2a6.8 6.8 0 0 0-5.7 3.5c-2.4 4.2-.6 10.4 1.7 13.8 1.1 1.7 2.5 3.5 4.3 3.4 1.7-.1 2.4-1.1 4.5-1.1 2.1 0 2.7 1.1 4.5 1.1 1.9 0 3.1-1.7 4.2-3.4 1.3-1.9 1.8-3.8 1.8-3.9-.1 0-3.2-1.2-3.2-5.2ZM19.4 6.3A5.9 5.9 0 0 0 20.8 2a6 6 0 0 0-4 2.1 5.6 5.6 0 0 0-1.5 4.1 5 5 0 0 0 4.1-1.9Z" />
    </svg>
  );
}

export function GoogleMark({ size = 28, ...props }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} {...props}>
      <path fill="#4285F4" d="M30.5 16.3c0-1-.1-2-.3-2.9H16v5.8h8.1a7 7 0 0 1-3 4.5v3.8h4.9c2.9-2.7 4.5-6.6 4.5-11.2Z" />
      <path fill="#34A853" d="M16 31c4.1 0 7.6-1.4 10.1-3.6l-4.9-3.8a9.3 9.3 0 0 1-13.8-4.9H2.3v3.9A15.3 15.3 0 0 0 16 31Z" />
      <path fill="#FBBC05" d="M7.4 18.7a9.2 9.2 0 0 1 0-5.8V9H2.3a15.3 15.3 0 0 0 0 13.6l5.1-3.9Z" />
      <path fill="#EA4335" d="M16 6.7c2.3 0 4.4.8 6 2.4l4.5-4.5A15.1 15.1 0 0 0 2.3 9l5.1 3.9A9.2 9.2 0 0 1 16 6.7Z" />
    </svg>
  );
}

export function MailMark({ size = 26, ...props }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="7" width="24" height="18" rx="3" />
      <path d="m6 10 10 8 10-8" />
    </svg>
  );
}
