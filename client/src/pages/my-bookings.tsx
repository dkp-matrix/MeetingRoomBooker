import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2, Edit, Plus } from "lucide-react";
import { useState } from "react";
import { format, isAfter, isSameDay } from "date-fns";
import BookingModal from "@/components/booking/booking-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BookingWithDetails } from "@shared/schema";

export default function MyBookings() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingWithDetails | null>(null);
  const { toast } = useToast();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings/my"],
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      await apiRequest("DELETE", `/api/bookings/${bookingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking has been successfully cancelled.",
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

  const handleEditBooking = (booking: BookingWithDetails) => {
    setEditingBooking(booking);
    setIsBookingModalOpen(true);
  };

  const handleDeleteBooking = (bookingId: number) => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      deleteBookingMutation.mutate(bookingId);
    }
  };

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

  const groupedBookings = bookings.reduce((groups: Record<string, BookingWithDetails[]>, booking) => {
    const status = getBookingStatus(booking).label;
    if (!groups[status]) groups[status] = [];
    groups[status].push(booking);
    return groups;
  }, {});

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">My Bookings</h2>
            <p className="text-sm text-muted-foreground">View and manage your meeting room bookings</p>
          </div>
          <Button onClick={() => setIsBookingModalOpen(true)} className="shadow-material">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {isLoading ? (
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
        ) : bookings.length === 0 ? (
          <Card className="shadow-material border-0">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't made any meeting room bookings. Get started by booking your first room.
              </p>
              <Button onClick={() => setIsBookingModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Booking
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedBookings).map(([status, statusBookings]) => (
              <div key={status}>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  {status}
                  <Badge variant="secondary" className="ml-2">
                    {statusBookings.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {statusBookings.map((booking) => {
                    const bookingStatus = getBookingStatus(booking);
                    const canEdit = bookingStatus.label === "Upcoming" || bookingStatus.label === "Today";
                    
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
                          
                          <div className="flex gap-2 pt-3">
                            {canEdit && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditBooking(booking)}
                                  className="flex-1"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteBooking(booking.id)}
                                  className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                                  disabled={deleteBookingMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }} 
        booking={editingBooking}
      />
    </>
  );
}
