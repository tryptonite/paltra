// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Dimension } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package2, Package } from 'lucide-react';
import DimensionRowInput from '../components/dimensions/DimensionRowInput';
import moment from 'moment';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from '@/lib/supabase';

const formatInEST = (dateString: string, options: { dateStyle?: 'short'; timeStyle?: 'short' | 'medium' } = {}) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    // Note: This assumes EDT (UTC-4) is the desired timezone for "EST" and does not handle DST transitions automatically.
    const date = moment.utc(dateString).utcOffset(-4);
    
    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    } else if (options.dateStyle === 'short' && options.timeStyle === 'medium') {
        return date.format('M/D/YY, h:mm:ss A');
    } else {
        // Default format if options don't match specific cases
        return date.format('M/D/YY, h:mm A');
    }
};

export default function DimensionsPage() {
  const [records, setRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 14;
  const [user, setUser] = useState(null);
  const [shipVia, setShipVia] = useState('');
  const [controlNumber, setControlNumber] = useState('');
  const [controlNumberError, setControlNumberError] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [skids, setSkids] = useState([{ length: '', width: '', height: '' }]);
  const [cartons, setCartons] = useState([{ length: '', width: '', height: '' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [dimensionDetails, setDimensionDetails] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const { toast } = useToast();

  const checkDuplicateControlNumber = async (number) => {
    if (!number) {
      setControlNumberError('');
      return false;
    }
    try {
      const isDuplicate = await Dimension.checkDuplicateControlNumber(number);
      if (isDuplicate) {
        setControlNumberError('An entry with this Control # already exists.');
        return true;
      }
      setControlNumberError('');
      return false;
    } catch (error) {
      console.error('Error checking duplicate control number:', error);
      setControlNumberError('Error checking control number. Please try again.');
      return true; // Assume duplicate to be safe
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        await fetchRecords();
      } catch (e) {
        console.error("Failed to load user data", e);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const debounceCheck = setTimeout(() => {
      if (controlNumber) {
        checkDuplicateControlNumber(controlNumber);
      } else {
        setControlNumberError('');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceCheck);
  }, [controlNumber]);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_dimensions_summary')
        .select('created_at, user_display, control_no, wave_no, ship_via, skids, cartons')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching dimensions summary, falling back", error);
        const fallbackData = await Dimension.list('-created_date');
        setRecords(fallbackData);
        setCurrentPage(1);
      } else {
        const mappedData = (data || []).map(r => ({
          created_date: r.created_at,
          created_by: r.user_display,
          control_number: r.control_no,
          wave_number: r.wave_no,
          ship_via: r.ship_via,
          skids: r.skids,
          cartons: r.cartons,
        }));
        setRecords(mappedData);
        setCurrentPage(1);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      try {
        const fallbackData = await Dimension.list('-created_date');
        setRecords(fallbackData);
      } catch (fallbackError) {
        console.error("Fallback failed", fallbackError);
      }
    }
    setIsLoading(false);
  };

  const handleRowClick = async (record) => {
    try {
      // Fetch all dimensions for this control number
      const controlNo = record.control_number || record.control_no;
      const { data, error } = await supabase
        .from('v_dimensions')
        .select('id, created_at, control_no, wave_no, ship_via, skids, cartons, length_in, width_in, height_in, qty, volume_in3')
        .eq('control_no', controlNo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dimension details:', error);
        // Fallback to just showing the single record
        setSelectedDimension(record);
        setDimensionDetails([record]);
      } else {
        setSelectedDimension(record);
        setDimensionDetails(data || []);
      }
    } catch (error) {
      console.error('Error fetching dimension details:', error);
      // Fallback to just showing the single record
      setSelectedDimension(record);
      setDimensionDetails([record]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
        alert("You must be logged in to submit data.");
        return;
    }

    // Final check on submit
    const isDuplicate = await checkDuplicateControlNumber(controlNumber);
    if (isDuplicate) {
        toast({
            title: 'Duplicate Entry',
            description: 'An entry with this Control # already exists. Please use a unique Control #.',
            variant: 'destructive',
        });
        return;
    }

    const data = {
      ship_via: shipVia,
      control_number: controlNumber,
      wave_number: waveNumber,
      skids: skids.filter(s => s.length && s.width && s.height),
      cartons: cartons.filter(c => c.length && c.width && c.height),
    };

    // Require at least one dimension row (skid or carton)
    if ((data.skids?.length || 0) + (data.cartons?.length || 0) === 0) {
      toast({
        title: 'No Dimensions Entered',
        description: 'Please add at least one skid or carton with L × W × H before saving.',
        variant: 'destructive',
      })
      return
    }
    setConfirmData(data);
    setShowConfirm(true);
  };
  
  const handleConfirmSubmit = async () => {
      if (!confirmData) return;
      setIsLoading(true);
      setShowConfirm(false);

      let newRecord
      try {
        newRecord = await Dimension.create({
          ...confirmData,
          user_role: user.role,
          user_department: user.department,
        })
      } catch (err) {
        console.error('Failed to create dimensions:', err)
        toast({
          title: 'Save Failed',
          description: (err && err.message) ? String(err.message) : 'Could not save dimensions. Please try again.',
          variant: 'destructive',
        })
        setIsLoading(false)
        return
      }

      setShipVia('');
      setControlNumber('');
      setWaveNumber('');
      setSkids([{ length: '', width: '', height: '' }]);
      setCartons([{ length: '', width: '', height: '' }]);
      setConfirmData(null);
      await fetchRecords();
      
      toast({
          title: 'Entry Saved',
          description: 'Your dimensions entry has been submitted.',
          duration: 10000,
          action: (
              <ToastAction
                  altText="Undo"
                  onClick={async () => {
                      try {
                        if (newRecord && newRecord.id) {
                          await Dimension.delete(newRecord.id);
                        }
                        await fetchRecords();
                        toast({ description: 'Entry successfully removed.' });
                      } catch (e) {
                        console.error('Failed to undo dimension entry:', e)
                        toast({ description: 'Failed to undo. Please try again.', variant: 'destructive' })
                      }
                  }}
              >
                  Undo
              </ToastAction>
          ),
      });

      setIsLoading(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 overflow-x-hidden">
        <Card className="lg:col-span-2 border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package2 className="h-5 w-5 text-blue-600" />
              </div>
              Enter Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="shipVia" className="text-slate-700 font-medium">Ship Via *</Label>
                <Input id="shipVia" value={shipVia} onChange={(e) => setShipVia(e.target.value.toUpperCase())} required placeholder="" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 uppercase w-full" style={{ textTransform: 'uppercase' }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="controlNumber" className="text-slate-700 font-medium">Control # *</Label>
                  <Input 
                    id="controlNumber" 
                    value={controlNumber} 
                    onChange={(e) => { 
                      const val = e.target.value.toUpperCase(); 
                      if (val.length <= 6) setControlNumber(val); 
                    }} 
                    required 
                    placeholder="" 
                    className={`mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full ${controlNumberError ? 'border-red-500 focus:ring-red-500' : ''}`} 
                  />
                  {controlNumberError && <p className="text-sm text-red-600 mt-1">{controlNumberError}</p>}
                </div>
                <div>
                  <Label htmlFor="waveNumber" className="text-slate-700 font-medium">Wave # *</Label>
                  <Input id="waveNumber" type="text" value={waveNumber} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val.length <= 4) setWaveNumber(val); }} required placeholder="" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full" />
                </div>
              </div>
              
              <DimensionRowInput items={skids} setItems={setSkids} type="skid" />
              <DimensionRowInput items={cartons} setItems={setCartons} type="carton" />
              
              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                {isLoading ? 'Saving...' : 'Save Dimensions'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border-slate-200 shadow-lg rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
            <CardTitle className="text-slate-800">Recent Entries</CardTitle>
            <CardDescription className="text-slate-600">Click on a row to view detailed dimensions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600 font-medium w-32">Date & Time</TableHead>
                  <TableHead className="text-slate-600 font-medium w-20">User</TableHead>
                  <TableHead className="text-slate-600 font-medium w-20">Control #</TableHead>
                  <TableHead className="text-slate-600 font-medium w-20">Wave #</TableHead>
                  <TableHead className="text-slate-600 font-medium w-20">Ship Via</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-16">Skids</TableHead>
                  <TableHead className="text-center text-slate-600 font-medium w-16">Cartons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                {!isLoading && records.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No records found.</TableCell></TableRow>}
                {records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((record, index) => (
                  <TableRow key={record.id || `record-${index}`} onClick={() => handleRowClick(record)} className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-100">
                    <TableCell className="text-sm text-slate-600">{formatInEST(record.created_date, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-sm text-slate-700 font-medium">{record.created_by?.split('@')[0] || 'Unknown'}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{record.control_number}</TableCell>
                    <TableCell className="font-medium text-slate-800">{record.wave_number || '-'}</TableCell>
                    <TableCell className="text-slate-700">{record.ship_via || '-'}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.skids || 0}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.cartons || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination */}
            {!isLoading && records.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <div className="text-xs text-slate-600">
                  Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, records.length)} of {records.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <span className="text-xs text-slate-600">Page {currentPage} of {Math.ceil(records.length / PAGE_SIZE)}</span>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= Math.ceil(records.length / PAGE_SIZE)} onClick={() => setCurrentPage(p => Math.min(Math.ceil(records.length / PAGE_SIZE), p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Confirm Submission</DialogTitle>
                <DialogDescription>Please review the details before submitting.</DialogDescription>
            </DialogHeader>
            {confirmData && (
                <div className="space-y-2 py-4 text-sm">
                    <div className="flex justify-between"><span>Ship Via:</span><span>{confirmData.ship_via}</span></div>
                    <div className="flex justify-between"><span>Control #:</span><span>{confirmData.control_number}</span></div>
                    <div className="flex justify-between"><span>Wave #:</span><span>{confirmData.wave_number}</span></div>
                    <div className="flex justify-between"><span>Skids count:</span><span>{confirmData.skids.length}</span></div>
                    <div className="flex justify-between"><span>Cartons count:</span><span>{confirmData.cartons.length}</span></div>
                </div>
            )}
            <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedDimension} onOpenChange={(open) => { if (!open) { setSelectedDimension(null); setDimensionDetails(null); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Dimension Details</DialogTitle>
            <DialogDescription className="text-slate-600">
              Control #: <span className="font-semibold text-slate-900">{selectedDimension?.control_number}</span> | 
              Wave #: <span className="font-semibold text-slate-900">{selectedDimension?.wave_number}</span> | 
              Ship Via: <span className="font-semibold text-slate-900">{selectedDimension?.ship_via || '-'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {dimensionDetails && dimensionDetails.length > 0 && (
              <>
                {(() => {
                  const totalSkids = Number(selectedDimension?.skids ?? 0);
                  const totalCartons = Number(selectedDimension?.cartons ?? 0);
                  const skidsList = dimensionDetails.slice(0, totalSkids);
                  const cartonsList = dimensionDetails.slice(totalSkids, totalSkids + totalCartons);
                  return (
                    <>
                      {/* Skids Section */}
                      <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 text-slate-800">
                          <Package2 className="h-4 w-4 text-blue-600" /> 
                          Skids ({skidsList.length})
                        </h3>
                        <div className="space-y-3">
                          {skidsList.map((dimension, index) => (
                            <div key={dimension.id || `skid-${index}`} className="flex items-center justify-between text-sm p-4 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="text-slate-700 font-medium">Skid {index + 1}</span>
                              <span className="font-mono bg-white px-3 py-1 rounded-md border text-slate-800">
                                {dimension.length_in || 0} × {dimension.width_in || 0} × {dimension.height_in || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cartons Section */}
                      <div className="space-y-3 mt-6">
                        <h3 className="font-semibold flex items-center gap-2 text-slate-800">
                          <Package className="h-4 w-4 text-teal-600" /> 
                          Cartons ({cartonsList.length})
                        </h3>
                        <div className="space-y-3">
                          {cartonsList.map((dimension, index) => (
                            <div key={dimension.id || `carton-${index}`} className="flex items-center justify-between text-sm p-4 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="text-slate-700 font-medium">Carton {index + 1}</span>
                              <span className="font-mono bg-white px-3 py-1 rounded-md border text-slate-800">
                                {dimension.length_in || 0} × {dimension.width_in || 0} × {dimension.height_in || 0}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
