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
    <div className="border-b">
      <div className="flex h-16 items-center px-6">
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
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleResync}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  <span>Re-sync Database</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
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
    </div>
  );
}