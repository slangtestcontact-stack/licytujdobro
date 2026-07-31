import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 20, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HeartIcon(props: IconProps) { return <IconBase {...props}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></IconBase>; }
export function MapPinIcon(props: IconProps) { return <IconBase {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></IconBase>; }
export function ClockIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></IconBase>; }
export function UserIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></IconBase>; }
export function UsersIcon(props: IconProps) { return <IconBase {...props}><path d="M16 21a6 6 0 0 0-12 0"/><circle cx="10" cy="8" r="3.5"/><path d="M18 9a3 3 0 0 1 0 6M19.5 21a5 5 0 0 0-3-4.6"/></IconBase>; }
export function ShieldIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3 4.5 6v5.5c0 4.7 3.2 7.7 7.5 9.5 4.3-1.8 7.5-4.8 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/></IconBase>; }
export function SearchIcon(props: IconProps) { return <IconBase {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></IconBase>; }
export function PlusIcon(props: IconProps) { return <IconBase {...props}><path d="M12 5v14M5 12h14"/></IconBase>; }
export function GavelIcon(props: IconProps) { return <IconBase {...props}><path d="m14 6 4 4M9 11l-4-4 4-4 4 4-4 4ZM15 17l-4-4 4-4 4 4-4 4ZM4 20h10"/></IconBase>; }
export function CheckIcon(props: IconProps) { return <IconBase {...props}><path d="m5 12 4 4L19 6"/></IconBase>; }
export function ArrowRightIcon(props: IconProps) { return <IconBase {...props}><path d="M5 12h14M14 7l5 5-5 5"/></IconBase>; }
export function PackageIcon(props: IconProps) { return <IconBase {...props}><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></IconBase>; }
export function HandHeartIcon(props: IconProps) { return <IconBase {...props}><path d="M4 15h3l3.5 3.5a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0-2.8-2.8l-1.2 1.2"/><path d="M9 14 5.8 10.8a2 2 0 0 0-2.8 0L2 12"/><path d="M12 5.6c1.8-2.2 5.7-.7 5.7 2 0 2.2-2.2 3.8-5.7 6.4-3.5-2.6-5.7-4.2-5.7-6.4 0-2.7 3.9-4.2 5.7-2Z"/></IconBase>; }
export function MenuIcon(props: IconProps) { return <IconBase {...props}><path d="M4 7h16M4 12h16M4 17h16"/></IconBase>; }
export function BellIcon(props: IconProps) { return <IconBase {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></IconBase>; }
export function StarIcon(props: IconProps) { return <IconBase {...props}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></IconBase>; }
export function ShareIcon(props: IconProps) { return <IconBase {...props}><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.5-4.5M8.2 13.2l7.5 4.5"/></IconBase>; }
export function FlagIcon(props: IconProps) { return <IconBase {...props}><path d="M5 21V4M5 5h11l-2 4 2 4H5"/></IconBase>; }
export function EyeIcon(props: IconProps) { return <IconBase {...props}><path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/></IconBase>; }
export function CalendarIcon(props: IconProps) { return <IconBase {...props}><path d="M5 4v3M19 4v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13H4V7a1 1 0 0 1 1-1Z"/></IconBase>; }
export function AlertTriangleIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/></IconBase>; }
export function HomeIcon(props: IconProps) { return <IconBase {...props}><path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/></IconBase>; }
export function GridIcon(props: IconProps) { return <IconBase {...props}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></IconBase>; }
export function LockIcon(props: IconProps) { return <IconBase {...props}><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></IconBase>; }
export function RefreshIcon(props: IconProps) { return <IconBase {...props}><path d="M20 11a8 8 0 0 0-14.7-4L3 10M4 13a8 8 0 0 0 14.7 4L21 14"/><path d="M3 4v6h6M21 20v-6h-6"/></IconBase>; }
export function DownloadIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></IconBase>; }
export function CopyIcon(props: IconProps) { return <IconBase {...props}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></IconBase>; }
export function MegaphoneIcon(props: IconProps) { return <IconBase {...props}><path d="m3 11 14-6v14L3 13v-2Z"/><path d="M7 14v5a2 2 0 0 0 2 2h1l-1-6M17 9h3M18 5l2-2M18 15l2 2"/></IconBase>; }
export function TrophyIcon(props: IconProps) { return <IconBase {...props}><path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></IconBase>; }
export function MailIcon(props: IconProps) { return <IconBase {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></IconBase>; }
