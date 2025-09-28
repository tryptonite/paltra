import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isSupabaseConfigured } from '@/api/entities';

const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'FDXG', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'UPSG', 'WARD', 'XPO', 'OTHER'];

export default function AssignDockDoorDialog({ open, onOpenChange, door, onSave }) {
  const [status, setStatus] = useState('Available');
  const [carrier, setCarrier] = useState('');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      setTrailerNumber(door.trailer || '');
    }
  }, [door]);

  useEffect(() => {
    // Auto-change status to Loading when user enters data
    const effectiveCarrier = carrier === 'OTHER' ? customCarrier : carrier;
    if ((effectiveCarrier || trailerNumber) && status === 'Available') {
      setStatus('Loading');
    }
  }, [carrier, customCarrier, trailerNumber, status]);

  const handleSave = async () => {
    console.log('[UI] Save clicked for door:', door?.door_number);
    
    // Add debugging for Supabase configuration
    console.log('isSupabaseConfigured:', isSupabaseConfigured());
    console.log('SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
    
    try {
      setIsSaving(true);
      const effectiveCarrier = carrier === 'OTHER' ? customCarrier.toUpperCase() : carrier;
      
      let dataToSave = {
        status: status,
        carrier: effectiveCarrier,
        trailer: trailerNumber.toUpperCase(),
      };

      // Don't clear data when changing status - only clear when explicitly setting to Available/Out-of-service without data
      if (status === 'Available' && !effectiveCarrier && !trailerNumber) {
        dataToSave.carrier = '';
        dataToSave.trailer = '';
      } else if (status === 'Out-of-service') {
        // Keep existing data even when out of service
      }
      
      console.log('[UI] Calling onSave with:', { id: door.id, data: dataToSave });
      const res = await onSave(door.id, dataToSave);
      console.log('[UI] Update success:', res);
      
      // Close dialog on successful save
      onOpenChange(false);
    } catch (e) {
      console.error('[UI] Update failed:', e);
      // Optionally show error message to user
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    console.log('[UI] Clear clicked for door:', door?.door_number);
    
    try {
      setIsSaving(true);
      
      setStatus('Available');
      setCarrier('');
      setCustomCarrier('');
      setTrailerNumber('');
      
      const clearData = {
        status: 'Available',
        carrier: '',
        trailer: ''
      };
      
      console.log('[UI] Calling onSave with clear data:', { id: door.id, data: clearData });
      const res = await onSave(door.id, clearData);
      console.log('[UI] Clear success:', res);
      
      // Close dialog on successful clear
      onOpenChange(false);
    } catch (e) {
      console.error('[UI] Clear failed:', e);
      // Optionally show error message to user
    } finally {
      setIsSaving(false);
    }
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleClear} disabled={isSaving}>
              {isSaving ? 'Clearing...' : 'Clear & Reset'}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
