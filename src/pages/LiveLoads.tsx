import React, { useState, useEffect } from 'react';
import { LiveLoads } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Truck, Clock, User as UserIcon, ChevronLeft, ChevronRight, Calculator, Check } from 'lucide-react';
import { isAfter, subDays } from 'date-fns';
import moment from 'moment';
import SpaceCalculator from '../components/liveloads/SpaceCalculator';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { getEmailsForCarrier, envKeySuffixForCarrier } from '@/utils/carrierEmails';

const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'WARD', 'XPO'];

interface FormatOptions {
  dateStyle?: 'short';
  timeStyle?: 'short' | 'medium';
  month?: 'long';
  day?: 'numeric';
  year?: 'numeric';
}

const formatInEST = (dateString: string, options: FormatOptions = {}) => {
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
  const { user, profile } = useAuth();
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
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyData, setCopyData] = useState<{ to: string[]; sentence: string; carrier: string } | null>(null);
  const [copied, setCopied] = useState<{ email: boolean; message: boolean }>({ email: false, message: false });

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
      console.log('Fetching live loads data with profiles...');
      const allLoads = await LiveLoads.listWithProfiles(); 
      console.log('All loads fetched:', allLoads.length, 'entries');
      
      // Filter entries by business day (since 11:00 PM EST previous day)
      const businessDayStart = getBusinessDayStart();
      console.log('Business day starts at:', businessDayStart);
      
      const todaysEntries = allLoads.filter(load => {
        const loadDate = new Date(load.created_time);
        return loadDate >= businessDayStart;
      });
      
      console.log(`Filtered ${todaysEntries.length} entries from ${allLoads.length} total entries for current business day`);
      
      setTodaysLoads(todaysEntries);
      
      // Generate carrier summary with user profiles
      const summary = {};
      todaysEntries.forEach(load => {
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
            last_submitted_at: load.created_time,
            last_submitted_by: (load.profile as any)?.full_name || load.submitted_by
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
        if (new Date(load.created_time) > new Date(summary[load.carrier].last_submitted_at)) {
          summary[load.carrier].last_submitted_at = load.created_time;
          summary[load.carrier].last_submitted_by = (load.profile as any)?.full_name || load.submitted_by;
        }
      });
      console.log('Carrier summary generated:', Object.values(summary));
      setCarrierSummary(Object.values(summary));
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTodaysData();
    }
  }, [user]);



  const toInt = (v: string) => Math.max(0, Number(v || 0) | 0);

  const handleDeleteEntry = async (entryId: string) => {
    try {
      console.log('=== DELETE ENTRY DEBUG ===');
      console.log('Entry ID to delete:', entryId);
      console.log('Entry ID type:', typeof entryId);
      
      // Check if entryId is valid
      if (!entryId) {
        throw new Error('No entry ID provided');
      }
      
      // First, let's verify the entry exists by trying to fetch it
      console.log('Verifying entry exists...');
      try {
        const { data: verifyData, error: verifyError } = await supabase
          .from('liveloads')
          .select('id, carrier')
          .eq('id', entryId)
          .single();
        
        console.log('Verification result:', { verifyData, verifyError });
        
        if (verifyError) {
          throw new Error(`Entry with ID ${entryId} not found in database: ${verifyError.message}`);
        }
        
        console.log('Entry verified, proceeding with delete...');
      } catch (verifyErr) {
        console.error('Verification failed:', verifyErr);
        throw verifyErr;
      }
      
      console.log('Calling LiveLoads.delete...');
      // Pass the original ID (number) to the delete function
      console.log('Using original ID (as number):', entryId);
      const result = await LiveLoads.delete(entryId);
      console.log('Delete result:', result);
      
      // Check if any rows were actually affected
      if (!result || result.length === 0) {
        console.log('No rows affected, but refreshing data to sync UI with database...');
        await fetchTodaysData();
        toast({ 
          title: 'Entry Not Found',
          description: 'The entry may have already been deleted. Data refreshed.',
          duration: 3000
        });
        return; // Exit early instead of throwing error
      }
      
      console.log('Entry deleted successfully from database');
      
      console.log('Refreshing data...');
      await fetchTodaysData();
      console.log('Data refreshed');
      
      toast({ 
        title: 'Entry Removed',
        description: 'The live load entry has been successfully removed.',
        duration: 5000
      });
      console.log('=== DELETE COMPLETE ===');
    } catch (error) {
      console.error('=== DELETE ERROR ===');
      console.error('Error removing entry:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast({ 
        title: 'Error',
        description: `Failed to remove the entry: ${error.message}`,
        variant: 'destructive',
        duration: 5000
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user || !carrier) {
      alert("You must be logged in and select a carrier.");
      return;
    }
    setConfirmData({
      carrier,
      ps_count: toInt(psCount),
      avd_count: toInt(avdCount),
      raceway_pallets: toInt(racewayPallets),
      fitting_pallets: toInt(fittingPallets),
      cartons_95: toInt(cartons95),
      total_pallets: toInt(psCount) + toInt(avdCount) + toInt(racewayPallets) + toInt(fittingPallets),
      total_cartons: toInt(cartons95),
    });
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmData) return;
    setIsLoading(true);
    setShowConfirm(false);

    try {
      console.log('Submitting data:', confirmData);
      console.log('User ID:', user!.id);
      
      const newRecord = await LiveLoads.create({
        ...confirmData,
        submitted_by: user!.id,          // ← MUST be the UUID
      });
      
      console.log('Data submitted successfully:', newRecord);
      
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
          duration: 5000,
          action: (
              <ToastAction
                  alt="Undo"
                  onClick={async () => {
                      try {
                          console.log('=== TOAST UNDO DEBUG ===');
                          console.log('Undoing entry with ID:', newRecord.id);
                          console.log('NewRecord object:', newRecord);
                          
                          if (!newRecord.id) {
                              throw new Error('No entry ID in newRecord');
                          }
                          
                          console.log('Calling LiveLoads.delete...');
                          // Pass the original ID (number) to the delete function
                          console.log('Using original ID (as number):', newRecord.id);
                          const result = await LiveLoads.delete(newRecord.id);
                          console.log('Delete result:', result);
                          
                          // Check if any rows were actually affected
                          if (!result || result.length === 0) {
                              console.log('No rows affected, but refreshing data to sync UI with database...');
                              await fetchTodaysData();
                              toast({ 
                                  title: 'Entry Not Found',
                                  description: 'The entry may have already been deleted. Data refreshed.',
                                  duration: 3000
                              });
                              return; // Exit early instead of throwing error
                          }
                          
                          console.log('Entry deleted successfully from database');
                          
                          console.log('Refreshing data...');
                          await fetchTodaysData();
                          console.log('Data refreshed');
                          
                          toast({ 
                              title: 'Entry Removed',
                              description: 'The live load entry has been successfully removed.',
                              duration: 5000
                          });
                          console.log('=== TOAST UNDO COMPLETE ===');
                      } catch (error) {
                          console.error('=== TOAST UNDO ERROR ===');
                          console.error('Error removing entry:', error);
                          console.error('Error details:', {
                              message: error.message,
                              code: error.code,
                              details: error.details,
                              hint: error.hint
                          });
                          toast({ 
                              title: 'Error',
                              description: `Failed to remove the entry: ${error.message}`,
                              variant: 'destructive',
                              duration: 5000
                          });
                      }
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
            Click a row to calculate space. Totals for {formatInEST(new Date().toISOString(), { month: 'long', day: 'numeric', year: 'numeric' })}. Resets daily at 11:00 PM EST.
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
                  onClick={() => {
                    setSelectedCarrierForCalc(summary)
                    const to = getEmailsForCarrier(summary.carrier)
                    const standardPallets = (summary.ps_total || 0) + (summary.avd_total || 0) + (summary.fitting_total || 0)
                    const racewayPallets = summary.raceway_total || 0
                    const racewaySpots = racewayPallets > 0 ? (Math.ceil(racewayPallets / 3) * 3) : 0
                    const totalSpots = standardPallets + racewaySpots
                    const sentence = `We need ${totalSpots} spots today.`
                    setCopyData({ to, sentence, carrier: summary.carrier })
                    setCopied({ email: false, message: false })
                    setShowCopyDialog(true)
                  }}
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

      {/* Centered copy dialog like Call-Ins */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Live Load Details</DialogTitle>
            <DialogDescription>Use the buttons to copy text for your email.</DialogDescription>
          </DialogHeader>
          {copyData && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex items-start gap-2">
                <div className="min-w-[120px] text-slate-600">Send to Email:</div>
                <div className="flex-1 text-slate-800 whitespace-nowrap overflow-x-auto">{copyData.to.join('; ') || 'Not configured'}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={copyData.to.length === 0}
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(copyData.to.join('; ')) } catch {}
                    setCopied((c) => ({ ...c, email: true }))
                    setTimeout(() => setCopied((c) => ({ ...c, email: false })), 2000)
                  }}
                >
                  {copied.email ? <Check className="h-4 w-4 text-green-600" /> : 'Copy'}
                </Button>
              </div>
              {copyData.to.length === 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                  No email configured for {copyData.carrier}. Set one of:
                  <div className="mt-1 text-xs text-amber-900">
                    - VITE_CARRIER_EMAIL_MAP JSON entry for "{copyData.carrier}"<br/>
                    - VITE_CALLIN_EMAIL_TO_{envKeySuffixForCarrier(copyData.carrier)}=<span className="select-all">someone@company.com</span><br/>
                    - fallback VITE_CALLIN_EMAIL_TO
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="min-w-[120px] text-slate-600">Message:</div>
                <div className="flex-1 break-words text-slate-800">{copyData.sentence}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(copyData.sentence) } catch {}
                    setCopied((c) => ({ ...c, message: true }))
                    setTimeout(() => setCopied((c) => ({ ...c, message: false })), 2000)
                  }}
                >
                  {copied.message ? <Check className="h-4 w-4 text-green-600" /> : 'Copy'}
                </Button>
              </div>
          </div>
          )}
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCopyDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <TableCell className="font-mono text-sm">{formatInEST(load.created_time, { dateStyle: 'short', timeStyle: 'medium' })}</TableCell>
                    <TableCell className="text-sm text-gray-600">{(load.profile as any)?.full_name || load.submitted_by}</TableCell>
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
