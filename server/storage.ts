import {
  users,
  rooms,
  bookings,
  type User,
  type UpsertUser,
  type Room,
  type InsertRoom,
  type Booking,
  type InsertBooking,
  type BookingWithDetails,
  type RoomWithBookings,
  authConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: any): Promise<User>;
  createOrUpdateUser(user: any): Promise<User>;

  // Auth configuration operations
  getActiveAuthConfig(): Promise<any>;
  setAuthConfig(authType: string, config: any): Promise<void>;

  // Room operations
  getAllRooms(): Promise<Room[]>;
  getActiveRooms(): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: number): Promise<void>;

  // Booking operations
  getAllBookings(): Promise<BookingWithDetails[]>;
  getUserBookings(userId: string): Promise<BookingWithDetails[]>;
  getRoomBookings(roomId: number, date?: string): Promise<BookingWithDetails[]>;
  getBooking(id: number): Promise<BookingWithDetails | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;

  // Availability checking
  checkRoomAvailability(
    roomId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: number
  ): Promise<boolean>;
  getBookingStats(): Promise<{
    totalRooms: number;
    availableRooms: number;
    totalBookingsToday: number;
    utilizationRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async createOrUpdateUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Auth configuration operations
  async getActiveAuthConfig(): Promise<any> {
    const [config] = await db
      .select()
      .from(authConfig)
      .where(eq(authConfig.isActive, true))
      .limit(1);
    return config;
  }

  async setAuthConfig(authType: string, config: any): Promise<void> {
    // Deactivate all existing configs
    await db.update(authConfig).set({ isActive: false });

    // Insert or update the new config
    await db.insert(authConfig).values({
      authType,
      config,
      isActive: true,
    });
  }

  // Room operations
  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms).orderBy(asc(rooms.name));
  }

  async getActiveRooms(): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(asc(rooms.name));
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<void> {
    await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, id));
  }

  // Booking operations
  async getAllBookings(): Promise<BookingWithDetails[]> {
    return await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .orderBy(desc(bookings.date), asc(bookings.startTime))
      .then((rows) =>
        rows.map((row) => ({
          ...row.bookings,
          user: row.users!,
          room: row.rooms!,
        }))
      );
  }

  async getUserBookings(userId: string): Promise<BookingWithDetails[]> {
    return await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.date), asc(bookings.startTime))
      .then((rows) =>
        rows.map((row) => ({
          ...row.bookings,
          user: row.users!,
          room: row.rooms!,
        }))
      );
  }

  async getRoomBookings(
    roomId: number,
    date?: string
  ): Promise<BookingWithDetails[]> {
    const conditions = [eq(bookings.roomId, roomId)];
    if (date) {
      conditions.push(eq(bookings.date, date));
    }

    return await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(and(...conditions))
      .orderBy(asc(bookings.date), asc(bookings.startTime))
      .then((rows) =>
        rows.map((row) => ({
          ...row.bookings,
          user: row.users!,
          room: row.rooms!,
        }))
      );
  }

  async getBooking(id: number): Promise<BookingWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.id, id));

    if (!result) return undefined;

    return {
      ...result.bookings,
      user: result.users!,
      room: result.rooms!,
    };
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async updateBooking(
    id: number,
    booking: Partial<InsertBooking>
  ): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<void> {
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async checkRoomAvailability(
    roomId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: number
  ): Promise<boolean> {
    const conditions = [
      eq(bookings.roomId, roomId),
      eq(bookings.date, date),
      eq(bookings.status, "confirmed"),
    ];

    if (excludeBookingId) {
      conditions.push(eq(bookings.id, excludeBookingId));
    }

    const conflictingBookings = await db
      .select()
      .from(bookings)
      .where(
        excludeBookingId ? and(...conditions.slice(0, -1)) : and(...conditions)
      );

    // Check for time conflicts
    for (const booking of conflictingBookings) {
      if (excludeBookingId && booking.id === excludeBookingId) continue;

      const bookingStart = booking.startTime;
      const bookingEnd = booking.endTime;

      // Check if times overlap
      if (
        (startTime >= bookingStart && startTime < bookingEnd) ||
        (endTime > bookingStart && endTime <= bookingEnd) ||
        (startTime <= bookingStart && endTime >= bookingEnd)
      ) {
        return false;
      }
    }

    return true;
  }

  async getBookingStats(): Promise<{
    totalRooms: number;
    availableRooms: number;
    totalBookingsToday: number;
    utilizationRate: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    const currentTime = new Date().toTimeString().split(" ")[0].substring(0, 5);

    const totalRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .then((rows) => rows.length);

    const todayBookings = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.date, today), eq(bookings.status, "confirmed")));

    // Count rooms that are currently available (not booked right now)
    const availableRooms =
      totalRooms -
      todayBookings.filter(
        (booking) =>
          booking.startTime <= currentTime && booking.endTime > currentTime
      ).length;

    const utilizationRate =
      totalRooms > 0
        ? Math.round((todayBookings.length / (totalRooms * 8)) * 100) // Assuming 8 working hours
        : 0;

    return {
      totalRooms,
      availableRooms,
      totalBookingsToday: todayBookings.length,
      utilizationRate,
    };
  }
}

export const storage = new DatabaseStorage();
