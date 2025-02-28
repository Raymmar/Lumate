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
import { User, Settings, LogOut, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NavBar() {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleResync = async () => {
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      toast({
        title: "Sync Started",
        description: "Database synchronization has been initiated.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to start database synchronization.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="border-b bg-background fixed top-0 left-0 right-0 z-50">
      <div className="container flex h-10 items-center max-w-screen-lg mx-auto">
        <Link href="/">
          <a className="text-2xl font-bold text-primary flex items-center">
            Luma
          </a>
        </Link>
        <div className="ml-auto flex items-center space-x-4">
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
                {user.personId && user.api_id && (
                  <DropdownMenuItem asChild>
                    <Link href={`/people/${user.api_id}`}>
                      <span className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
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
                <DropdownMenuItem className="cursor-pointer" onSelect={handleResync}>
                  <span className="flex items-center">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-sync Database
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onSelect={() => logout()}>
                  <span className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}