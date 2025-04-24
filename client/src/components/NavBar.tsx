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
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { User, Settings, LogOut, LogIn, Shield, Loader2, Briefcase, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { useState } from "react";
import PeopleDirectory from "@/components/people/PeopleDirectory";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isAdmin = Boolean(user?.isAdmin);
  const isAdminPage = location.startsWith("/admin");
  const [isOpen, setIsOpen] = useState(false);

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
          <Button variant="ghost" size="sm" className="flex items-center">
            <Briefcase className="h-4 w-4 mr-2" />
            Directory
          </Button>
        </Link>
        <Link href="/news" className="no-underline hover:no-underline">
          <Button variant="ghost" size="sm" className="flex items-center">
            <Newspaper className="h-4 w-4 mr-2" />
            News
          </Button>
        </Link>
      </div>
      <div className="lg:hidden ml-2">
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">
              Directory
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="max-h-[calc(100vh-4rem)] overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-57px)]">
                <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-hidden min-h-0">
                    <PeopleDirectory onMobileSelect={() => setIsOpen(false)} />
                  </div>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        {user && isAdmin && (
          <AdminBadge className="mr-2" asLink />
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
                  <span className="flex items-center">
                    <Settings className="mr-2 h-4 w-4 text-foreground" />
                    Edit Profile
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
            <ClaimProfileDialog 
              trigger={
                <Button variant="outline" size="sm">
                  Claim Your Profile
                </Button>
              }
            />
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