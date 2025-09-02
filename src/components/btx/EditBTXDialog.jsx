import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditBTXDialog({ open, onOpenChange, record, onSave }) {
  const [trackingNumber, setTrackingNumber] = useState('NCS');

  useEffect(() => {
    if (record) {
      setTrackingNumber(record.tracking_number || 'NCS');
    } else {
      setTrackingNumber('NCS');
    }
  }, [record]);

  const handleSave = () => {
    const updatedRecord = {
      tracking_number: trackingNumber.toUpperCase(),
    };
    
    onSave(record?.id, updatedRecord);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit BTX Entry</DialogTitle>
          <DialogDescription>Update the tracking number for this BTX shipment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-slate-700 font-medium">Shipment Type</Label>
            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600">{record?.shipment_type}</div>
          </div>
          <div>
            <Label className="text-slate-700 font-medium">Control Number</Label>
            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600">{record?.control_number}</div>
          </div>
          <div>
            <Label className="text-slate-700 font-medium">Wave Number</Label>
            <div className="mt-2 p-2 bg-slate-50 rounded-lg text-slate-600">{record?.wave_number}</div>
          </div>
          <div>
            <Label htmlFor="editTrackingNumber" className="text-slate-700 font-medium">Tracking Number <span className="text-slate-500 font-normal">(for Shipping only)</span></Label>
            <Input 
              id="editTrackingNumber" 
              value={trackingNumber} 
              onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
              className="mt-2 rounded-lg border-slate-300 w-full" 
              placeholder="NCS..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}