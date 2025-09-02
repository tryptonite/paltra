
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { CheckSquare, Pencil, X } from 'lucide-react';

export default function TruckloadDetailsDialog({ record, open, onOpenChange, onEdit, onComplete }) {
  if (!record) return null;

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit(record);
  };

  const handleCompleteClick = (e) => {
    e.stopPropagation();
    onComplete(record.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Truckload Details</DialogTitle>
          <DialogDescription>
            PO #s: <span className="font-semibold text-slate-800">{record.po_numbers?.join(', ')}</span> for <span className="font-semibold text-slate-800">{record.ship_via}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4 text-sm">
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Pickup Date:</span><span className="text-slate-800 font-semibold">{format(new Date(record.pickup_date + 'T00:00:00'), 'PPP')}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Department:</span><span className="text-slate-800">{record.department}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Ship Via:</span><span className="text-slate-800">{record.ship_via}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Control Numbers:</span><span className="text-slate-800">{record.control_numbers?.join(', ')}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Wave #:</span><span className="text-slate-800">{record.wave_number}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">PO #s:</span><span className="text-slate-800">{record.po_numbers?.join(', ')}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Destination:</span><span className="text-slate-800">{record.destination_city}, {record.destination_state}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Company Name:</span><span className="text-slate-800">{record.company_name}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Total Pieces:</span><span className="text-slate-800">{record.total_pieces}</span></div>
            <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Weight:</span><span className="text-slate-800">{record.weight} lbs</span></div>
        </div>
        <DialogFooter className="sm:justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" /> Close
            </Button>
            <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleEditClick}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button type="button" onClick={handleCompleteClick} className="bg-green-600 hover:bg-green-700">
                    <CheckSquare className="mr-2 h-4 w-4" /> Mark Completed
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
