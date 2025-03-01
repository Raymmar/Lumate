import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, LogIn, Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { ADMIN_EMAILS } from "@/components/AdminGuard";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const isAdminPage = location.startsWith("/admin");

  return (
    <header className="sticky top-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 shadow-sm">
      <nav className="flex h-16 items-center pl-2 pr-4">
        <Link href="/">
          <div className="flex items-center">
            <img 
              src="/256x256.png" 
              alt="Luma Logo" 
              className="h-14 w-14 object-contain"
            />
          </div>
        </Link>
        {isAdminPage && (
          <Link href="/">
            <Button 
              variant="secondary"
              className="ml-4"
            >
              View Directory
            </Button>
          </Link>
        )}
        <div className="ml-auto flex items-center space-x-4">
          {user && isAdmin && (
            <AdminBadge className="mr-2" asLink />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user ? (
                      (user.displayName || user.email).charAt(0).toUpperCase()
                    ) : (
                      <User className="h-4 w-4 text-foreground" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {user ? (
                <>
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
                      <Link href={`/people/${user.api_id}`}>
                        <span className="flex items-center">
                          <User className="mr-2 h-4 w-4 text-foreground" />
                          Profile
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <span className="flex items-center">
                        <Settings className="mr-2 h-4 w-4 text-foreground" />
                        Settings
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
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <span className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4 text-foreground" />
                      Log in
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}