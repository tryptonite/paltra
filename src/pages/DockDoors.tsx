
import React, { useState, useEffect, useCallback } from 'react';
import { DockDoor } from '@/api/entities';
import { User } from '@/api/entities'; // Added User import
import DockDoorCard from '../components/dockdoors/DockDoorCard';
import AssignDockDoorDialog from '../components/dockdoors/AssignDockDoorDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast";

const StatusLegend = () =>
<Card className="mt-8 bg-white/60 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="text-lg">Status Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div>Available</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>Loading</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div>Out-of-service</div>
        </CardContent>
    </Card>;

export default function DockDoorsPage() {
  const [doors, setDoors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoor, setSelectedDoor] = useState(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [user, setUser] = useState(null); // Added user state
  const { toast } = useToast();

  // Throttled load function to prevent too many requests
  const loadData = useCallback(async (forceReload = false) => { // Renamed loadDoors to loadData
    const now = Date.now();
    // Only reload if it's been at least 2 seconds since last load, or if forced
    if (!forceReload && now - lastLoadTime < 2000) {
      return;
    }

    setIsLoading(true);
    try {
      // Add delay to prevent rapid requests
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const [allDoors, currentUser] = await Promise.all([ // Fetches doors and current user
        DockDoor.list('-updated_date'),
        User.me()
      ]);
      
      setUser(currentUser); // Set the current user

      const uniqueDoorsMap = new Map();
      allDoors.forEach((door) => {
        if (!uniqueDoorsMap.has(door.door_number)) {
          uniqueDoorsMap.set(door.door_number, door);
        }
      });
      const uniqueDoors = Array.from(uniqueDoorsMap.values());

      uniqueDoors.sort((a, b) => parseInt(a.door_number, 10) - parseInt(b.door_number, 10));
      setDoors(uniqueDoors);
      setLastLoadTime(now);
    } catch (error) {
      console.error('Error loading data:', error); // Updated error message
      if (error.response?.status === 429) {
        toast({
          title: "Too Many Requests",
          description: "Please wait a moment before refreshing. The system is busy.",
          variant: "destructive"
        });
        // Wait longer before allowing next request
        setLastLoadTime(now + 5000);
      } else {
        toast({
          title: "Error Loading Data", // Updated error title
          description: "There was an issue loading the dock doors or user information. Please try again in a moment.", // Updated description
          variant: "destructive"
        });
      }
    }
    setIsLoading(false);
  }, [lastLoadTime, toast]); // Added toast to dependency array

  useEffect(() => {
    loadData(true); // Force initial load (updated from loadDoors)
  }, []);

  const handleSave = async (doorId, data) => {
    if (!user) { // Check if user is available
        toast({
            title: "Authentication Error",
            description: "Could not identify user. Please refresh and try again.",
            variant: "destructive",
        });
        return;
    }
    try {
      // Include updated_by with the current user's email
      await DockDoor.update(doorId, { ...data, updated_by: user.email }); 
      toast({
        title: "Dock Door Updated",
        description: `Dock ${selectedDoor.door_number} has been updated successfully.`
      });
      setSelectedDoor(null);
      
      // Add longer delay before reloading to prevent rate limiting
      setTimeout(() => {
        loadData(true); // Updated from loadDoors
      }, 1000);
    } catch (error) {
      console.error('Error updating door:', error);
      if (error.response?.status === 429) {
        toast({
          title: "Too Many Requests",
          description: "Update saved, but please wait before making more changes.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Update Failed",
          description: "There was an error updating the dock door. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const edDoors = doors.filter((d) => {
    const doorNum = parseInt(d.door_number, 10);
    return doorNum >= 12 && doorNum <= 21 || d.door_number === '23';
  });

  const retailDoors = doors.filter((d) => {
    const doorNum = parseInt(d.door_number, 10);
    return doorNum >= 25 && doorNum <= 32 && d.door_number !== '26';
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dock Door Management</h1>
        <p className="text-slate-600 mt-1">Real-time tracking of carrier operations and dock door assignments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* ED Operations */}
        <Card className="shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-800">
              ED LTL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoading ?
              <p>Loading doors...</p> :

              edDoors.map((door) =>
              <DockDoorCard key={door.id} door={door} onSelect={setSelectedDoor} />
              )
              }
            </div>
          </CardContent>
        </Card>

        {/* Retail Operations */}
        <Card className="shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-slate-800">
              Retail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {isLoading ?
              <p>Loading doors...</p> :

              retailDoors.map((door) =>
              <DockDoorCard key={door.id} door={door} onSelect={setSelectedDoor} />
              )
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <StatusLegend />

      <AssignDockDoorDialog
        open={!!selectedDoor}
        onOpenChange={() => setSelectedDoor(null)}
        door={selectedDoor}
        onSave={handleSave} />

    </div>
  );
}
