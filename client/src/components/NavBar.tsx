import { Link } from "wouter";
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
import { User, Settings, LogOut, LogIn, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Add ADMIN_EMAILS constant
const ADMIN_EMAILS = [
  "admin@example.com",
  "me@raymmar.com",
  // Add more admin emails here
];

export function NavBar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-6">
        <Link href="/">
          <Button variant="link" className="text-2xl font-bold text-primary">
            Luma
          </Button>
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user ? (
                      (user.displayName || user.email).charAt(0).toUpperCase()
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              {user ? (
                <>
                  {user.api_id && (
                    <DropdownMenuItem asChild>
                      <Link href={`/people/${user.api_id}`}>
                        <span className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <span className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <span className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => logout()}>
                    <span className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login">
                    <span className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Log in
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}