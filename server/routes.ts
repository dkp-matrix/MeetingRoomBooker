import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertRoomSchema, insertBookingSchema } from "@shared/schema";
import { sendBookingInvites, sendBookingConfirmation } from "./emailService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Room routes
  app.get("/api/rooms", isAuthenticated, async (req, res) => {
    try {
      const rooms = await storage.getActiveRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get("/api/rooms/:id", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const room = await storage.getRoom(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      console.error("Error fetching room:", error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  // Admin-only room management
  app.post("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedRoom = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedRoom);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const roomId = parseInt(req.params.id);
      const validatedRoom = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(roomId, validatedRoom);
      res.json(room);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid room data", errors: error.errors });
      }
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const roomId = parseInt(req.params.id);
      await storage.deleteRoom(roomId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Booking routes
  app.get("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      let bookings;
      if (user?.role === "admin") {
        bookings = await storage.getAllBookings();
      } else {
        bookings = await storage.getUserBookings(userId);
      }
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUserBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      res.status(500).json({ message: "Failed to fetch user bookings" });
    }
  });

  app.get("/api/bookings/room/:roomId", isAuthenticated, async (req, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const date = req.query.date as string;
      const bookings = await storage.getRoomBookings(roomId, date);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching room bookings:", error);
      res.status(500).json({ message: "Failed to fetch room bookings" });
    }
  });

  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { attendees, sendInvite, ...bookingData } = req.body;
      const validatedBooking = insertBookingSchema.parse({ ...bookingData, userId, attendees: attendees || [] });

      // Check availability
      const isAvailable = await storage.checkRoomAvailability(
        validatedBooking.roomId,
        validatedBooking.date,
        validatedBooking.startTime,
        validatedBooking.endTime
      );

      if (!isAvailable) {
        return res.status(409).json({ message: "Room is not available at the requested time" });
      }

      const booking = await storage.createBooking(validatedBooking);
      
      // Send notifications if requested
      if (sendInvite && (attendees?.length > 0)) {
        try {
          const user = await storage.getUser(userId);
          const room = await storage.getRoom(validatedBooking.roomId);
          
          if (user && room) {
            const emailData = {
              title: validatedBooking.title,
              roomName: room.name,
              date: validatedBooking.date,
              startTime: validatedBooking.startTime,
              endTime: validatedBooking.endTime,
              description: validatedBooking.description,
              organizerName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
              organizerEmail: user.email || 'noreply@roombook.com'
            };

            // Send invites to attendees
            await sendBookingInvites(attendees, emailData);
            
            // Send confirmation to organizer
            await sendBookingConfirmation(user.email || 'noreply@roombook.com', emailData);
          }
        } catch (emailError) {
          console.error("Failed to send notifications:", emailError);
          // Don't fail the booking if email fails
        }
      }

      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user owns the booking or is admin
      if (existingBooking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedBooking = insertBookingSchema.partial().parse(req.body);

      // Check availability if time or date is being changed
      if (validatedBooking.date || validatedBooking.startTime || validatedBooking.endTime || validatedBooking.roomId) {
        const isAvailable = await storage.checkRoomAvailability(
          validatedBooking.roomId || existingBooking.roomId,
          validatedBooking.date || existingBooking.date,
          validatedBooking.startTime || existingBooking.startTime,
          validatedBooking.endTime || existingBooking.endTime,
          bookingId
        );

        if (!isAvailable) {
          return res.status(409).json({ message: "Room is not available at the requested time" });
        }
      }

      const booking = await storage.updateBooking(bookingId, validatedBooking);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user owns the booking or is admin
      if (existingBooking.userId !== userId && user?.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteBooking(bookingId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Availability check
  app.post("/api/bookings/check-availability", isAuthenticated, async (req, res) => {
    try {
      const { roomId, date, startTime, endTime, excludeBookingId } = req.body;
      const isAvailable = await storage.checkRoomAvailability(roomId, date, startTime, endTime, excludeBookingId);
      res.json({ available: isAvailable });
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Dashboard stats
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getBookingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
