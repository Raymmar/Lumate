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
import { User, Settings, LogOut } from "lucide-react";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <div className="border-b">
      <div className="flex items-center container mx-auto">
        <Link href="/">
          <a className="p-2">
            <svg 
              viewBox="0 0 8996 1884" 
              style={{ width: '200px', minWidth: '200px' }}
              aria-label="Sarasota.tech"
            >
              <g>
                <path className="text-[#241917] fill-current" d="M2405.3,1220.8c37.6,0,68.2-4.3,91.7-12.8c44.6-16.3,66.8-46.5,66.8-90.8c0-25.9-11-45.8-33.1-60 c-22.1-13.8-56.8-26-104.1-36.6l-80.8-18.6c-79.4-18.4-134.4-38.4-164.7-60c-51.5-36.1-77.1-92.5-77.1-169.2 c0-70,24.9-128.2,74.6-174.5c49.6-46.1,122.7-69.3,219-69.3c80.4,0,149.1,21.9,205.9,65.5c56.8,43.7,86.6,107.1,89.3,190.3h-153.4 c-2.8-47-22.8-80.4-60.1-100.2c-24.9-13.1-55.8-19.6-92.8-19.6c-41.2,0-73.9,8.5-98.5,25.4c-24.5,16.9-36.8,40.7-36.8,71.1 c0,28,12.1,48.9,36.2,62.6c15.5,9.2,48.8,20,99.5,32.4l131.6,32.4c57.7,14.2,101.2,33.1,130.5,56.8c45.6,36.8,68.3,90,68.3,159.7 c0,69.7-26.6,130.8-80,178.1c-53.4,47.2-128.7,70.9-226.1,70.9c-97.4,0-177.7-23.2-234.7-69.8c-57-46.5-85.5-110.5-85.5-191.8 h152.3c4.8,35.8,14.3,62.4,28.5,80.1c25.9,32.2,70.3,48.3,133.1,48.3L2405.3,1220.8z"/>
                <path className="text-[#241917] fill-current" d="M2845.1,818.2c39.1-51,106-76.4,201-76.4c61.8,0,116.8,12.5,164.7,37.6c48,25.1,72,72.5,72,142.2v265.3 c0,18.4,0.3,40.7,1,66.9c1,19.8,4,33.2,8.8,40.3c4.8,7,12.1,12.9,21.8,17.5v22.2h-160.5c-4.5-11.7-7.6-22.7-9.4-32.9 c-1.8-10.2-3.1-21.9-4.2-35c-20.4,22.7-43.9,41.9-70.4,57.9c-31.8,18.7-67.7,28.2-107.7,28.2c-51.2,0-93.3-15-126.6-44.8 c-33.4-29.9-50-72.2-50-127.1c0-71.1,26.7-122.6,80.3-154.4c29.4-17.3,72.5-29.7,129.5-37.2l50.3-6.4c27.3-3.5,46.8-7.9,58.5-13.3 c21-9.2,31.6-23.5,31.6-43c0-23.7-8-40.1-24.1-49.1c-16.1-9-39.6-13.5-70.8-13.5c-34.9,0-59.5,8.8-74.1,26.5 c-10.3,13.1-17.3,30.8-20.7,53h-142.5C2806.7,892.3,2820.5,850.8,2845.1,818.2z M2954.9,1224.6c13.8,11.7,30.7,17.5,50.7,17.5 c31.8,0,61.1-9.6,87.8-28.6c26.7-19,40.7-53.9,41.7-104.5v-56.2c-9.3,6.1-18.7,10.9-28.3,14.6c-9.5,3.7-22.6,7.2-39.1,10.3 l-33.1,6.4c-31,5.6-53.4,12.5-66.8,20.7c-22.8,13.8-34.2,35.2-34.2,64.2C2933.7,1194.8,2940.7,1213.2,2954.9,1224.6z"/>
                <path className="text-[#FEA30E] fill-current" d="M1684.3,740.8c-20.3-75.9-98.3-120.9-174.2-100.6l-274.6,73.6l141.3-244.7c39.3-68,16-155.1-52-194.3 c-68-39.3-155-15.9-194.3,52.1L988.2,573l-73.1-272.8c-20.3-75.9-98.3-120.9-174.2-100.6c-75.9,20.3-120.9,98.3-100.6,174.2 l73.6,274.6L469.2,507.2c-68.1-39.3-155.1-16-194.3,52.1c-39.3,68-16,155,52.1,194.3L573,895.6l-272.8,73.1 c-75.9,20.3-121,98.3-100.6,174.2s98.3,120.9,174.2,100.6l274.5-73.6l-141.2,244.6c-39.3,68-16,155,52,194.3 c68,39.3,155,15.9,194.3-52.1l142.1-246.1l73.1,272.8c20.3,75.9,98.3,120.9,174.2,100.6c75.9-20.3,120.9-98.3,100.6-174.2 l-73.6-274.5l244.6,141.2c68.1,39.3,155.1,16,194.3-52c39.3-68,16-155-52.1-194.3l-246.1-142.1l272.9-73.1 C1659.5,894.7,1704.6,816.7,1684.3,740.8z"/>
              </g>
            </svg>
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
                <DropdownMenuItem className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center">
                  <Link href="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="flex items-center">
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