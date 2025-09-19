import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'FDXG', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'UPSG', 'WARD', 'XPO', 'OTHER'];

export default function AssignDockDoorDialog({ open, onOpenChange, door, onSave }) {
  const [status, setStatus] = useState('Available');
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');

  useEffect(() => {
    if (door) {
      setStatus(door.status || 'Available');
      const doorCarrier = door.carrier || '';
      if (CARRIERS.includes(doorCarrier)) {
        setCarrier(doorCarrier);
        setCustomCarrier('');
      } else if (doorCarrier) {
        setCarrier('OTHER');
        setCustomCarrier(doorCarrier);
      } else {
        setCarrier('');
        setCustomCarrier('');
      }
      setTrailerNumber(door.trailer_number || '');
    }
  }, [door]);

  useEffect(() => {
    // Auto-change status to Loading when user enters data
    const effectiveCarrier = carrier === 'OTHER' ? customCarrier : carrier;
    if ((effectiveCarrier || trailerNumber) && status === 'Available') {
      setStatus('Loading');
    }
  }, [carrier, customCarrier, trailerNumber, status]);

  const handleSave = () => {
    const effectiveCarrier = carrier === 'OTHER' ? customCarrier.toUpperCase() : carrier;
    
    let dataToSave = {
      status: status,
      carrier: effectiveCarrier,
      trailer_number: trailerNumber.toUpperCase(),
    };

    // Don't clear data when changing status - only clear when explicitly setting to Available/Out-of-service without data
    if (status === 'Available' && !effectiveCarrier && !trailerNumber) {
      dataToSave.carrier = '';
      dataToSave.trailer_number = '';
    } else if (status === 'Out-of-service') {
      // Keep existing data even when out of service
    }
    
    onSave(door.id, dataToSave);
  };

  const handleClear = () => {
    setStatus('Available');
    setCarrier('');
    setCustomCarrier('');
    setTrailerNumber('');
    
    // Immediately save the cleared state
    onSave(door.id, {
      status: 'Available',
      carrier: '',
      trailer_number: '',
    });
  };
  
  const isDataEntryDisabled = status === 'Out-of-service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Dock Door {door?.door_number}</DialogTitle>
          <DialogDescription>Update the carrier and trailer information for this dock door.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="status" className="font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="mt-2">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Loading">Loading</SelectItem>
                    <SelectItem value="Out-of-service">Out-of-service</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="carrier" className="font-medium">Carrier</Label>
            <Select value={carrier} onValueChange={setCarrier} disabled={isDataEntryDisabled}>
                <SelectTrigger id="carrier" className="mt-2">
                    <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                    {CARRIERS.map(carrierName => (
                        <SelectItem key={carrierName} value={carrierName}>
                            {carrierName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          {carrier === 'OTHER' && (
            <div>
              <Label htmlFor="customCarrier" className="font-medium">Enter Carrier Name</Label>
              <Input 
                id="customCarrier" 
                value={customCarrier} 
                onChange={e => setCustomCarrier(e.target.value.toUpperCase())} 
                className="mt-2 uppercase" 
                style={{ textTransform: 'uppercase' }}
                placeholder="Enter carrier name"
                disabled={isDataEntryDisabled}
              />
            </div>
          )}
          <div>
            <Label htmlFor="trailerNumber" className="font-medium">Trailer Number</Label>
            <Input 
              id="trailerNumber" 
              value={trailerNumber} 
              onChange={e => setTrailerNumber(e.target.value.toUpperCase())} 
              className="mt-2 uppercase" 
              style={{ textTransform: 'uppercase' }}
              placeholder="Enter trailer number"
              disabled={isDataEntryDisabled}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleClear}>
              Clear & Reset
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}