# Sponsor Components - Usage Examples

The sponsor components are now fully modular and can be used anywhere on the site. Here are all the ways you can use them:

## 1. Full Sponsor Grid (All Tiers)

Show all sponsors for a specific year:

```tsx
import { SponsorGrid } from "@/components/sponsors";
import { Sparkles } from "lucide-react";

<SponsorGrid 
  year={2025}
  title="Our Amazing Sponsors"
  icon={<Sparkles className="h-5 w-5" />}
  showBecomeSponsorCTA={true}
/>
```

## 2. Filtered Sponsor Grid (Specific Tiers Only)

Show only specific sponsor tiers using the `tiers` prop:

### Show Only Series A Sponsors
```tsx
import { SponsorGrid } from "@/components/sponsors";

<SponsorGrid 
  year={2025}
  title="Premier Sponsors"
  tiers={["Series A"]}
  showBecomeSponsorCTA={false}
/>
```

### Show Only Nonprofits
```tsx
import { SponsorGrid } from "@/components/sponsors";

<SponsorGrid 
  year={2025}
  title="Nonprofit Partners"
  tiers={["Nonprofit"]}
  showBecomeSponsorCTA={true}
/>
```

### Show Multiple Specific Tiers
```tsx
import { SponsorGrid } from "@/components/sponsors";

<SponsorGrid 
  year={2025}
  title="Startup Supporters"
  tiers={["Seed", "MVP", "Prototype"]}
/>
```

### Education Page Example (Nonprofits + Education Tiers)
```tsx
import { SponsorGrid } from "@/components/sponsors";
import { GraduationCap } from "lucide-react";

<SponsorGrid 
  year={2025}
  title="Education Supporters"
  icon={<GraduationCap className="h-5 w-5" />}
  tiers={["Nonprofit", "Education"]}
  showBecomeSponsorCTA={true}
/>
```

## 3. Individual Sponsor Card

Display a single sponsor anywhere on your site:

### Using SingleSponsor Component (Easiest)
```tsx
import { SingleSponsor } from "@/components/sponsors";

// Display sponsor by ID
<SingleSponsor 
  sponsorId={42}
  showAdminControls={true}
/>
```

### Using SponsorCard Directly (More Control)
```tsx
import { SponsorCard } from "@/components/sponsors";
import { useQuery } from "@tanstack/react-query";

// Fetch and display a specific sponsor
const { data } = useQuery({
  queryKey: ["/api/sponsors/42"],
});

{data?.sponsor && (
  <SponsorCard 
    sponsor={data.sponsor}
    isAdmin={false}
  />
)}
```

## 4. Available Tier Keys

Use these tier keys in the `tiers` prop:

- `"Series A"` - Large premium sponsors (1 column layout)
- `"Seed"` - Medium sponsors (2 column layout)
- `"MVP"` - Small sponsors (3 column layout)
- `"Prototype"` - Micro sponsors (4 column layout)
- `"Nonprofit"` - Nonprofit organizations (custom layout)
- `"Education"` - Educational institutions (custom layout)

## 5. Real-World Examples

### Tech Conference Page
```tsx
<SponsorGrid 
  year={2025}
  title="2025 Summit Sponsors"
  tiers={["Series A", "Seed"]}
  showBecomeSponsorCTA={true}
/>
```

### Community Partners Sidebar
```tsx
<div className="space-y-4">
  <h3>Community Partners</h3>
  <SingleSponsor sponsorId={10} showAdminControls={false} />
  <SingleSponsor sponsorId={15} showAdminControls={false} />
  <SingleSponsor sponsorId={23} showAdminControls={false} />
</div>
```

### Homepage Hero Section
```tsx
<div className="grid grid-cols-3 gap-4">
  <SingleSponsor sponsorId={1} />
  <SingleSponsor sponsorId={2} />
  <SingleSponsor sponsorId={3} />
</div>
```

### Nonprofit Showcase Page
```tsx
<SponsorGrid 
  year={2025}
  title="Nonprofit Organizations We Support"
  tiers={["Nonprofit"]}
  showBecomeSponsorCTA={true}
/>
```

## 6. Component Props Reference

### SponsorGrid Props
- `year?: number` - Filter sponsors by year (default: current year)
- `title?: string` - Grid title (default: "Sponsors")
- `icon?: React.ReactNode` - Optional icon next to title
- `showBecomeSponsorCTA?: boolean` - Show "Become a Sponsor" button (default: true)
- `tiers?: string[]` - Filter to specific tiers (default: show all tiers)

### SingleSponsor Props
- `sponsorId: number` - The ID of the sponsor to display
- `isAdmin?: boolean` - Override admin status (default: auto-detect from auth)
- `onEdit?: (sponsor) => void` - Custom edit handler
- `onDelete?: (id) => void` - Custom delete handler
- `showAdminControls?: boolean` - Show admin controls (default: true)

### SponsorCard Props
- `sponsor: Sponsor` - The sponsor object to display
- `isAdmin?: boolean` - Show admin controls (default: false)
- `onEdit?: (sponsor) => void` - Edit callback
- `onDelete?: (id) => void` - Delete callback

## 7. Adaptive Layouts

The components automatically adapt their layout based on the sponsors shown:

- **1 sponsor in Series A**: Full width premium display
- **2 sponsors in Seed**: Two-column grid
- **Multiple in MVP**: Three-column responsive grid
- **Many in Prototype**: Four-column responsive grid

The grid intelligently handles empty states and shows admin CTAs when no sponsors exist in a tier.
