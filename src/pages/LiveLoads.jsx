
import React, { useState, useEffect } from 'react';
import { LiveLoad } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Truck, Clock, User as UserIcon, ChevronLeft, ChevronRight, Calculator } from 'lucide-react';
import { isAfter, subDays } from 'date-fns';
import moment from 'moment';
import SpaceCalculator from '../components/liveloads/SpaceCalculator';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'WARD', 'XPO'];

const formatInEST = (dateString, options = {}) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    const date = moment.utc(dateString).utcOffset(-4);
    
    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    } else if (options.dateStyle === 'short' && options.timeStyle === 'medium') {
        return date.format('M/D/YY, h:mm:ss A');
    } else if (options.month && options.day && options.year) {
        return date.format('MMMM D, YYYY');
    } else {
        // Default format if no specific options match
        return date.format('M/D/YY, h:mm A');
    }
};

export default function LiveLoadsPage() {
  const [user, setUser] = useState(null);
  const [carrier, setCarrier] = useState('');
  const [psCount, setPsCount] = useState('');
  const [avdCount, setAvdCount] = useState('');
  const [racewayPallets, setRacewayPallets] = useState('');
  const [fittingPallets, setFittingPallets] = useState('');
  const [cartons95, setCartons95] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [todaysLoads, setTodaysLoads] = useState([]);
  const [carrierSummary, setCarrierSummary] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [selectedCarrierForCalc, setSelectedCarrierForCalc] = useState(null);
  const { toast } = useToast();

  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(todaysLoads.length / ITEMS_PER_PAGE);
  const currentItems = todaysLoads.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const totalPallets = Number(psCount || 0) + Number(avdCount || 0) + Number(racewayPallets || 0) + Number(fittingPallets || 0);
  const totalCartons = Number(cartons95 || 0);

  const getBusinessDayStart = () => {
    const now = moment().utcOffset(-4); // Use fixed offset for EST
    let businessDayStart = now.clone();

    if (now.hour() >= 23) {
      businessDayStart.hour(23).minute(0).second(0).millisecond(0);
    } else {
      businessDayStart.subtract(1, 'days').hour(23).minute(0).second(0).millisecond(0);
    }
    return businessDayStart.toDate(); // Return a Date object for isAfter
  };

  const fetchTodaysData = async () => {
    setIsLoading(true);
    try {
      const allLoads = await LiveLoad.list('-created_date', 100); 
      const businessDayStart = getBusinessDayStart();
      
      const todaysEntries = allLoads.filter(load => 
        isAfter(new Date(load.created_date), businessDayStart)
      );
      
      setTodaysLoads(todaysEntries);
      generateCarrierSummary(todaysEntries);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        await fetchTodaysData();
      } catch (e) {
        console.error("Failed to fetch user or data", e);
        setIsLoading(false);
      }
    };
    fetchUserAndData();
  }, []);

  const generateCarrierSummary = (loads) => {
    const summary = {};
    loads.forEach(load => {
      if (!summary[load.carrier]) {
        summary[load.carrier] = {
          carrier: load.carrier,
          ps_total: 0,
          avd_total: 0,
          raceway_total: 0,
          fitting_total: 0,
          cartons_total: 0,
          total_pallets: 0,
          total_cartons: 0,
          last_submitted_at: load.created_date, // Initialize with current load's time
          last_submitted_by: load.created_by   // Initialize with current load's user
        };
      }
      summary[load.carrier].ps_total += load.ps_count || 0;
      summary[load.carrier].avd_total += load.avd_count || 0;
      summary[load.carrier].raceway_total += load.raceway_pallets || 0;
      summary[load.carrier].fitting_total += load.fitting_pallets || 0;
      summary[load.carrier].cartons_total += load.cartons_95 || 0;
      summary[load.carrier].total_pallets += load.total_pallets || 0;
      summary[load.carrier].total_cartons += load.total_cartons || 0;
      
      // Keep track of the most recent submission for this carrier
      if (new Date(load.created_date) > new Date(summary[load.carrier].last_submitted_at)) {
        summary[load.carrier].last_submitted_at = load.created_date;
        summary[load.carrier].last_submitted_by = load.created_by;
      }
    });
    setCarrierSummary(Object.values(summary));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user || !carrier) {
      alert("You must be logged in and select a carrier.");
      return;
    }
    const data = {
      carrier,
      ps_count: Number(psCount) || 0,
      avd_count: Number(avdCount) || 0,
      raceway_pallets: Number(racewayPallets) || 0,
      fitting_pallets: Number(fittingPallets) || 0,
      cartons_95: Number(cartons95) || 0,
      total_pallets: totalPallets,
      total_cartons: totalCartons,
    };
    setConfirmData(data);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmData) return;
    setIsLoading(true);
    setShowConfirm(false);

    try {
      const newRecord = await LiveLoad.create({
        ...confirmData,
        user_role: user.role,
        user_department: user.department,
      });
      
      setCarrier('');
      setPsCount('');
      setAvdCount('');
      setRacewayPallets('');
      setFittingPallets('');
      setCartons95('');
      setConfirmData(null);
      setCurrentPage(0);
      
      await fetchTodaysData();

      toast({
          title: 'Entry Saved',
          description: 'Your live load entry has been submitted.',
          duration: 10000,
          action: (
              <ToastAction
                  altText="Undo"
                  onClick={async () => {
                      await LiveLoad.delete(newRecord.id);
                      await fetchTodaysData();
                      toast({ description: 'Entry successfully removed.' });
                  }}
              >
                  Undo
              </ToastAction>
          ),
      });

    } catch (error) {
      console.error("Failed to submit data", error);
      alert("Failed to submit data. Please try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Left Column: Entry Form */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm h-full">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl border-b border-slate-100">
              <CardTitle className="flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                Live Load Entry
              </CardTitle>
              <CardDescription className="text-slate-600">
                Enter counts for live loads. Totals will update on the right.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 p-4 sm:p-6">
                <div>
                  <Label htmlFor="carrier" className="text-slate-700 font-medium">Carrier *</Label>
                  <Select value={carrier} onValueChange={setCarrier} required>
                    <SelectTrigger className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
                      <SelectValue placeholder="Select a carrier" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Label htmlFor="psCount" className="text-base font-semibold text-slate-700">P&S Pallets</Label>
                    <Input id="psCount" type="number" min="0" step="1" value={psCount} onChange={(e) => setPsCount(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                  </div>
                  <div>
                    <Label htmlFor="avdCount" className="text-base font-semibold text-slate-700">AVD Pallets</Label>
                    <Input id="avdCount" type="number" min="0" step="1" value={avdCount} onChange={(e) => setAvdCount(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                  </div>
                </div>

                <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="font-semibold tracking-tight text-lg text-slate-800">95 Department</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="racewayPallets" className="text-slate-700 font-medium">Raceway Pallets</Label>
                        <Input id="racewayPallets" type="number" min="0" step="1" value={racewayPallets} onChange={(e) => setRacewayPallets(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                      </div>
                      <div>
                        <Label htmlFor="fittingPallets" className="text-slate-700 font-medium">Fitting Pallets</Label>
                        <Input id="fittingPallets" type="number" min="0" step="1" value={fittingPallets} onChange={(e) => setFittingPallets(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cartons95" className="text-slate-700 font-medium">Cartons</Label>
                      <Input id="cartons95" type="number" min="0" step="1" value={cartons95} onChange={(e) => setCartons95(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                  {isLoading ? 'Submitting...' : 'Submit Load'}
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
        {/* Right Column: Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="bg-gradient-to-br from-blue-100 to-teal-100 border-blue-200 rounded-2xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 familiarize text-blue-800">
                  <Calculator className="h-5 w-5" />
                  Total Summary
                </CardTitle>
                <CardDescription className="text-blue-700">Updates in real-time as you type.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center bg-white/60 p-4 rounded-xl shadow-inner">
                  <span className="font-semibold text-lg text-blue-800">Total Pallets</span>
                  <span className="font-bold text-3xl text-blue-900">{totalPallets}</span>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-4 rounded-xl shadow-inner">
                  <span className="font-semibold text-lg text-blue-800">Total Cartons</span>
                  <span className="font-bold text-3xl text-blue-900">{totalCartons}</span>
                </div>
              </CardContent>
            </Card>
            {selectedCarrierForCalc && (
                <div className="mt-8">
                    <SpaceCalculator 
                        carrierData={selectedCarrierForCalc}
                        onClose={() => setSelectedCarrierForCalc(null)}
                    />
                </div>
            )}
          </div>
        </div>
      </div>
      <Separator className="my-6 sm:my-8" />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Today's Summary by Carrier</CardTitle>
          <CardDescription>
            Click a row to calculate space. Totals for {formatInEST(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}. Resets daily at 11:00 PM EST.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold w-28">Carrier</TableHead>
                <TableHead className="text-center w-20">P&S</TableHead>
                <TableHead className="text-center w-20">AVD</TableHead>
                <TableHead className="text-center w-24">Raceway</TableHead>
                <TableHead className="text-center w-24">Fitting</TableHead>
                <TableHead className="text-center w-20">Cartons</TableHead>
                <TableHead className="text-center font-semibold w-28">Total Pallets</TableHead>
                <TableHead className="text-center font-semibold w-28">Total Cartons</TableHead>
                <TableHead className="text-center w-32">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan="9" className="text-center py-8">Loading...</TableCell></TableRow>}
              {!isLoading && carrierSummary.length === 0 && <TableRow><TableCell colSpan="9" className="text-center py-8 text-gray-500">No loads entered today</TableCell></TableRow>}
              {carrierSummary.map((summary, index) => (
                <TableRow 
                  key={summary.carrier} 
                  className={`cursor-pointer transition-colors duration-200 ${selectedCarrierForCalc?.carrier === summary.carrier ? 'bg-purple-200 hover:bg-purple-200/80' : 'hover:bg-slate-100'}`}
                  onClick={() => setSelectedCarrierForCalc(summary)}
                >
                  <TableCell className="font-medium">{summary.carrier}</TableCell>
                  <TableCell className="text-center">{summary.ps_total}</TableCell>
                  <TableCell className="text-center">{summary.avd_total}</TableCell>
                  <TableCell className="text-center">{summary.raceway_total}</TableCell>
                  <TableCell className="text-center">{summary.fitting_total}</TableCell>
                  <TableCell className="text-center">{summary.cartons_total}</TableCell>
                  <TableCell className="text-center font-semibold bg-blue-50">{summary.total_pallets}</TableCell>
                  <TableCell className="text-center font-semibold bg-blue-50">{summary.total_cartons}</TableCell>
                  <TableCell className="text-center text-sm text-gray-600">{formatInEST(summary.last_submitted_at, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserIcon className="h-5 w-5" /> Recent Individual Entries</CardTitle>
          <CardDescription>Latest individual load entries with timestamps (showing {currentItems.length} of {todaysLoads.length})</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date & Time</TableHead>
                <TableHead className="w-24">User</TableHead>
                <TableHead className="w-24">Carrier</TableHead>
                <TableHead className="text-center w-20">P&S</TableHead>
                <TableHead className="text-center w-20">AVD</TableHead>
                <TableHead className="text-center w-24">95 Pallets</TableHead>
                <TableHead className="text-center w-24">95 Cartons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todaysLoads.length === 0 && !isLoading && <TableRow><TableCell colSpan="7" className="text-center py-8 text-gray-500">No entries today</TableCell></TableRow>}
              {currentItems.map((load) => (
                  <TableRow key={load.id}>
                    <TableCell className="font-mono text-sm">{formatInEST(load.created_date, { dateStyle: 'short', timeStyle: 'medium' })}</TableCell>
                    <TableCell className="text-sm text-gray-600">{load.created_by.split('@')[0]}</TableCell>
                    <TableCell className="font-medium">{load.carrier}</TableCell>
                    <TableCell className="text-center">{load.ps_count || 0}</TableCell>
                    <TableCell className="text-center">{load.avd_count || 0}</TableCell>
                    <TableCell className="text-center">{(load.raceway_pallets || 0) + (load.fitting_pallets || 0)}</TableCell>
                    <TableCell className="text-center">{load.cartons_95 || 0}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-gray-600">Page {currentPage + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
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
                    <div className="flex justify-between"><span>P&S Pallets:</span><span>{confirmData.ps_count}</span></div>
                    <div className="flex justify-between"><span>AVD Pallets:</span><span>{confirmData.avd_count}</span></div>
                    <div className="flex justify-between"><span>Raceway Pallets:</span><span>{confirmData.raceway_pallets}</span></div>
                    <div className="flex justify-between"><span>Fitting Pallets:</span><span>{confirmData.fitting_pallets}</span></div>
                    <div className="flex justify-between"><span>95 Cartons:</span><span>{confirmData.cartons_95}</span></div>
                    <Separator/>
                    <div className="flex justify-between font-bold"><span>Total Pallets:</span><span>{confirmData.total_pallets}</span></div>
                    <div className="flex justify-between font-bold"><span>Total Cartons:</span><span>{confirmData.total_cartons}</span></div>
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
