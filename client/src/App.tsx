import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MyBookings from "@/pages/my-bookings";
import BrowseRooms from "@/pages/browse-rooms";
import RoomSchedule from "@/pages/room-schedule";
import ManageRooms from "@/pages/admin/manage-rooms";
import ManageBookings from "@/pages/admin/manage-bookings";
import Sidebar from "@/components/layout/sidebar";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/my-bookings" component={MyBookings} />
          <Route path="/browse-rooms" component={BrowseRooms} />
          <Route path="/room-schedule" component={RoomSchedule} />
          <Route path="/admin/manage-rooms" component={ManageRooms} />
          <Route path="/admin/manage-bookings" component={ManageBookings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
