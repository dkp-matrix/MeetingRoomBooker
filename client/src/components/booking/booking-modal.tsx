import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertBookingSchema, type InsertBooking, type BookingWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, X } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";
import { z } from "zod";

const bookingFormSchema = insertBookingSchema.extend({
  duration: z.number().min(15).max(480),
  sendInvite: z.boolean().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: BookingWithDetails | null;
  defaultRoomId?: number | null;
}

export default function BookingModal({ isOpen, onClose, booking, defaultRoomId }: BookingModalProps) {
  const { toast } = useToast();
  const isEditing = !!booking;

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: isOpen,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: "",
      description: "",
      roomId: defaultRoomId || 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: "",
      endTime: "",
      duration: 60,
      sendInvite: true,
      status: "confirmed",
    },
  });

  // Auto-calculate end time when start time or duration changes
  const watchedValues = form.watch(["startTime", "duration"]);
  
  useEffect(() => {
    const [startTime, duration] = watchedValues;
    if (startTime && duration) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + duration;
      
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      form.setValue('endTime', endTime);
    }
  }, [watchedValues, form]);

  // Reset form when modal opens/closes or booking changes
  useEffect(() => {
    if (isOpen) {
      if (booking) {
        // Calculate duration from start and end times
        const [startHours, startMinutes] = booking.startTime.split(':').map(Number);
        const [endHours, endMinutes] = booking.endTime.split(':').map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const duration = endTotalMinutes - startTotalMinutes;

        form.reset({
          title: booking.title,
          description: booking.description || "",
          roomId: booking.roomId,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          duration,
          sendInvite: true,
          status: booking.status,
        });
      } else {
        form.reset({
          title: "",
          description: "",
          roomId: defaultRoomId || 0,
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: "",
          endTime: "",
          duration: 60,
          sendInvite: true,
          status: "confirmed",
        });
      }
    }
  }, [isOpen, booking, defaultRoomId, form]);

  const availabilityMutation = useMutation({
    mutationFn: async (data: { roomId: number; date: string; startTime: string; endTime: string; excludeBookingId?: number }) => {
      const response = await apiRequest("POST", "/api/bookings/check-availability", data);
      return response.json();
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: Omit<InsertBooking, 'userId'>) => {
      const response = await apiRequest("POST", "/api/bookings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Booking Created",
        description: "Your meeting room has been successfully booked.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async (data: { id: number; booking: Partial<InsertBooking> }) => {
      const response = await apiRequest("PUT", `/api/bookings/${data.id}`, data.booking);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Booking Updated",
        description: "Your booking has been successfully updated.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    const { duration, sendInvite, ...bookingData } = data;

    // Check availability first
    try {
      const availabilityResult = await availabilityMutation.mutateAsync({
        roomId: bookingData.roomId,
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        excludeBookingId: booking?.id,
      });

      if (!availabilityResult.available) {
        toast({
          title: "Room Not Available",
          description: "The selected room is not available at the requested time. Please choose a different time or room.",
          variant: "destructive",
        });
        return;
      }

      // Proceed with booking
      if (isEditing && booking) {
        updateBookingMutation.mutate({ id: booking.id, booking: bookingData });
      } else {
        createBookingMutation.mutate(bookingData);
      }
    } catch (error: any) {
      toast({
        title: "Availability Check Failed",
        description: error.message || "Failed to check room availability.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const isPending = createBookingMutation.isPending || updateBookingMutation.isPending || availabilityMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card shadow-material-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {isEditing ? "Edit Booking" : "Book Meeting Room"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter meeting title" 
                      {...field} 
                      className="focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select 
                    value={field.value?.toString()} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomsLoading ? (
                        <div className="p-2 text-sm text-muted-foreground">Loading rooms...</div>
                      ) : (
                        rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name} ({room.capacity} people)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select 
                      value={field.value?.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-2 focus:ring-primary focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                        <SelectItem value="240">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        className="focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        {...field} 
                        readOnly
                        className="bg-muted focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add meeting description or agenda" 
                      rows={3}
                      {...field} 
                      className="focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendInvite"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      Send calendar invite to attendees
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-material"
              >
                {isPending ? (
                  "Processing..."
                ) : (
                  <>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    {isEditing ? "Update Booking" : "Book Room"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
