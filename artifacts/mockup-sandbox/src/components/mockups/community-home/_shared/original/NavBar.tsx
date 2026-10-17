import { useState } from "react";
import { LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PeopleDirectory } from "./HomeSections";

type HomeContent = Record<string, any>;

/** Dashboard's public navigation, with router/auth controls replaced by safe links. */
export function NavBar({ content }: { content: HomeContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { label: "Directory", href: "#directory" },
    { label: "News", href: "#news" },
    { label: "About", href: "#about" },
    { label: "Summit", href: "#summit" },
    { label: "Speakers", href: "#speakers" },
  ];
  const logo = content.logo || content.logoUrl || content.assets?.logo || content.brand?.logo || "/__mockup/images/sarasota-logo.png";

  return (
    <nav className="flex h-16 items-center pl-2 pr-4 w-full">
      <a href="#home" className="no-underline hover:no-underline">
        <div className="flex items-center">
          <img src={logo} alt="Luma Logo" className="h-14 w-14 object-contain" />
        </div>
      </a>
      <div className="hidden md:flex items-center space-x-4 ml-4">
        {navItems.map(item => (
          <a key={item.label} href={item.href} className="no-underline hover:no-underline">
            <Button variant="ghost" size="sm" data-testid={`nav-${item.label.toLowerCase()}`}>{item.label}</Button>
          </a>
        ))}
      </div>
      <div className="md:hidden ml-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="button-mobile-menu" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 sm:w-96 overflow-y-auto">
            <div className="mt-6 space-y-6">
              <nav className="space-y-2">
                <a href="#home" className="no-underline hover:no-underline" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start text-base">Home</Button>
                </a>
                {navItems.map(item => (
                  <a key={item.label} href={item.href} className="no-underline hover:no-underline" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-base">{item.label}</Button>
                  </a>
                ))}
              </nav>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 px-2">Search Members</h3>
                <PeopleDirectory content={content} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        <a href="#membership">
          <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Join Us</Button>
        </a>
        <a href="#login">
          <Button variant="default" size="sm"><LogIn className="mr-2 h-4 w-4" />Log in</Button>
        </a>
      </div>
    </nav>
  );
}
