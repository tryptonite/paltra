
import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { createBtxSubmission, listBtxRecent, getBtxSubmission, deleteBtxSubmission } from '@/api/btx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plane, Package2, Package, Pencil } from 'lucide-react';
import DimensionRowInput from '../components/dimensions/DimensionRowInput';
import EditBTXDialog from '../components/btx/EditBTXDialog';
import moment from 'moment';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const formatInEST = (dateString: string, options: { dateStyle?: 'short'; timeStyle?: 'short' | 'medium' } = {}) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    const date = moment.utc(dateString).utcOffset(-4);

    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    } else if (options.dateStyle === 'short' && options.timeStyle === 'medium') {
        return date.format('M/D/YY, h:mm:ss A');
    } else {
        // Default format if options are not specifically matched
        return date.format('M/D/YY, h:mm A');
    }
};

const SHIPMENT_TYPES = ["BXA", "BXP", "BX2", "BX3"];

export default function BTXPage() {
  const [records, setRecords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [user, setUser] = useState(null);
  const [shipmentType, setShipmentType] = useState('');
  const [controlNumber, setControlNumber] = useState('');
  const [controlNumberError, setControlNumberError] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [pallets, setPallets] = useState([{ length: '', width: '', height: '' }]);
  const [cartons, setCartons] = useState([{ length: '', width: '', height: '' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBTX, setSelectedBTX] = useState(null);
  const [btxDetails, setBtxDetails] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const checkDuplicateControlNumber = async (number) => {
    if (!number) {
        setControlNumberError('');
        return false;
    }
    // For now, we'll skip duplicate checking as we need to implement it with Supabase
    // This can be added later with a proper query to the btx table
    setControlNumberError('');
    return false;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        const data = await listBtxRecent();
        setRecords(data || []);
      } catch(e) {
        console.error("Failed to load data", e);
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
    }, 500);

    return () => clearTimeout(debounceCheck);
  }, [controlNumber]);

  const fetchRecords = async () => {
    try {
      const data = await listBtxRecent();
      setRecords(data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to fetch records:", error);
    }
  };

  const resetForm = () => {
    setShipmentType('');
    setControlNumber('');
    setControlNumberError(''); // Reset error state on form reset
    setWaveNumber('');
    setPallets([{ length: '', width: '', height: '' }]);
    setCartons([{ length: '', width: '', height: '' }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !shipmentType || !controlNumber || !waveNumber) {
        alert("Please fill all required fields (Shipment Type, Control #, Wave #).");
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

    const filledPallets = pallets.filter(p => p.length && p.width && p.height);
    const filledCartons = cartons.filter(c => c.length && c.width && c.height);

    // Require at least one dimension row
    if (filledPallets.length + filledCartons.length === 0) {
      toast({
        title: 'No Dimensions Entered',
        description: 'Please add at least one pallet or carton with L × W × H before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const data = {
      shipment_type: shipmentType,
      control_number: controlNumber,
      wave_number: waveNumber,
      pallets: filledPallets.length,
      cartons: filledCartons.length,
    };
    setConfirmData(data);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if(!confirmData) return;
    setIsLoading(true);
    setShowConfirm(false);

    // Prepare lines for submission
    const lines = [
      ...pallets.filter(p => p.length && p.width && p.height).map(p => ({
        pallets: 1,
        cartons: 0,
        length_in: p.length,
        width_in: p.width,
        height_in: p.height,
        qty: 1
      })),
      ...cartons.filter(c => c.length && c.width && c.height).map(c => ({
        pallets: 0,
        cartons: 1,
        length_in: c.length,
        width_in: c.width,
        height_in: c.height,
        qty: 1
      }))
    ];

    if (lines.length === 0) {
      // Defensive check in case user confirmed after removing all rows
      toast({
        title: 'No Dimensions Entered',
        description: 'Please add at least one pallet or carton with L × W × H before submitting.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const result = await createBtxSubmission({
      type: confirmData.shipment_type,
      control_no: confirmData.control_number,
      wave_no: confirmData.wave_number
    }, lines);

    // Send email notification
/*
   try {
      const emailBody = `
<p>A new BTX entry has been submitted:</p>

<p>Shipment Type: ${confirmData.shipment_type}</p>
<p>Control Number: ${confirmData.control_number}</p>
<p>Wave Number: ${confirmData.wave_number}</p>
<p>Tracking Number: ${confirmData.tracking_number}</p>

<p>Pallets: ${confirmData.pallets}</p>
<p>Cartons: ${confirmData.cartons}</p>

<p>Submitted by: ${user.full_name || user.email}</p>

<p>Department: ${user.department}</p>
Date: ${new Date().toLocaleString()}
      `;

      await SendEmail({
        to: 'b.patel@zohomail.com', // Target email for notifications
        subject: `New BTX Entry - ${confirmData.shipment_type} (${confirmData.control_number})`,
        body: emailBody
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
*/
    const submissionId = result?.submission_id;

    resetForm();
    setConfirmData(null);
    await fetchRecords();

    toast({
      title: 'Entry Saved',
      description: 'Your BTX entry has been submitted.',
      duration: 10000,
      action: (
        <ToastAction
          alt="Undo"
          onClick={async () => {
            try {
              if (submissionId) {
                await deleteBtxSubmission(submissionId);
                await fetchRecords();
                toast({ description: 'Entry successfully removed.' });
              } else {
                toast({ description: 'Nothing to undo.', variant: 'destructive' });
              }
            } catch (e) {
              console.error('Failed to undo BTX submission:', e);
              toast({ description: 'Failed to undo. Please try again.', variant: 'destructive' });
            }
          }}
        >
          Undo
        </ToastAction>
      ),
    });

    setIsLoading(false);
  };

  const handleEdit = (record) => {
    setSelectedBTX(null); // Close details dialog
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleRowClick = async (record) => {
    try {
      setSelectedBTX(record);
      const details = await getBtxSubmission(record.submission_id);
      setBtxDetails(details || []);
    } catch (error) {
      console.error('Error fetching BTX details:', error);
      setSelectedBTX(record);
      setBtxDetails([]);
    }
  };

  const handleSaveEdit = async (recordId, updatedData) => {
    setIsLoading(true);
    // TODO: Implement update functionality with Supabase
    setIsEditDialogOpen(false);
    setEditingRecord(null);
    await fetchRecords();
    setIsLoading(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 overflow-x-hidden">
        <Card className="lg:col-span-2 border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
            <CardTitle className="flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plane className="h-5 w-5 text-blue-600" />
              </div>
              Enter BTX Shipment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                  <Label htmlFor="shipmentType" className="text-slate-700 font-medium">Shipment Type *</Label>
                  <Select value={shipmentType} onValueChange={setShipmentType} required>
                    <SelectTrigger id="shipmentType" className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_TYPES.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                    </SelectContent>
                  </Select>
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
                    className={`mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full ${controlNumberError ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {controlNumberError && <p className="text-sm text-red-600 mt-1">{controlNumberError}</p>}
                </div>
                <div>
                    <Label htmlFor="waveNumber" className="text-slate-700 font-medium">Wave # *</Label>
                    <Input
                        id="waveNumber"
                        type="text"
                        value={waveNumber}
                        onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        if (val.length <= 4) setWaveNumber(val);
                        }}
                        required
                        className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                    />
                </div>
              </div>

              <DimensionRowInput items={pallets} setItems={setPallets} type="pallet" />
              <DimensionRowInput items={cartons} setItems={setCartons} type="carton" />

              {/* Tracking Number removed per requirements */}

              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
                {isLoading ? 'Saving...' : 'Submit BTX Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-slate-200 shadow-lg rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
            <CardTitle className="text-slate-800">Recent Entries</CardTitle>
            <CardDescription className="text-slate-600">Click on a row for details.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="w-32 text-slate-600 font-medium">Date & Time</TableHead>
                  <TableHead className="w-20 text-slate-600 font-medium">User</TableHead>
                  <TableHead className="w-16 text-slate-600 font-medium">Type</TableHead>
                  <TableHead className="w-20 text-slate-600 font-medium">Control #</TableHead>
                  <TableHead className="w-16 text-slate-600 font-medium">Wave #</TableHead>
                  {/* Tracking # column removed */}
                  <TableHead className="text-center w-16 text-slate-600 font-medium">Pallets</TableHead>
                  <TableHead className="text-center w-16 text-slate-600 font-medium">Cartons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan="7" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                {!isLoading && records.length === 0 && <TableRow><TableCell colSpan="7" className="text-center py-8 text-slate-500">No records found.</TableCell></TableRow>}
                {records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(record => (
                  <TableRow key={record.submission_id} onClick={() => handleRowClick(record)} className="hover:bg-slate-50 transition-colors border-slate-100 cursor-pointer">
                    <TableCell className="text-sm text-slate-600">{formatInEST(record.created_at, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-sm text-slate-700 font-medium">{record.user_display?.split('@')[0] || 'Unknown'}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{record.type}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{record.control_no}</TableCell>
                    <TableCell className="text-slate-700">{record.wave_no}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.pallets || 0}</TableCell>
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
                    <div className="flex justify-between"><span>Shipment Type:</span><span>{confirmData.shipment_type}</span></div>
                    <div className="flex justify-between"><span>Control #:</span><span>{confirmData.control_number}</span></div>
                    <div className="flex justify-between"><span>Wave #:</span><span>{confirmData.wave_number}</span></div>
                    {/* Tracking # removed from confirmation */}
                    <div className="flex justify-between"><span>Pallets count:</span><span>{confirmData.pallets}</span></div>
                    <div className="flex justify-between"><span>Cartons count:</span><span>{confirmData.cartons}</span></div>
                </div>
            )}
            <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBTX} onOpenChange={() => { setSelectedBTX(null); setBtxDetails(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>BTX Shipment Details</DialogTitle>
            <DialogDescription>
              Type: <span className="font-semibold text-gray-900">{selectedBTX?.type}</span> |
              Control #: <span className="font-semibold text-gray-900">{selectedBTX?.control_no}</span> |
              Wave #: <span className="font-semibold text-gray-900">{selectedBTX?.wave_no}</span>
            </DialogDescription>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <div>Created: {selectedBTX && formatInEST(selectedBTX.created_at, { dateStyle: 'short', timeStyle: 'medium' })} by {selectedBTX?.user_display?.split('@')[0] || 'Unknown'}</div>
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {btxDetails && btxDetails.length > 0 && (
              <>
                {(() => {
                  const pallets = btxDetails.filter(item => item.pallets > 0);
                  const cartons = btxDetails.filter(item => item.cartons > 0);
                  
                  return (
                    <>
                      {pallets.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold flex items-center gap-2"><Package2 className="h-4 w-4" /> Pallets ({pallets.length})</h3>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                            {pallets.map((item, index) => (
                              <div key={item.id || `pallet-${index}`} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                                <span>Pallet {index + 1}</span>
                                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                  {item.length_in || 0} × {item.width_in || 0} × {item.height_in || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {cartons.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Cartons ({cartons.length})</h3>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                            {cartons.map((item, index) => (
                              <div key={item.id || `carton-${index}`} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                                <span>Carton {index + 1}</span>
                                <span className="font-mono bg-gray-200 px-2 py-1 rounded">
                                  {item.length_in || 0} × {item.width_in || 0} × {item.height_in || 0}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedBTX(null); setBtxDetails(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditBTXDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        record={editingRecord}
        onSave={handleSaveEdit}
      />
    </>
  );
}
