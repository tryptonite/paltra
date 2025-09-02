
import React, { useState, useEffect } from 'react';
import { Truckload } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Truck, CalendarIcon, CheckSquare, Pencil, PlusCircle, X } from 'lucide-react';
import { format, subWeeks } from 'date-fns';
import moment from 'moment';
import WeeklyCalendar from '../components/truckloads/WeeklyCalendar';
import EditTruckloadDialog from '../components/truckloads/EditTruckloadDialog';
import TruckloadDetailsDialog from '../components/truckloads/TruckloadDetailsDialog';
import ActiveSummaryDialog from '../components/truckloads/ActiveSummaryDialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

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

const formatInEST = (dateString, options = {}) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    const date = moment.utc(dateString).utcOffset(-4);
    
    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    } else if (options.dateStyle === 'short' && options.timeStyle === 'medium') {
        return date.format('M/D/YY, h:mm:ss A');
    } else {
        return date.format('M/D/YY, h:mm A');
    }
};

export default function TruckloadsPage() {
  const [records, setRecords] = useState([]);
  const [completedRecords, setCompletedRecords] = useState([]);
  const [user, setUser] = useState(null);
  const [pickupDate, setPickupDate] = useState(null);
  const [department, setDepartment] = useState('');
  const [shipVia, setShipVia] = useState('');
  // Updated state for controlNumbers and poNumbers to include current input
  const [controlNumbers, setControlNumbers] = useState({ values: [], currentInput: '' });
  const [waveNumber, setWaveNumber] = useState('');
  const [poNumbers, setPoNumbers] = useState({ values: [], currentInput: '' });
  const [companyName, setCompanyName] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [totalPieces, setTotalPieces] = useState('');
  const [weight, setWeight] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Removed selectedDateFilter state
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [selectedPickedUpRecord, setSelectedPickedUpRecord] = useState(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [summaryData, setSummaryData] = useState({ date: null, truckloads: [] });
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      const [activeData, allCompletedData] = await Promise.all([
        Truckload.filter({ completed: false }, '-created_date'),
        Truckload.filter({ completed: true }, '-updated_date')
      ]);
      setRecords(activeData);
      
      const oneWeekAgo = subWeeks(new Date(), 1);
      const recentCompleted = allCompletedData.filter(record => new Date(record.updated_date) > oneWeekAgo);
      setCompletedRecords(recentCompleted);

    } catch (e) {
      console.error("Failed to load data", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDateClick = (dateString) => {
    const truckloadsForDay = records.filter(record => record.pickup_date === dateString);
    setSummaryData({ date: dateString, truckloads: truckloadsForDay });
    setIsSummaryDialogOpen(true);
  };

  // filteredRecords is no longer needed as there's no filter for the active table
  // const filteredRecords = selectedDateFilter 
  //   ? records.filter(record => record.pickup_date === selectedDateFilter)
  //   : records;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Accept any current input in multi-entry fields before validation
    if (controlNumbers.currentInput.trim() && !controlNumbers.values.includes(controlNumbers.currentInput.trim())) {
      setControlNumbers(prev => ({
        values: [...prev.values, prev.currentInput.trim()],
        currentInput: ''
      }));
    }
    if (poNumbers.currentInput.trim() && !poNumbers.values.includes(poNumbers.currentInput.trim())) {
      setPoNumbers(prev => ({
        values: [...prev.values, prev.currentInput.trim()],
        currentInput: ''
      }));
    }

    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      // Re-read the state after the scheduled updates are expected to have processed.
      // Note: If the above setState calls cleared currentInput, these conditions will be false,
      // and it will simply use the updated controlNumbers.values / poNumbers.values.
      const finalControlNumbers = controlNumbers.currentInput.trim() && !controlNumbers.values.includes(controlNumbers.currentInput.trim()) 
        ? [...controlNumbers.values, controlNumbers.currentInput.trim()]
        : controlNumbers.values;
      
      const finalPoNumbers = poNumbers.currentInput.trim() && !poNumbers.values.includes(poNumbers.currentInput.trim())
        ? [...poNumbers.values, poNumbers.currentInput.trim()]
        : poNumbers.values;

      if (!user || !pickupDate || !department || !destinationCity || !destinationState || !shipVia || finalControlNumbers.length === 0 || !waveNumber || finalPoNumbers.length === 0 || !companyName || totalPieces === '' || weight === '') {
        alert("Please fill all required fields.");
        return;
      }

      const data = {
        pickup_date: pickupDate,
        pickup_date_display: format(pickupDate, 'PPP'),
        department,
        ship_via: shipVia,
        control_numbers: finalControlNumbers,
        wave_number: waveNumber,
        po_numbers: finalPoNumbers,
        company_name: companyName,
        destination_city: destinationCity,
        destination_state: destinationState,
        total_pieces: Number(totalPieces),
        weight: Number(weight),
        completed: false,
      };
      setConfirmData(data);
      setShowConfirm(true);
    }, 0);
  };

  const handleConfirmSubmit = async () => {
      if (!confirmData) return;
      setIsLoading(true);
      setShowConfirm(false);
  
      const newRecord = await Truckload.create({
          pickup_date: format(confirmData.pickup_date, 'yyyy-MM-dd'), // Use the date object directly
          department: confirmData.department,
          ship_via: confirmData.ship_via,
          control_numbers: confirmData.control_numbers,
          wave_number: confirmData.wave_number,
          po_numbers: confirmData.po_numbers,
          company_name: confirmData.company_name,
          destination_city: confirmData.destination_city,
          destination_state: confirmData.destination_state,
          total_pieces: confirmData.total_pieces,
          weight: confirmData.weight,
          completed: confirmData.completed,
          user_role: user.role,
          user_department: user.department,
      });
  
      setPickupDate(null);
      setDepartment('');
      setShipVia('');
      setControlNumbers({ values: [], currentInput: '' }); // Reset both currentInput and values
      setWaveNumber('');
      setPoNumbers({ values: [], currentInput: '' });     // Reset both currentInput and values
      setCompanyName('');
      setDestinationCity('');
      setDestinationState('');
      setTotalPieces('');
      setWeight('');
      setConfirmData(null);
      await loadData();

      toast({
          title: 'Entry Saved',
          description: 'Your truckload entry has been submitted.',
          duration: 10000,
          action: (
              <ToastAction
                  altText="Undo"
                  onClick={async () => {
                      if (newRecord?.id) { // Ensure newRecord and its id exist
                          await Truckload.delete(newRecord.id);
                          await loadData();
                          toast({ description: 'Entry successfully removed.' });
                      }
                  }}
              >
                  Undo
              </ToastAction>
          ),
      });

      setIsLoading(false);
  };

  const handleComplete = async (recordId) => {
    setIsLoading(true);
    await Truckload.update(recordId, { completed: true });
    setDetailsRecord(null); // Close details dialog if open
    await loadData();
    setIsLoading(false);
  };

  const handleEdit = (record) => {
    setDetailsRecord(null); // Close details dialog
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (recordId, updatedData) => {
    setIsLoading(true);
    await Truckload.update(recordId, updatedData);
    setIsEditDialogOpen(false);
    setEditingRecord(null);
    await loadData();
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-hidden">
      {/* Weekly Calendar */}
      <WeeklyCalendar 
        truckloads={records} 
        onDateClick={handleDateClick} // Changed from onDateFilter
        // selectedDate prop removed
      />
      
      {/* Entry Form */}
      <Card className="border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              New Truckload
            </CardTitle>
            <CardDescription className="text-slate-600">Enter truckload details</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">Pickup Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-2 justify-start text-left font-normal rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500">
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
                  <Label htmlFor="department" className="text-slate-700 font-medium">Department *</Label>
                  <Select value={department} onValueChange={setDepartment} required>
                    <SelectTrigger className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(dept => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shipVia" className="text-slate-700 font-medium">Ship Via *</Label>
                  <Input id="shipVia" value={shipVia} onChange={(e) => setShipVia(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" style={{textTransform: 'uppercase'}}/>
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Control # * </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={controlNumbers.currentInput || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val.length <= 6) {
                          setControlNumbers(prev => ({...prev, currentInput: val}));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = controlNumbers.currentInput.trim();
                          if (val && !controlNumbers.values.includes(val)) {
                            setControlNumbers(prev => ({
                              values: [...prev.values, val],
                              currentInput: ''
                            }));
                          }
                        }
                      }}
                      placeholder="Add control #"
                      className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      const val = controlNumbers.currentInput.trim();
                      if (val && !controlNumbers.values.includes(val)) {
                        setControlNumbers(prev => ({
                          values: [...prev.values, val],
                          currentInput: ''
                        }));
                      }
                    }} className="rounded-lg flex-shrink-0">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
                    {controlNumbers.values.map(num => (
                      <Badge key={num} variant="secondary" className="flex items-center gap-2 text-sm py-1 px-3">
                        {num}
                        <button type="button" onClick={() => {
                          setControlNumbers(prev => ({
                            ...prev,
                            values: prev.values.filter(n => n !== num)
                          }));
                        }} className="rounded-full hover:bg-slate-300 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="waveNumber" className="text-slate-700 font-medium">Wave # *</Label>
                  <Input id="waveNumber" type="number" value={waveNumber} onChange={(e) => { const val = e.target.value.replace(/[a-z]/g, (char) => char.toUpperCase()); if (val.length <= 3) setWaveNumber(val); }} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">PO # * </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={poNumbers.currentInput || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPoNumbers(prev => ({...prev, currentInput: val}));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = poNumbers.currentInput.trim();
                          if (val && !poNumbers.values.includes(val)) {
                            setPoNumbers(prev => ({
                              values: [...prev.values, val],
                              currentInput: ''
                            }));
                          }
                        }
                      }}
                      placeholder="Add PO #"
                      className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => {
                      const val = poNumbers.currentInput.trim();
                      if (val && !poNumbers.values.includes(val)) {
                        setPoNumbers(prev => ({
                          values: [...prev.values, val],
                          currentInput: ''
                        }));
                      }
                    }} className="rounded-lg flex-shrink-0">
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
                    {poNumbers.values.map(num => (
                      <Badge key={num} variant="secondary" className="flex items-center gap-2 text-sm py-1 px-3">
                        {num}
                        <button type="button" onClick={() => {
                          setPoNumbers(prev => ({
                            ...prev,
                            values: prev.values.filter(n => n !== num)
                          }));
                        }} className="rounded-full hover:bg-slate-300 p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                  <Label htmlFor="companyName" className="text-slate-700 font-medium">Company Name *</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" style={{textTransform: 'uppercase'}}/>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="destinationCity" className="text-slate-700 font-medium">Destination City *</Label>
                      <Input id="destinationCity" value={destinationCity} onChange={(e) => setDestinationCity(e.target.value.toUpperCase())} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                  </div>
                  <div>
                      <Label htmlFor="destinationState" className="text-slate-700 font-medium">State *</Label>
                      <Select value={destinationState} onValueChange={setDestinationState} required>
                          <SelectTrigger className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
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
                  <Label htmlFor="totalPieces" className="text-slate-700 font-medium">Total Pieces *</Label>
                  <Input id="totalPieces" type="number" min="0" step="1" value={totalPieces} onChange={(e) => setTotalPieces(e.target.value)} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                </div>
                <div>
                  <Label htmlFor="weight" className="text-slate-700 font-medium">Weight *</Label>
                  <Input id="weight" type="number" min="0" step="1" value={weight} onChange={(e) => setWeight(e.target.value)} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                {isLoading ? 'Saving...' : 'Add Truckload'}
              </Button>
            </form>
          </CardContent>
        </Card>

      {/* Records Table */}
      <Card className="border-slate-200 shadow-lg rounded-2xl">
          <CardHeader 
            className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl"
          >
            <CardTitle className="text-slate-800">
              Active Truckloads
            </CardTitle>
            <CardDescription className="text-slate-600 mt-1">
              Click a row for details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600 font-medium w-28">Pickup Date</TableHead>
                  <TableHead className="text-slate-600 font-medium w-16">Dept</TableHead>
                  <TableHead className="text-slate-600 font-medium w-20">Ship Via</TableHead>
                  <TableHead className="text-slate-600 font-medium w-24">PO #s</TableHead>
                  <TableHead className="text-slate-600 font-medium w-28">Control #s</TableHead>
                  <TableHead className="text-slate-600 font-medium w-16">Wave #</TableHead>
                  <TableHead className="text-slate-600 font-medium w-28">Company Name</TableHead>
                  <TableHead className="text-slate-600 font-medium w-24">Destination</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-16">Pieces</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-16">Weight</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-20">Completed</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan="12" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                {!isLoading && records.length === 0 && <TableRow><TableCell colSpan="12" className="text-center py-8 text-slate-500">No active truckloads found.</TableCell></TableRow>}
                {records.map(record => ( // Changed from filteredRecords.map
                  <TableRow key={record.id} onClick={() => setDetailsRecord(record)} className="hover:bg-slate-100 transition-colors border-slate-100 cursor-pointer">
                    <TableCell className="text-sm text-slate-700 font-medium">{format(new Date(record.pickup_date + 'T00:00:00'), 'MM/dd/yyyy')}</TableCell>
                    <TableCell className="text-sm text-slate-700">{record.department}</TableCell>
                    <TableCell className="text-sm text-slate-700">{record.ship_via}</TableCell>
                    <TableCell className="text-slate-700">{record.po_numbers?.join(', ')}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{record.control_numbers?.join(', ')}</TableCell>
                    <TableCell className="text-slate-700">{record.wave_number}</TableCell>
                    <TableCell className="text-slate-700">{record.company_name}</TableCell>
                    <TableCell className="text-slate-700">{record.destination_city}, {record.destination_state}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.total_pieces}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.weight}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox 
                          onCheckedChange={(checked) => {
                              if (checked) {
                                  handleComplete(record.id);
                              }
                          }} 
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" 
                          onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                     <TableCell className="text-center">
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={(e) => { 
                              e.stopPropagation(); 
                              handleEdit(record); 
                          }} 
                          className="text-slate-500 hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card> 

      <Card className="border-slate-200 shadow-lg rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
            <CardTitle className="flex items-center gap-2 text-green-800"><CheckSquare/> Picked Up Truckloads</CardTitle>
            <CardDescription className="text-green-700">Showing truckloads completed in the last 7 days. Click a row for details.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                  <TableRow className="border-slate-200">
                      <TableHead className="text-slate-600 font-medium w-32">Completed Date</TableHead>
                      <TableHead className="text-slate-600 font-medium w-28">Pickup Date</TableHead>
                      <TableHead className="text-slate-600 font-medium w-16">Dept</TableHead>
                      <TableHead className="text-slate-600 font-medium w-20">Ship Via</TableHead>
                      <TableHead className="text-slate-600 font-medium w-24">PO #s</TableHead>
                      <TableHead className="text-slate-600 font-medium w-28">Control #s</TableHead>
                      <TableHead className="text-slate-600 font-medium w-28">Company Name</TableHead>
                      <TableHead className="text-slate-600 font-medium w-24">Destination</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan="8" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                {!isLoading && completedRecords.length === 0 && <TableRow><TableCell colSpan="8" className="text-center py-8 text-slate-500">No truckloads completed in the last week.</TableCell></TableRow>}
                {completedRecords.map(record => (
                  <TableRow 
                    key={record.id} 
                    onClick={() => setSelectedPickedUpRecord(record)}
                    className="bg-green-50/30 hover:bg-green-50/60 transition-colors border-slate-100 cursor-pointer"
                  >
                    <TableCell className="text-sm text-slate-700 font-medium">{formatInEST(record.updated_date, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-sm text-slate-700">{format(new Date(record.pickup_date + 'T00:00:00'), 'MM/dd/yyyy')}</TableCell>
                    <TableCell className="text-sm text-slate-700">{record.department}</TableCell>
                    <TableCell className="text-sm text-slate-700">{record.ship_via}</TableCell>
                    <TableCell className="text-slate-700">{record.po_numbers?.join(', ')}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{record.control_numbers?.join(', ')}</TableCell>
                    <TableCell className="text-slate-700">{record.company_name}</TableCell>
                    <TableCell className="text-slate-700">{record.destination_city}, {record.destination_state}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm Submission</DialogTitle>
                    <DialogDescription>Please review the details before submitting.</DialogDescription>
                </DialogHeader>
                {confirmData && (
                    <div className="space-y-2 py-4 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Pickup Date:</span><span className="text-slate-800 text-right">{confirmData.pickup_date_display}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Department:</span><span className="text-slate-800 text-right">{confirmData.department}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Ship Via:</span><span className="text-slate-800 text-right">{confirmData.ship_via}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Control Numbers:</span><span className="text-slate-800 text-right">{confirmData.control_numbers.join(', ')}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Wave #:</span><span className="text-slate-800 text-right">{confirmData.wave_number}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">PO #s:</span><span className="text-slate-800 text-right">{confirmData.po_numbers.join(', ')}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Company Name:</span><span className="text-slate-800 text-right">{confirmData.company_name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Destination:</span><span className="text-slate-800 text-right">{confirmData.destination_city}, {confirmData.destination_state}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Total Pieces:</span><span className="text-slate-800 text-right">{confirmData.total_pieces}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-slate-600">Weight:</span><span className="text-slate-800 text-right">{confirmData.weight}</span></div>
                    </div>
                )}
                <DialogFooter className="sm:justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                    <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <EditTruckloadDialog 
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            record={editingRecord}
            onSave={handleSaveEdit}
            usStates={usStates} // Pass usStates for the dropdown in the dialog
        />

        <TruckloadDetailsDialog
            record={detailsRecord}
            open={!!detailsRecord}
            onOpenChange={() => setDetailsRecord(null)}
            onEdit={handleEdit}
            onComplete={handleComplete}
        />

        <ActiveSummaryDialog
            open={isSummaryDialogOpen}
            onOpenChange={setIsSummaryDialogOpen}
            date={summaryData.date}
            truckloads={summaryData.truckloads}
        />

        <Dialog open={!!selectedPickedUpRecord} onOpenChange={() => setSelectedPickedUpRecord(null)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Picked Up Truckload Details</DialogTitle>
                    <DialogDescription>
                        PO #s: <span className="font-semibold text-slate-800">{selectedPickedUpRecord?.po_numbers?.join(', ')}</span> for <span className="font-semibold text-slate-800">{selectedPickedUpRecord?.ship_via}</span>
                    </DialogDescription>
                </DialogHeader>
                {selectedPickedUpRecord && (
                    <div className="space-y-3 py-4 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Completed Date:</span>
                            <span className="text-slate-800 font-semibold">{formatInEST(selectedPickedUpRecord.updated_date, { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Pickup Date:</span>
                            <span className="text-slate-800 font-semibold">{format(new Date(selectedPickedUpRecord.pickup_date + 'T00:00:00'), 'PPP')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Department:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.department}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Ship Via:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.ship_via}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-slate-600">PO #s:</span>
                            <div className="text-slate-800 text-right">
                                {selectedPickedUpRecord.po_numbers?.map((num, index) => (
                                    <div key={index} className="font-mono">{num}</div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="font-medium text-slate-600">Control Numbers:</span>
                            <div className="text-slate-800 text-right">
                                {selectedPickedUpRecord.control_numbers?.map((num, index) => (
                                    <div key={index} className="font-mono">{num}</div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Wave #:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.wave_number}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Company Name:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.company_name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Destination:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.destination_city}, {selectedPickedUpRecord.destination_state}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Total Pieces:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.total_pieces}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-600">Weight:</span>
                            <span className="text-slate-800">{selectedPickedUpRecord.weight} lbs</span>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setSelectedPickedUpRecord(null)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
