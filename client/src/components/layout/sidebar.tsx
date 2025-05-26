import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building,
  BarChart3,
  Calendar,
  DoorOpen,
  CalendarDays,
  Settings,
  Users,
  ChartBar,
  LogOut,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "My Bookings", href: "/my-bookings", icon: Calendar },
  { name: "Browse Rooms", href: "/browse-rooms", icon: DoorOpen },
  { name: "Room Schedule", href: "/room-schedule", icon: CalendarDays },
];

const adminNavigation = [
  { name: "Manage Rooms", href: "/admin/manage-rooms", icon: Settings },
  { name: "Manage Bookings", href: "/admin/manage-bookings", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        console.log("fail logout");
        throw new Error("Logout failed");
      }
    },
    onSuccess: () => {
      console.log("sucessfully logout");
      queryClient.setQueryData(["/api/auth/user"], null);
      toast({
        title: "Logged out",
        description: "You've been successfully logged out. See you soon!",
      });
    },
    onError: (error: Error) => {
      console.log("fail logout");
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActivePath = (path: string) => {
    if (path === "/") {
      return location === "/";
    }
    return location.startsWith(path);
  };

  return (
    <div className="w-64 bg-sidebar shadow-material-lg border-r border-sidebar-border flex flex-col">
      {/* Logo and Company */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <Building className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">
              RoomBook
            </h1>
            <p className="text-sm text-sidebar-foreground/70">
              Enterprise Portal
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = isActivePath(item.href);
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Button>
            </Link>
          );
        })}

        {/* Admin Section */}
        {user?.role === "admin" && (
          <>
            <div className="pt-4">
              <Separator className="bg-sidebar-border" />
              <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-3 pt-4">
                Administration
              </p>
              {adminNavigation.map((item) => {
                const isActive = isActivePath(item.href);
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={`w-full justify-start ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-accent-foreground">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
