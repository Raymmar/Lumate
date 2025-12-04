import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatUsernameForUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { User, Settings, LogOut, LogIn, Shield, Loader2, Sparkles, Menu, Ticket } from "lucide-react";
import { AdminBadge } from "@/components/AdminBadge";
import { useState } from "react";
import PeopleDirectory from "@/components/people/PeopleDirectory";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery } from "@tanstack/react-query";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isAdmin = Boolean(user?.isAdmin);
  const isAdminPage = location.startsWith("/admin");
  const isMembershipsPage = location === "/memberships";
  const [isOpen, setIsOpen] = useState(false);
  const { isPremium, startSubscription, isLoading } = useSubscription();

  const { data: couponsData } = useQuery<{ hasUnclaimedCoupons: boolean }>({
    queryKey: ["/api/user/coupons"],
    enabled: !!user && isPremium,
    staleTime: 60000,
  });

  const hasNewCoupons = couponsData?.hasUnclaimedCoupons || false;

  // Generate profile URL using username if available, fallback to API ID
  const profileUrl = user?.api_id ? 
    `/people/${encodeURIComponent(formatUsernameForUrl(user.displayName, user.api_id))}` : 
    '';

  return (
    <nav className="flex h-16 items-center pl-2 pr-4 w-full">
      <Link href="/">
        <div className="flex items-center">
          <img 
            src="/256x256.png" 
            alt="Luma Logo" 
            className="h-14 w-14 object-contain"
          />
        </div>
      </Link>
      <div className="hidden md:flex items-center space-x-4 ml-4">
        <Link href="/companies" className="no-underline hover:no-underline">
          <Button variant="ghost" size="sm" data-testid="nav-directory">
            Directory
          </Button>
        </Link>
        <Link href="/news" className="no-underline hover:no-underline">
          <Button variant="ghost" size="sm" data-testid="nav-news">
            News
          </Button>
        </Link>
        <Link href="/about" className="no-underline hover:no-underline">
          <Button variant="ghost" size="sm" data-testid="nav-about">
            About
          </Button>
        </Link>
        <Link href="/summit" className="no-underline hover:no-underline">
          <Button variant="ghost" size="sm" data-testid="nav-summit">
            Summit
          </Button>
        </Link>
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
                <Link href="/" className="no-underline hover:no-underline">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-base"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-home"
                  >
                    Home
                  </Button>
                </Link>
                <Link href="/companies" className="no-underline hover:no-underline">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-base"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-directory"
                  >
                    Directory
                  </Button>
                </Link>
                <Link href="/news" className="no-underline hover:no-underline">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-base"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-news"
                  >
                    News
                  </Button>
                </Link>
                <Link href="/about" className="no-underline hover:no-underline">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-base"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-about"
                  >
                    About
                  </Button>
                </Link>
                <Link href="/summit" className="no-underline hover:no-underline">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-base"
                    onClick={() => setIsOpen(false)}
                    data-testid="mobile-nav-summit"
                  >
                    Summit
                  </Button>
                </Link>
              </nav>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3 px-2">Search Members</h3>
                <PeopleDirectory onMobileSelect={() => setIsOpen(false)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        {user && isAdmin && (
          <AdminBadge className="mr-2" asLink />
        )}
        {user && isPremium && !isAdmin && (
          <PremiumBadge className="mr-2" />
        )}
        {user && !isPremium && !isLoading && (
          <Link href="/memberships">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Upgrade
            </Button>
          </Link>
        )}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <span className="flex items-center">
                      <Shield className="mr-2 h-4 w-4 text-foreground" />
                      Admin Dashboard
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
              {user.api_id && (
                <DropdownMenuItem asChild>
                  <Link href={profileUrl}>
                    <span className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-foreground" />
                      View Profile
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <span className="flex items-center justify-between w-full">
                    <span className="flex items-center">
                      <Settings className="mr-2 h-4 w-4 text-foreground" />
                      Settings
                    </span>
                    {hasNewCoupons && (
                      <span className="ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
                        <Ticket className="h-3 w-3" />
                        New
                      </span>
                    )}
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/company-profile">
                  <span className="flex items-center">
                    <svg className="mr-2 h-4 w-4 text-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 3v18" />
                      <path d="M10 7h4" />
                      <path d="M10 11h4" />
                      <path d="M10 15h4" />
                    </svg>
                    Company Profile
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <span className="flex items-center">
                  {logoutMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-foreground" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4 text-foreground" />
                  )}
                  {logoutMutation.isPending ? "Logging out..." : "Log out"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            {!isMembershipsPage && (
              <Link href="/memberships">
                <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Join Us
                </Button>
              </Link>
            )}
            <Link href="/login">
              <Button variant="default" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Log in
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}