import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, User, Edit, Trash2, Users } from "lucide-react";
import { format, isAfter, isSameDay, parseISO } from "date-fns";
import type { BookingWithDetails } from "@shared/schema";

interface BookingCardProps {
  booking: BookingWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  showUser?: boolean;
  compact?: boolean;
  currentUserId?: string;
  canManage?: boolean;
}

export default function BookingCard({ 
  booking, 
  onEdit, 
  onDelete, 
  showUser = false, 
  compact = false,
  currentUserId,
  canManage = false
}: BookingCardProps) {
  const getBookingStatus = () => {
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

  const bookingStatus = getBookingStatus();
  const isOwnBooking = currentUserId === booking.userId;
  const canEdit = (isOwnBooking || canManage) && (bookingStatus.label === "Upcoming" || bookingStatus.label === "Today");
  const canCancel = (isOwnBooking || canManage) && (bookingStatus.label === "Upcoming" || bookingStatus.label === "Today");

  const formatBookingDate = (date: string) => {
    try {
      return format(parseISO(date), 'MMM d, yyyy');
    } catch {
      return format(new Date(date), 'MMM d, yyyy');
    }
  };

  const getUserDisplayName = () => {
    if (!booking.user) return "Unknown User";
    
    const { firstName, lastName, email } = booking.user;
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return email || "Unknown User";
  };

  if (compact) {
    return (
      <Card className="shadow-material border-0 hover:shadow-material-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground truncate">{booking.title}</h4>
                <Badge variant={bookingStatus.color} className="shrink-0">
                  {bookingStatus.label}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-4">
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {booking.room?.name}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {booking.startTime} - {booking.endTime}
                </span>
              </div>
            </div>
            {(canEdit || canCancel) && (
              <div className="flex gap-1 ml-2">
                {canEdit && onEdit && (
                  <Button variant="ghost" size="sm" onClick={onEdit}>
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
                {canCancel && onDelete && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onDelete}
                    className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-material border-0 hover:shadow-material-lg transition-shadow">
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
        {showUser && (
          <div className="flex items-center text-sm text-muted-foreground">
            <User className="h-4 w-4 mr-2" />
            <span className="font-medium">{getUserDisplayName()}</span>
          </div>
        )}

        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="font-medium">{booking.room?.name}</span>
          {booking.room?.floor && (
            <span className="text-xs ml-2">Floor {booking.room.floor}</span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{formatBookingDate(booking.date)}</span>
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-2" />
          <span>{booking.startTime} - {booking.endTime}</span>
        </div>

        {booking.room?.capacity && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            <span>{booking.room.capacity} people capacity</span>
          </div>
        )}
        
        {booking.description && (
          <div className="bg-muted/50 p-2 rounded text-sm text-muted-foreground">
            {booking.description}
          </div>
        )}

        {booking.room?.equipment && booking.room.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {booking.room.equipment.map((item, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        )}
        
        {(canEdit || canCancel) && (
          <div className="flex gap-2 pt-3">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-1"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {canCancel && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
