import { SiInstagram, SiLinkedin, SiYoutube, SiX } from "react-icons/si";

interface SocialLinksProps {
  className?: string;
}

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <a href="https://instagram.com/sarasota.tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
        <SiInstagram className="h-4 w-4" />
      </a>
      <a href="https://twitter.com/sarasota_tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
        <SiX className="h-4 w-4" />
      </a>
      <a href="https://youtube.com/@sarasota.tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
        <SiYoutube className="h-4 w-4" />
      </a>
      <a href="https://linkedin.com/company/sarasota-tech" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-foreground/80 transition-colors">
        <SiLinkedin className="h-4 w-4" />
      </a>
    </div>
  );
}