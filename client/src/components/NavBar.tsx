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
import { User, Settings, LogOut, LogIn, Shield, Loader2, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { ClaimProfileDialog } from "@/components/ClaimProfileDialog";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface NavBarProps {
  onOpenDirectory?: () => void;
  isDirectoryOpen?: boolean;
}

export function NavBar({ onOpenDirectory, isDirectoryOpen }: NavBarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isAdmin = Boolean(user?.isAdmin);
  const isAdminPage = location.startsWith("/admin");

  // Generate profile URL using username if available, fallback to API ID
  const profileUrl = user ? `/people/${encodeURIComponent(formatUsernameForUrl(user.displayName, user.api_id))}` : '';

  return (
    <nav className="flex h-16 items-center pl-2 pr-4 w-full">
      <div className="lg:hidden">
        <Drawer open={isDirectoryOpen} onOpenChange={onOpenDirectory}>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon">
              <List className="h-5 w-5" />
              <span className="sr-only">Toggle directory</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            {/* Drawer content would go here */}
          </DrawerContent>
        </Drawer>
      </div>
      <Link href="/">
        <div className="flex items-center">
          <img 
            src="/256x256.png" 
            alt="Luma Logo" 
            className="h-14 w-14 object-contain"
          />
        </div>
      </Link>
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
                  Claim Your Account
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