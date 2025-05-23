import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, User, Trash2, Search, Filter, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { format, isAfter, isSameDay } from "date-fns";
import BookingModal from "@/components/booking/booking-modal";
import type { BookingWithDetails } from "@shared/schema";

export default function ManageBookings() {
  const { user } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roomFilter, setRoomFilter] = useState<string>("");
  const { toast } = useToast();

  // Redirect if not admin
  if (user?.role !== "admin") {
    return (
      <div className="flex-1 p-6">
        <Card className="shadow-material border-0">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["/api/rooms"],
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      await apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "The booking has been successfully cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel booking",
        variant: "destructive",
      });
    },
  });

  const getBookingStatus = (booking: BookingWithDetails) => {
    const bookingDate = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    
    if (booking.status === "cancelled") {
      return { label: "Cancelled", color: "destructive" as const };
    }
    
    if (isAfter(now, bookingDate)) {
      return { label: "Completed", color: "secondary" as const };
    }
    
    if (isSameDay(bookingDate, now)) {
      return { label: "Today", color: "default" as const };
    }
    
    return { label: "Upcoming", color: "default" as const };
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking: BookingWithDetails) => {
      const matchesSearch = !searchTerm || 
        booking.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.room?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const bookingStatus = getBookingStatus(booking).label;
      const matchesStatus = !statusFilter || bookingStatus.toLowerCase() === statusFilter;
      
      const matchesRoom = !roomFilter || booking.roomId.toString() === roomFilter;

      return matchesSearch && matchesStatus && matchesRoom;
    });
  }, [bookings, searchTerm, statusFilter, roomFilter]);

  const handleDeleteBooking = (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      deleteBookingMutation.mutate(bookingId);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setRoomFilter("");
  };

  const hasActiveFilters = searchTerm || statusFilter || roomFilter;

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Manage Bookings</h2>
            <p className="text-sm text-muted-foreground">View and manage all meeting room bookings</p>
          </div>
          <Button onClick={() => setIsBookingModalOpen(true)} className="shadow-material">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Search and Filters */}
        <Card className="shadow-material border-0 mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Filter Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roomFilter} onValueChange={setRoomFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary">
                    Search: {searchTerm}
                  </Badge>
                )}
                {statusFilter && (
                  <Badge variant="secondary">
                    Status: {statusFilter}
                  </Badge>
                )}
                {roomFilter && (
                  <Badge variant="secondary">
                    Room: {rooms.find(r => r.id.toString() === roomFilter)?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {bookingsLoading ? "Loading..." : `${filteredBookings.length} booking${filteredBookings.length !== 1 ? 's' : ''} found`}
          </div>
        </div>

        {bookingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i} className="shadow-material border-0">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card className="shadow-material border-0">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No bookings found</h3>
              <p className="text-muted-foreground mb-6">
                {hasActiveFilters 
                  ? "Try adjusting your search criteria or clearing some filters."
                  : "No bookings have been made yet."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => {
              const bookingStatus = getBookingStatus(booking);
              const canCancel = bookingStatus.label === "Upcoming" || bookingStatus.label === "Today";
              
              return (
                <Card key={booking.id} className="shadow-material border-0">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg text-foreground">{booking.title}</CardTitle>
                        <Badge variant={bookingStatus.color} className="mt-1">
                          {bookingStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">
                        {booking.user?.firstName} {booking.user?.lastName}
                      </span>
                    </div>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="font-medium">{booking.room?.name}</span>
                      <span className="text-xs ml-2">Floor {booking.room?.floor}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{format(new Date(booking.date), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{booking.startTime} - {booking.endTime}</span>
                    </div>
                    
                    {booking.description && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {booking.description}
                      </p>
                    )}
                    
                    {canCancel && (
                      <div className="pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="w-full text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          disabled={deleteBookingMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Cancel Booking
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
      />
    </>
  );
}
