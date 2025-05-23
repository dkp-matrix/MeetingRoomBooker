import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertBookingSchema, type InsertBooking, type BookingWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, X, UserPlus, Mail } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { z } from "zod";

const bookingFormSchema = insertBookingSchema.extend({
  duration: z.number().min(15).max(480),
  sendInvite: z.boolean().optional(),
  attendees: z.array(z.string().email()).optional(),
}).refine((data) => {
  // Validate that date is today or in the future
  const selectedDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
}, {
  message: "Booking date cannot be in the past",
  path: ["date"]
}).refine((data) => {
  // If date is today, validate that time is in the future
  const selectedDate = new Date(data.date);
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  
  if (isToday && data.startTime) {
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const selectedDateTime = new Date();
    selectedDateTime.setHours(hours, minutes, 0, 0);
    return selectedDateTime > today;
  }
  return true;
}, {
  message: "Booking time cannot be in the past",
  path: ["startTime"]
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
  const [attendeeEmail, setAttendeeEmail] = useState("");

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
      attendees: [],
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
          attendees: [],
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
          attendees: [],
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

  const addAttendee = () => {
    if (attendeeEmail && attendeeEmail.includes('@')) {
      const currentAttendees = form.getValues('attendees') || [];
      if (!currentAttendees.includes(attendeeEmail)) {
        form.setValue('attendees', [...currentAttendees, attendeeEmail]);
        setAttendeeEmail("");
      } else {
        toast({
          title: "Duplicate Email",
          description: "This attendee is already added.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  const removeAttendee = (emailToRemove: string) => {
    const currentAttendees = form.getValues('attendees') || [];
    form.setValue('attendees', currentAttendees.filter(email => email !== emailToRemove));
  };

  const onSubmit = async (data: BookingFormData) => {
    const { duration, sendInvite, attendees, ...bookingData } = data;

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
      const completeBookingData = {
        ...bookingData,
        attendees: attendees || [],
        sendInvite: sendInvite || false,
      };

      if (isEditing && booking) {
        updateBookingMutation.mutate({ id: booking.id, booking: completeBookingData });
      } else {
        createBookingMutation.mutate(completeBookingData);
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
                        (rooms as any[]).map((room: any) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name} (Floor {room.floor})
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
                      value={field.value || ""}
                      className="focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attendees Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Attendees (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter attendee email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttendee();
                    }
                  }}
                  className="flex-1 focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <Button
                  type="button"
                  onClick={addAttendee}
                  variant="outline"
                  size="icon"
                  disabled={!attendeeEmail}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Display added attendees */}
              {(form.watch('attendees')?.length || 0) > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Added attendees:</div>
                  <div className="flex flex-wrap gap-1">
                    {(form.watch('attendees') || []).map((email: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {email}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttendee(email)}
                          className="h-auto p-0 ml-1 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
