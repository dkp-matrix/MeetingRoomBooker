import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import BookingModal from "@/components/booking/booking-modal";
import RoomCard from "@/components/room/room-card";
import ScheduleGrid from "@/components/schedule/schedule-grid";
import {
  Building,
  CheckCircle,
  Calendar,
  PieChart,
  Plus,
  Bell,
  CalendarPlus,
  Edit,
  CalendarX,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Booking, Room } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats"],
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
  });

  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<any[]>(
    {
      queryKey: ["/api/bookings/my"],
    }
  );

  // Filter available rooms for quick booking
  const availableRooms = rooms.filter((room) => room.isActive).slice(0, 6);

  // Recent activity based on recent bookings
  const recentActivity = myBookings.slice(0, 4).map((booking) => ({
    type: "booking",
    icon: CalendarPlus,
    message: `You booked ${booking.room?.name}`,
    time: format(new Date(booking.createdAt), "h:mm a"),
    color: "accent",
  }));

  const formatDate = (date: Date) => {
    return format(date, "MMMM d, yyyy");
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage your meeting room bookings
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
            </Button>
            <Button
              onClick={() => setIsBookingModalOpen(true)}
              className="shadow-material"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-material border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Rooms
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {statsLoading ? "..." : stats?.totalRooms || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-material border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Available Now
                  </p>
                  <p className="text-3xl font-semibold text-accent">
                    {statsLoading ? "..." : stats?.availableRooms || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-material border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    My Bookings Today
                  </p>
                  <p className="text-3xl font-semibold text-orange-500">
                    {statsLoading ? "..." : stats?.totalBookingsToday || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-material border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Utilization Rate
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {statsLoading ? "..." : `${stats?.utilizationRate || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-secondary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Book Section */}
          <div className="lg:col-span-2">
            <Card className="shadow-material border-0">
              <CardHeader>
                <CardTitle className="text-lg">
                  Quick Book Available Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {roomsLoading
                    ? Array.from({ length: 4 }, (_, i) => (
                        <div
                          key={i}
                          className="h-48 bg-muted animate-pulse rounded-lg"
                        ></div>
                      ))
                    : availableRooms.map((room) => (
                        <RoomCard
                          key={room.id}
                          room={room}
                          onBook={() => setIsBookingModalOpen(true)}
                          showAvailability
                        />
                      ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="shadow-material border-0">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingsLoading ? (
                  Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted animate-pulse rounded"></div>
                        <div className="h-2 bg-muted animate-pulse rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <activity.icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          {activity.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {recentActivity.length > 0 && (
                  <div className="pt-2">
                    <Button
                      variant="link"
                      className="text-sm p-0 h-auto text-primary font-medium"
                    >
                      View All Activity <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Schedule */}
        <Card className="shadow-material border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Today's Schedule</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
                  {formatDate(selectedDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScheduleGrid
              date={format(selectedDate, "yyyy-MM-dd")}
              rooms={rooms}
            />
          </CardContent>
        </Card>
      </main>

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </>
  );
}
