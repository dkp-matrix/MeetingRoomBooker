import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScheduleGrid from "@/components/schedule/schedule-grid";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import BookingModal from "@/components/booking/booking-modal";

export default function RoomSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string>("all");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/rooms"],
  });

  const filteredRooms = selectedRoomId === "all" 
    ? rooms 
    : rooms.filter(room => room.id.toString() === selectedRoomId);

  const formatDate = (date: Date) => {
    return format(date, 'MMMM d, yyyy');
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' 
      ? addDays(selectedDate, 1) 
      : subDays(selectedDate, 1)
    );
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Room Schedule</h2>
            <p className="text-sm text-muted-foreground">View comprehensive room booking schedule</p>
          </div>
          <Button onClick={() => setIsBookingModalOpen(true)} className="shadow-material">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {/* Controls */}
        <Card className="shadow-material border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Date Navigation */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigateDate('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-semibold text-foreground min-w-[180px] text-center">
                    {formatDate(selectedDate)}
                  </span>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => navigateDate('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" onClick={goToToday}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Today
                </Button>
              </div>

              {/* Room Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-foreground">Show:</span>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <Card className="shadow-material border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedRoomId === "all" 
                ? `All Rooms - ${formatDate(selectedDate)}`
                : `${rooms.find(r => r.id.toString() === selectedRoomId)?.name} - ${formatDate(selectedDate)}`
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomsLoading ? (
              <div className="h-96 bg-muted animate-pulse rounded-lg"></div>
            ) : (
              <ScheduleGrid 
                date={format(selectedDate, 'yyyy-MM-dd')} 
                rooms={filteredRooms}
                detailed={true}
              />
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="shadow-material border-0 mt-6">
          <CardHeader>
            <CardTitle className="text-base">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <span className="text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-primary rounded"></div>
                <span className="text-muted-foreground">Your Booking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-accent rounded"></div>
                <span className="text-muted-foreground">Team Booking</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-muted-foreground">Other Department</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span className="text-muted-foreground">External Meeting</span>
              </div>
            </div>
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
