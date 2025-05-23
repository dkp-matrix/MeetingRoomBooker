import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { Room, BookingWithDetails } from "@shared/schema";
import { format } from "date-fns";

interface ScheduleGridProps {
  date: string;
  rooms: Room[];
  detailed?: boolean;
}

interface TimeSlot {
  time: string;
  display: string;
}

const timeSlots: TimeSlot[] = [
  { time: "08:00", display: "8:00 AM" },
  { time: "09:00", display: "9:00 AM" },
  { time: "10:00", display: "10:00 AM" },
  { time: "11:00", display: "11:00 AM" },
  { time: "12:00", display: "12:00 PM" },
  { time: "13:00", display: "1:00 PM" },
  { time: "14:00", display: "2:00 PM" },
  { time: "15:00", display: "3:00 PM" },
  { time: "16:00", display: "4:00 PM" },
  { time: "17:00", display: "5:00 PM" },
];

export default function ScheduleGrid({ date, rooms, detailed = false }: ScheduleGridProps) {
  const { user } = useAuth();

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
    enabled: rooms.length > 0,
  });

  // Filter bookings for the selected date
  const dayBookings = allBookings.filter((booking: BookingWithDetails) => 
    booking.date === date && booking.status === "confirmed"
  );

  const getBookingForSlot = (roomId: number, timeSlot: string) => {
    return dayBookings.find((booking: BookingWithDetails) => {
      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;
      
      // Check if the time slot overlaps with the booking
      const slotTime = timeSlot;
      const nextSlotIndex = timeSlots.findIndex(slot => slot.time === timeSlot) + 1;
      const nextSlotTime = nextSlotIndex < timeSlots.length ? timeSlots[nextSlotIndex].time : "18:00";
      
      return (
        booking.roomId === roomId &&
        ((slotTime >= bookingStart && slotTime < bookingEnd) ||
         (nextSlotTime > bookingStart && nextSlotTime <= bookingEnd) ||
         (bookingStart >= slotTime && bookingStart < nextSlotTime))
      );
    });
  };

  const getBookingStyle = (booking: BookingWithDetails | undefined, isCurrentUser: boolean) => {
    if (!booking) {
      return {
        className: "bg-muted text-center text-muted-foreground",
        content: "Available"
      };
    }

    if (isCurrentUser) {
      return {
        className: "bg-primary/10 border-l-4 border-primary text-primary",
        content: booking
      };
    }

    // Different colors for different users/departments
    const colors = [
      "bg-accent/10 border-l-4 border-accent text-accent",
      "bg-orange-100 border-l-4 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
      "bg-destructive/10 border-l-4 border-destructive text-destructive",
      "bg-purple-100 border-l-4 border-purple-500 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300",
    ];

    const colorIndex = booking.userId ? booking.userId.charCodeAt(0) % colors.length : 0;

    return {
      className: colors[colorIndex],
      content: booking
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No rooms available to display
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header */}
        <div className={`grid gap-2 mb-2`} style={{
          gridTemplateColumns: `120px repeat(${rooms.length}, minmax(150px, 1fr))`
        }}>
          <div className="text-xs font-medium text-muted-foreground p-2">Time</div>
          {rooms.map((room) => (
            <div key={room.id} className="text-xs font-medium text-muted-foreground p-2 text-center">
              <div className="font-semibold">{room.name}</div>
              {detailed && (
                <div className="text-xs opacity-75">
                  {room.capacity} people • Floor {room.floor}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        {timeSlots.map((slot) => (
          <div
            key={slot.time}
            className={`grid gap-2 mb-1`}
            style={{
              gridTemplateColumns: `120px repeat(${rooms.length}, minmax(150px, 1fr))`
            }}
          >
            <div className="text-xs text-muted-foreground p-2 font-medium">
              {slot.display}
            </div>
            {rooms.map((room) => {
              const booking = getBookingForSlot(room.id, slot.time);
              const isCurrentUser = booking?.userId === user?.id;
              const style = getBookingStyle(booking, isCurrentUser);

              return (
                <div
                  key={`${room.id}-${slot.time}`}
                  className={`p-2 rounded text-xs min-h-[40px] flex flex-col justify-center ${style.className}`}
                >
                  {typeof style.content === "string" ? (
                    <span className="text-center">{style.content}</span>
                  ) : style.content ? (
                    <>
                      <div className="font-medium text-foreground">{style.content.title}</div>
                      <div className="text-xs opacity-75">
                        {style.content.user?.firstName} {style.content.user?.lastName}
                      </div>
                      {detailed && (
                        <div className="text-xs opacity-60 mt-1">
                          {style.content.startTime} - {style.content.endTime}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile responsive note */}
      <div className="mt-4 text-xs text-muted-foreground md:hidden">
        Scroll horizontally to view all rooms
      </div>
    </div>
  );
}
