import { 
  Sprout,
  BadgeDollarSign,
  HandMetal,
  Tickets,
  HeartHandshake,
  Loader,
  Shield
} from 'lucide-react';

const iconMap: Record<string, typeof Sprout> = {
  'sprout': Sprout,
  'badge-dollar-sign': BadgeDollarSign,
  'hand-metal': HandMetal,
  'tickets': Tickets,
  'heart-handshake': HeartHandshake,
  'loader': Loader,
};

export function getBadgeIcon(iconName: string) {
  const Icon = iconMap[iconName];
  if (!Icon) {
    console.warn(`Icon "${iconName}" not found, using Shield as fallback`);
    return <Shield className="h-3 w-3" />;
  }
  return <Icon className="h-3 w-3" />;
}
