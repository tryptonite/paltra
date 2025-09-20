
import React, { useState, useEffect } from 'react';
import { CallIns } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Phone, Calendar as CalendarIcon, Filter } from 'lucide-react';
import moment from 'moment';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'WARD', 'XPO'];

const generateTimeOptions = () => {
  const times = [];
  times.push({ value: 'now', display: 'Now' }); // Added 'Now' option
  for (let hour = 8; hour <= 20; hour++) { // Changed range from 0-23 to 8-20
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 20 && minute > 0) continue; // Only include 8:00 PM, not 8:30 PM

      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      times.push({ value: timeString, display: displayTime });
    }
  }
  return times;
};

interface FormatOptions {
  dateStyle?: 'short';
  timeStyle?: 'short';
}

const formatInEST = (dateString: string, options: FormatOptions = {}) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    const date = moment.utc(dateString).utcOffset(-4);
    
    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    } else if (options.timeStyle === 'short') {
        return date.format('h:mm A');
    } else {
        return date.format('M/D/YY, h:mm A');
    }
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

export default function CallInsPage() {
  const [records, setRecords] = useState([]);
  const [dockDoor, setDockDoor] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trailerNumber, setTrailerNumber] = useState('');
  const [readyTime, setReadyTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [carrierFilter, setCarrierFilter] = useState('all');
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const timeOptions = generateTimeOptions();

  useEffect(() => {
  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch records with profile information ordered by submitted_at descending
      const data = await CallIns.listCallInsWithProfiles('submitted_at desc');
      setRecords(data);
    } catch(e) {
      console.error("Failed to load data", e);
    }
    setIsLoading(false);
  };
    loadData();
  }, [user]);

  const fetchRecords = async () => {
    // Fetch records with profile information ordered by submitted_at descending
    const data = await CallIns.listCallInsWithProfiles('submitted_at desc');
    setRecords(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !carrier || !readyTime || !trailerNumber) { 
        alert("Please fill all required fields.");
        return;
    }
    
    const today = new Date();
    let readyDateTime;

    if (readyTime === 'now') {
        const now = new Date();
        const roundedDateTime = new Date(now);

        if (roundedDateTime.getMinutes() >= 30) {
            roundedDateTime.setHours(roundedDateTime.getHours() + 1);
        }

        roundedDateTime.setMinutes(0);
        roundedDateTime.setSeconds(0);
        roundedDateTime.setMilliseconds(0);
        
        readyDateTime = roundedDateTime;
    } else {
        const [hours, minutes] = readyTime.split(':');
        readyDateTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), Number(hours), Number(minutes));
    }
    
    const data = {
      dock_door: dockDoor, 
      carrier, 
      trailer_number: trailerNumber, 
      ready_time: readyDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      display_ready_time: readyDateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) 
    };
    setConfirmData(data);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
      if(!confirmData) return;
      setIsLoading(true);
      setShowConfirm(false);

      try {
        // Get current user for authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please sign in');

        // Validation guards to prevent 400 errors
        if (!CARRIERS.includes(confirmData.carrier)) {
          setIsLoading(false);
          return alert('Invalid carrier');
        }
        
        if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(confirmData.ready_time)) {
          setIsLoading(false);
          return alert('Ready time must be HH:MM');
        }
        
        if (confirmData.dock_door && !Number.isFinite(Number(confirmData.dock_door))) {
          setIsLoading(false);
          return alert('Dock must be a number');
        }

        // Format ready time to include seconds if needed
        const formattedReadyTime = confirmData.ready_time.match(/^\d{1,2}:\d{2}$/) 
          ? `${confirmData.ready_time}:00` 
          : confirmData.ready_time;

        const payload = {
          submitted_by: user.id,
          carrier: confirmData.carrier,
          ready_time: formattedReadyTime,
          trailer_no: confirmData.trailer_number,
          dock: confirmData.dock_door ? Number(confirmData.dock_door) : 0,
        };

        console.log('Submitting payload:', payload);

        const { data, error } = await supabase
          .from('callins')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Insert failed', error);
          throw error;
        }

        console.log('Insert successful:', data);
        
        setDockDoor(''); 
        setCarrier(''); 
        setTrailerNumber(''); 
        setReadyTime('');
        setConfirmData(null);
        await fetchRecords();

        toast({
            title: 'Entry Saved',
            description: 'Your call-in entry has been submitted.',
            duration: 5000,
            action: (
                <ToastAction
                    altText="Undo"
                    onClick={async () => {
                        await supabase.from('callins').delete().eq('id', data.id);
                        await fetchRecords();
                        toast({ description: 'Entry successfully removed.' });
                    }}
                >
                    Undo
                </ToastAction>
            ),
        });
      } catch (error) {
        console.error('Failed to submit call-in:', error);
        toast({
          title: 'Error',
          description: `Failed to submit call-in: ${error.message}`,
          variant: 'destructive',
        });
      }

      setIsLoading(false);
  };
  
  const filteredRecords = records
    .filter(record => isSameDay(record.submitted_at, selectedDate))
    .filter(record => carrierFilter === 'all' || record.carrier === carrierFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 overflow-x-hidden">
      <Card className="lg:col-span-1 border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="h-5 w-5 text-blue-600" />
            </div>
            New Call-In
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="dockDoor" className="text-slate-700 font-medium">Dock Door (Optional)</Label>
              <Input 
                id="dockDoor" 
                type="number"
                min="1"
                max="99"
                value={dockDoor} 
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow up to 2 digits
                  if (value === '' || (value.length <= 2 && /^\d+$/.test(value))) {
                    setDockDoor(value);
                  }
                }} 
                className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" 
              />
            </div>
            <div>
              <Label htmlFor="carrier" className="text-slate-700 font-medium">Carrier *</Label>
              <Select value={carrier} onValueChange={setCarrier} required>
                <SelectTrigger className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map(carrierName => ( <SelectItem key={carrierName} value={carrierName}> {carrierName} </SelectItem> ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trailerNumber" className="text-slate-700 font-medium">Trailer # *</Label>
              <Input id="trailerNumber" value={trailerNumber} onChange={(e) => setTrailerNumber(e.target.value.replace(/[a-z]/g, (char) => char.toUpperCase()))} required className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
            </div>
            <div>
              <Label htmlFor="readyTime" className="text-slate-700 font-medium">Ready Time *</Label>
              <Select value={readyTime} onValueChange={setReadyTime} required>
                <SelectTrigger className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
                  <SelectValue placeholder="Select ready time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {timeOptions.map(({ value, display }) => ( <SelectItem key={value} value={value}> {display} </SelectItem> ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
              {isLoading ? 'Saving...' : 'Submit Call-In'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl border-b border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <CardTitle className="text-slate-800">Today's Call-Ins</CardTitle>
              <CardDescription className="text-slate-600 mt-1">Select a date to view call-ins for that day.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                  <SelectTrigger className="w-full sm:w-32 bg-white rounded-lg border-slate-300">
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {CARRIERS.map(carrierName => (
                      <SelectItem key={carrierName} value={carrierName}>
                        {carrierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full sm:w-[280px] justify-start text-left font-normal bg-white rounded-lg"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => setSelectedDate(date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Removed the overflow-x-auto div */}
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead className="text-slate-600 font-medium w-32">Submitted Date & Time</TableHead>
                <TableHead className="text-slate-600 font-medium w-20">User</TableHead>
                <TableHead className="text-slate-600 font-medium w-20">Carrier</TableHead>
                <TableHead className="text-slate-600 font-medium w-20">Ready Time</TableHead>
                <TableHead className="text-slate-600 font-medium w-20">Trailer #</TableHead>
                <TableHead className="text-slate-600 font-medium w-16">Dock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan="6" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
              {!isLoading && filteredRecords.length === 0 && <TableRow><TableCell colSpan="6" className="text-center py-8 text-slate-500">No call-ins found for this date.</TableCell></TableRow>}
              {filteredRecords.map(record => (
                <TableRow key={record.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                  <TableCell className="text-sm text-slate-600">{formatInEST(record.submitted_at, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell className="text-sm text-slate-700">{(record.profile as any)?.full_name || 'N/A'}</TableCell>
                  <TableCell className="font-medium text-slate-800">{record.carrier}</TableCell>
                  <TableCell className="text-sm text-slate-600 font-medium">{record.ready_time.substring(0, 5)}</TableCell>
                  <TableCell className="text-slate-700">{record.trailer_no}</TableCell>
                  <TableCell className="text-slate-700">{record.dock || 'N/A'}</TableCell>
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
                    <div className="flex justify-between"><span>Carrier:</span><span>{confirmData.carrier}</span></div>
                    <div className="flex justify-between"><span>Trailer #:</span><span>{confirmData.trailer_number}</span></div>
                    <div className="flex justify-between"><span>Ready Time:</span><span>{confirmData.display_ready_time}</span></div>
                    <div className="flex justify-between"><span>Dock Door:</span><span>{confirmData.dock_door || 'N/A'}</span></div>
                </div>
            )}
            <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
