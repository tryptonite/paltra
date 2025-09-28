
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, Hash, Warehouse, XCircle } from 'lucide-react';

const statusStyles = {
  Available: 'bg-green-100 text-green-800',
  Loading: 'bg-blue-100 text-blue-800',
  'Out-of-service': 'bg-red-100 text-red-800',
};

const statusBorders = {
    Loading: 'border-blue-400',
    'Out-of-service': 'border-red-400',
    Available: 'border-transparent',
};

export default function DockDoorCard({ door, onSelect }) {
  const isCompact = door.status === 'Available' && !door.carrier && !door.trailer;

  // Compact View for available, empty doors
  if (isCompact) {
    return (
      <Card 
        onClick={() => onSelect(door)} 
        className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white/70 backdrop-blur-sm h-20 p-2 border-2 border-slate-200 hover:border-slate-300"
      >
        <div className="flex items-center justify-between w-full h-full">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Warehouse className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-800 text-sm block truncate">Door {door.door_number}</span>
                <div className="text-slate-500 text-xs font-medium truncate">Click to assign</div>
              </div>
            </div>
            <Badge className={`${statusStyles[door.status]} text-xs px-2 py-1 flex-shrink-0`}>{door.status}</Badge>
        </div>
      </Card>
    );
  }

  // Expanded View for active doors
  return (
    <Card 
      onClick={() => onSelect(door)} 
      className={`cursor-pointer hover:shadow-lg transition-all duration-300 bg-white/70 backdrop-blur-sm h-auto p-3 border-2 ${statusBorders[door.status] || 'border-transparent'}`}
    >
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2 min-w-0 flex-1">
            <Warehouse className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className="truncate">Dock Door {door.door_number}</span>
        </CardTitle>
        <Badge className={`${statusStyles[door.status]} text-xs px-2 py-1 flex-shrink-0`}>{door.status}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Truck className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-700 font-medium truncate">{door.carrier || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Hash className="h-4 w-4 text-slate-500 flex-shrink-0" />
              <span className="text-slate-700 font-medium truncate">{door.trailer || 'N/A'}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
