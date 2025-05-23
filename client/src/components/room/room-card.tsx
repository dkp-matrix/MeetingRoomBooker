import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Monitor, Wifi, Coffee, Camera } from "lucide-react";
import type { Room } from "@shared/schema";

interface RoomCardProps {
  room: Room;
  onBook: () => void;
  showAvailability?: boolean;
  detailed?: boolean;
  isAvailable?: boolean;
}

const equipmentIcons: Record<string, React.ComponentType<any>> = {
  "Projector": Monitor,
  "WiFi": Wifi,
  "Coffee": Coffee,
  "Video Conference": Camera,
  "Video Conf": Camera,
};

export default function RoomCard({ 
  room, 
  onBook, 
  showAvailability = false, 
  detailed = false,
  isAvailable = true 
}: RoomCardProps) {
  const getCapacityColor = (capacity: number) => {
    if (capacity <= 6) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    if (capacity <= 12) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
  };

  const getCapacitySize = (capacity: number) => {
    if (capacity <= 6) return "Small";
    if (capacity <= 12) return "Medium";
    return "Large";
  };

  return (
    <Card className={`shadow-material border-0 transition-all duration-200 ${
      isAvailable 
        ? "hover:shadow-material-lg hover:border-primary/20 cursor-pointer" 
        : "opacity-60 cursor-not-allowed"
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground font-medium">{room.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {showAvailability && (
                <Badge 
                  variant={isAvailable ? "default" : "destructive"}
                  className={isAvailable 
                    ? "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20" 
                    : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {isAvailable ? "Available" : "Occupied"}
                </Badge>
              )}
              {detailed && (
                <Badge 
                  variant="outline" 
                  className={getCapacityColor(room.capacity)}
                >
                  {getCapacitySize(room.capacity)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center text-sm text-muted-foreground space-x-4">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span className="font-medium">{room.capacity} people</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            <span>Floor {room.floor}</span>
          </div>
        </div>
        
        {room.equipment && room.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {room.equipment.map((item, index) => {
              const IconComponent = equipmentIcons[item] || Monitor;
              return (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs bg-muted/50 text-muted-foreground border-muted-foreground/20 flex items-center gap-1"
                >
                  <IconComponent className="h-3 w-3" />
                  {item}
                </Badge>
              );
            })}
          </div>
        )}
        
        {!isAvailable && detailed && (
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-destructive rounded-full mr-2"></span>
              Currently occupied - Check schedule for availability
            </span>
          </div>
        )}
        
        <div className="pt-2">
          <Button
            onClick={onBook}
            disabled={!isAvailable}
            className={`w-full font-medium transition-colors ${
              isAvailable
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-material"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isAvailable ? "Book Now" : "Currently Occupied"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
