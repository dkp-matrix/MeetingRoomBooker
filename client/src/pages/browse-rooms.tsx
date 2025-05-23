import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import RoomCard from "@/components/room/room-card";
import BookingModal from "@/components/booking/booking-modal";
import { Search, Filter, Plus } from "lucide-react";
import { useState, useMemo } from "react";
import type { Room } from "@shared/schema";

export default function BrowseRooms() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<string>("");
  const [floorFilter, setFloorFilter] = useState<string>("");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("");

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["/api/rooms"],
  });

  // Get unique values for filters
  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(room => room.floor).filter(Boolean);
    return [...new Set(floors)].sort();
  }, [rooms]);

  const uniqueEquipment = useMemo(() => {
    const equipment = rooms.flatMap(room => room.equipment || []);
    return [...new Set(equipment)].sort();
  }, [rooms]);

  // Filter rooms based on search and filters
  const filteredRooms = useMemo(() => {
    return rooms.filter((room: Room) => {
      const matchesSearch = !searchTerm || 
        room.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCapacity = !capacityFilter || 
        (capacityFilter === "small" && room.capacity <= 6) ||
        (capacityFilter === "medium" && room.capacity > 6 && room.capacity <= 12) ||
        (capacityFilter === "large" && room.capacity > 12);
      
      const matchesFloor = !floorFilter || room.floor === floorFilter;
      
      const matchesEquipment = !equipmentFilter || 
        (room.equipment || []).includes(equipmentFilter);

      return matchesSearch && matchesCapacity && matchesFloor && matchesEquipment;
    });
  }, [rooms, searchTerm, capacityFilter, floorFilter, equipmentFilter]);

  const handleBookRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    setIsBookingModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCapacityFilter("");
    setFloorFilter("");
    setEquipmentFilter("");
  };

  const hasActiveFilters = searchTerm || capacityFilter || floorFilter || equipmentFilter;

  return (
    <>
      {/* Header */}
      <header className="bg-card shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Browse Rooms</h2>
            <p className="text-sm text-muted-foreground">Find and book the perfect meeting room</p>
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
              Search & Filter Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rooms..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={capacityFilter} onValueChange={setCapacityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Capacity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (1-6 people)</SelectItem>
                  <SelectItem value="medium">Medium (7-12 people)</SelectItem>
                  <SelectItem value="large">Large (13+ people)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Floor" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueFloors.map(floor => (
                    <SelectItem key={floor} value={floor}>Floor {floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueEquipment.map(equipment => (
                    <SelectItem key={equipment} value={equipment}>{equipment}</SelectItem>
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
                {capacityFilter && (
                  <Badge variant="secondary">
                    Capacity: {capacityFilter}
                  </Badge>
                )}
                {floorFilter && (
                  <Badge variant="secondary">
                    Floor: {floorFilter}
                  </Badge>
                )}
                {equipmentFilter && (
                  <Badge variant="secondary">
                    Equipment: {equipmentFilter}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${filteredRooms.length} room${filteredRooms.length !== 1 ? 's' : ''} found`}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Card key={i} className="shadow-material border-0">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                    <div className="h-8 bg-muted animate-pulse rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <Card className="shadow-material border-0">
            <CardContent className="p-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No rooms found</h3>
              <p className="text-muted-foreground mb-6">
                {hasActiveFilters 
                  ? "Try adjusting your search criteria or clearing some filters."
                  : "No meeting rooms are currently available."}
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
            {filteredRooms.map((room) => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onBook={() => handleBookRoom(room.id)}
                showAvailability
                detailed
              />
            ))}
          </div>
        )}
      </main>

      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedRoomId(null);
        }}
        defaultRoomId={selectedRoomId}
      />
    </>
  );
}
