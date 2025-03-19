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
import { User, Settings, LogOut, LogIn, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import { useState } from "react";
import PeopleDirectory from "@/components/people/PeopleDirectory";

interface NavBarProps {
  hideDirectoryLink?: boolean;
}

export function NavBar({ hideDirectoryLink = false }: NavBarProps) {
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
    <nav className="flex h-16 items-center pl-2 pr-4 w-full min-w-full">
      <div className="flex items-center flex-1 min-w-0">
        <Link href="/">
          <div className="flex items-center">
            <img 
              src="/256x256.png" 
              alt="Luma Logo" 
              className="h-14 w-14 object-contain"
            />
          </div>
        </Link>
        {!hideDirectoryLink && (
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
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {user && isAdmin && (
          <AdminBadge className="mr-2 hidden sm:flex" asLink />
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
                  Claim Account
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