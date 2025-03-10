import { SiLinkedin, SiFacebook, SiInstagram, SiX, SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";

interface SocialLinksProps {
  className?: string;
  iconClassName?: string;
}

export const socialLinks = [
  {
    Icon: SiLinkedin,
    href: "https://www.linkedin.com/company/102671680/admin/feed/posts/",
    label: "LinkedIn",
  },
  {
    Icon: SiFacebook,
    href: "https://www.facebook.com/sarasotatechgroup/",
    label: "Facebook",
  },
  {
    Icon: SiInstagram,
    href: "https://www.instagram.com/sarasota.tech/",
    label: "Instagram",
  },
  {
    Icon: SiX,
    href: "https://twitter.com/SarasotaTech",
    label: "X (Twitter)",
  },
  {
    Icon: SiWhatsapp,
    href: "https://chat.whatsapp.com/FDBEXC9a5up7PPst5dkGbl",
    label: "WhatsApp",
  },
];

export function SocialLinks({ className, iconClassName }: SocialLinksProps) {
  return (
    <div className={cn("flex gap-6", className)}>
      {socialLinks.map(({ Icon, href, label }) => (
        <a
          key={label}
          href={href}
          className={cn(
            "text-muted-foreground hover:text-primary transition-colors",
            iconClassName
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon className="w-6 h-6" />
          <span className="sr-only">{label}</span>
        </a>
      ))}
    </div>
  );
}