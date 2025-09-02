
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import ControlNumberInput from './ControlNumberInput';

const DEPARTMENTS = ['P&S', 'WM-95', 'AVD'];
const usStates = [
    { name: 'Alabama', abbreviation: 'AL' }, { name: 'Alaska', abbreviation: 'AK' }, { name: 'Arizona', abbreviation: 'AZ' },
    { name: 'Arkansas', abbreviation: 'AR' }, { name: 'California', abbreviation: 'CA' }, { name: 'Colorado', abbreviation: 'CO' },
    { name: 'Connecticut', abbreviation: 'CT' }, { name: 'Delaware', abbreviation: 'DE' }, { name: 'Florida', abbreviation: 'FL' },
    { name: 'Georgia', abbreviation: 'GA' }, { name: 'Hawaii', abbreviation: 'HI' }, { name: 'Idaho', abbreviation: 'ID' },
    { name: 'Illinois', abbreviation: 'IL' }, { name: 'Indiana', abbreviation: 'IN' }, { name: 'Iowa', abbreviation: 'IA' },
    { name: 'Kansas', abbreviation: 'KS' }, { name: 'Kentucky', abbreviation: 'KY' }, { name: 'Louisiana', abbreviation: 'LA' },
    { name: 'Maine', abbreviation: 'ME' }, { name: 'Maryland', abbreviation: 'MD' }, { name: 'Massachusetts', abbreviation: 'MA' },
    { name: 'Michigan', abbreviation: 'MI' }, { name: 'Minnesota', abbreviation: 'MN' }, { name: 'Mississippi', abbreviation: 'MS' },
    { name: 'Missouri', abbreviation: 'MO' }, { name: 'Montana', abbreviation: 'MT' }, { name: 'Nebraska', abbreviation: 'NE' },
    { name: 'Nevada', abbreviation: 'NV' }, { name: 'New Hampshire', abbreviation: 'NH' }, { name: 'New Jersey', abbreviation: 'NJ' },
    { name: 'New Mexico', abbreviation: 'NM' }, { name: 'New York', abbreviation: 'NY' }, { name: 'North Carolina', abbreviation: 'NC' },
    { name: 'North Dakota', abbreviation: 'ND' }, { name: 'Ohio', abbreviation: 'OH' }, { name: 'Oklahoma', abbreviation: 'OK' },
    { name: 'Oregon', abbreviation: 'OR' }, { name: 'Pennsylvania', abbreviation: 'PA' }, { name: 'Rhode Island', abbreviation: 'RI' },
    { name: 'South Carolina', abbreviation: 'SC' }, { name: 'South Dakota', abbreviation: 'SD' }, { name: 'Tennessee', abbreviation: 'TN' },
    { name: 'Texas', abbreviation: 'TX' }, { name: 'Utah', abbreviation: 'UT' }, { name: 'Vermont', abbreviation: 'VT' },
    { name: 'Virginia', abbreviation: 'VA' }, { name: 'Washington', abbreviation: 'WA' }, { name: 'West Virginia', abbreviation: 'WV' },
    { name: 'Wisconsin', abbreviation: 'WI' }, { name: 'Wyoming', abbreviation: 'WY' }
];

export default function EditTruckloadDialog({ open, onOpenChange, record, onSave }) {
  const [pickupDate, setPickupDate] = useState(null);
  const [department, setDepartment] = useState('');
  const [shipVia, setShipVia] = useState('');
  const [controlNumbers, setControlNumbers] = useState([]);
  const [waveNumber, setWaveNumber] = useState('');
  const [poNumbers, setPoNumbers] = useState([]); // Changed from poNumber to poNumbers
  const [companyName, setCompanyName] = useState(''); // New state variable
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [totalPieces, setTotalPieces] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (record) {
      setPickupDate(record.pickup_date ? new Date(record.pickup_date + 'T00:00:00') : null); // Adjusted date parsing
      setDepartment(record.department || '');
      setShipVia(record.ship_via || '');
      setControlNumbers(record.control_numbers || []);
      setWaveNumber(record.wave_number || '');
      setPoNumbers(record.po_numbers || []); // Initialize with po_numbers array
      setCompanyName(record.company_name || ''); // Initialize company name
      setDestinationCity(record.destination_city || '');
      setDestinationState(record.destination_state || '');
      setTotalPieces(record.total_pieces?.toString() || '');
      setWeight(record.weight?.toString() || '');
    }
  }, [record]);

  const handleSave = () => {
    // Updated validation for poNumbers
    if (!pickupDate || !department || !shipVia || controlNumbers.length === 0 || !waveNumber || poNumbers.length === 0 || !companyName || !destinationCity || !destinationState || totalPieces === '' || weight === '') {
      // Potentially add a visual cue for incomplete fields
      console.error("Please fill all required fields.");
      return;
    }

    const updatedRecord = {
      pickup_date: format(pickupDate, 'yyyy-MM-dd'),
      department,
      ship_via: shipVia.toUpperCase(),
      control_numbers: controlNumbers,
      wave_number: waveNumber.toUpperCase(),
      po_numbers: poNumbers, // Changed to po_numbers array
      company_name: companyName.toUpperCase(), // Include company name
      destination_city: destinationCity.toUpperCase(),
      destination_state: destinationState,
      total_pieces: Number(totalPieces),
      weight: Number(weight),
    };
    onSave(record.id, updatedRecord);
    onOpenChange(false); // Close dialog after saving
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Truckload</DialogTitle>
          <DialogDescription>Make changes to the truckload details below.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div>
            <Label className="text-slate-700 font-medium">Pickup Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-2 justify-start text-left font-normal rounded-lg border-slate-300">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pickupDate ? format(pickupDate, 'PPP') : 'Select pickup date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="editDepartment" className="text-slate-700 font-medium">Department *</Label>
            <Select value={department} onValueChange={setDepartment} required>
              <SelectTrigger id="editDepartment" className="mt-2 rounded-lg border-slate-300 w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="editShipVia" className="text-slate-700 font-medium">Ship Via *</Label>
            <Input id="editShipVia" value={shipVia} onChange={(e) => setShipVia(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 w-full" style={{textTransform: "uppercase"}}/>
          </div>
          {/* Updated ControlNumberInput props */}
          <ControlNumberInput values={controlNumbers} setValues={setControlNumbers} label="Control # *" placeholder="Add control #" maxLength={6} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editWaveNumber" className="text-slate-700 font-medium">Wave # *</Label>
              <Input id="editWaveNumber" type="text" value={waveNumber} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val.length <= 4) setWaveNumber(val); }} required className="mt-2 rounded-lg border-slate-300 w-full" />
            </div>
            {/* Replaced PO # Input with ControlNumberInput */}
            <div className="col-span-1 sm:col-span-2">
                <ControlNumberInput values={poNumbers} setValues={setPoNumbers} label="PO # *" placeholder="Add PO #" />
            </div>
          </div>
          <div>
            <Label htmlFor="editCompanyName" className="text-slate-700 font-medium">Company Name *</Label>
            <Input id="editCompanyName" value={companyName} onChange={(e) => setCompanyName(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 w-full" style={{textTransform: "uppercase"}}/>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editDestinationCity" className="text-slate-700 font-medium">Destination City *</Label>
              <Input id="editDestinationCity" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 w-full" />
            </div>
            <div>
              <Label htmlFor="editDestinationState" className="text-slate-700 font-medium">State *</Label>
              <Select value={destinationState} onValueChange={setDestinationState} required>
                <SelectTrigger id="editDestinationState" className="mt-2 rounded-lg border-slate-300 w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {usStates.map(state => (<SelectItem key={state.abbreviation} value={state.abbreviation}>{state.abbreviation}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editTotalPieces" className="text-slate-700 font-medium">Total Pieces *</Label>
              <Input id="editTotalPieces" type="number" min="0" step="1" value={totalPieces} onChange={(e) => setTotalPieces(e.target.value)} required className="mt-2 rounded-lg border-slate-300 w-full" />
            </div>
            <div>
              <Label htmlFor="editWeight" className="text-slate-700 font-medium">Weight *</Label>
              <Input id="editWeight" type="number" min="0" step="1" value={weight} onChange={(e) => setWeight(e.target.value)} required className="mt-2 rounded-lg border-slate-300 w-full" />
            </div>
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
