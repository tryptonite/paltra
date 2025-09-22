
import React, { useState, useEffect } from 'react';
import { BTX } from '@/api/entities';
import { User } from '@/api/entities';
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
import { SendEmail } from "@/api/integrations"; // Added import

const formatInEST = (dateString, options = {}) => {
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
  const [user, setUser] = useState(null);
  const [shipmentType, setShipmentType] = useState('');
  const [controlNumber, setControlNumber] = useState('');
  const [controlNumberError, setControlNumberError] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('NCS');
  const [pallets, setPallets] = useState([{ length: '', width: '', height: '' }]);
  const [cartons, setCartons] = useState([{ length: '', width: '', height: '' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBTX, setSelectedBTX] = useState(null);
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
    const existing = await BTX.filter({ control_number: number });
    if (existing.length > 0) {
        setControlNumberError('An entry with this Control # already exists.');
        return true;
    }
    setControlNumberError('');
    return false;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        const data = await BTX.list('-created_date');
        setRecords(data);
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
    const data = await BTX.list('-created_date');
    setRecords(data);
  };

  const resetForm = () => {
    setShipmentType('');
    setControlNumber('');
    setControlNumberError(''); // Reset error state on form reset
    setWaveNumber('');
    setTrackingNumber('NCS');
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

    const data = {
      shipment_type: shipmentType,
      control_number: controlNumber,
      wave_number: waveNumber,
      tracking_number: trackingNumber,
      pallets: pallets.filter(p => p.length && p.width && p.height),
      cartons: cartons.filter(c => c.length && c.width && c.height),
    };
    setConfirmData(data);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if(!confirmData) return;
    setIsLoading(true);
    setShowConfirm(false);

    const newRecord = await BTX.create({
      ...confirmData,
      user_role: user.role,
      user_department: user.department
    });

    // Send email notification
/*
   try {
      const emailBody = `
<p>A new BTX entry has been submitted:</p>

<p>Shipment Type: ${confirmData.shipment_type}</p>
<p>Control Number: ${confirmData.control_number}</p>
<p>Wave Number: ${confirmData.wave_number}</p>
<p>Tracking Number: ${confirmData.tracking_number}</p>

<p>Pallets: ${confirmData.pallets.length}</p>
<p>${confirmData.pallets
  .map(
      (p, i) => `Pallet ${i + 1}: ${p.length} × ${p.width} × ${p.height}`
    )
    .join('<br>')}</p>

<p>Cartons: ${confirmData.cartons.length}</p>
<p>${confirmData.cartons
  .map(
      (c, i) => `Carton ${i + 1}: ${c.length} × ${c.width} × ${c.height}`
    )
    .join('<br>')}</p>

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
                    await BTX.delete(newRecord.id);
                    await fetchRecords();
                    toast({ description: 'Entry successfully removed.' });
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

  const handleSaveEdit = async (recordId, updatedData) => {
    setIsLoading(true);
    await BTX.update(recordId, {
      ...updatedData,
      last_edited_by: user.email,
      last_edited_date: new Date().toISOString(),
    });
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

              <div>
                <Label htmlFor="trackingNumber" className="text-slate-700 font-medium">Tracking Number <span className="text-slate-500 font-normal">(for Shipping only)</span></Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                  className="mt-2 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
                  placeholder="NCS..."
                />
              </div>

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
                  <TableHead className="w-28 text-slate-600 font-medium">Tracking #</TableHead>
                  <TableHead className="text-center w-16 text-slate-600 font-medium">Pallets</TableHead>
                  <TableHead className="text-center w-16 text-slate-600 font-medium">Cartons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan="8" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                {!isLoading && records.length === 0 && <TableRow><TableCell colSpan="8" className="text-center py-8 text-slate-500">No records found.</TableCell></TableRow>}
                {records.map(record => (
                  <TableRow key={record.id} onClick={() => setSelectedBTX(record)} className="hover:bg-slate-50 transition-colors border-slate-100 cursor-pointer">
                    <TableCell className="text-sm text-slate-600">{formatInEST(record.last_edited_date || record.created_date, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell className="text-sm text-slate-700 font-medium">{(record.last_edited_by || record.created_by).split('@')[0]}</TableCell>
                    <TableCell className="font-semibold text-blue-600">{record.shipment_type}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{record.control_number}</TableCell>
                    <TableCell className="text-slate-700">{record.wave_number}</TableCell>
                    <TableCell className="text-slate-700 font-mono text-sm">{record.tracking_number}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.pallets?.length || 0}</TableCell>
                    <TableCell className="text-center text-slate-700">{record.cartons?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <div className="flex justify-between"><span>Tracking #:</span><span>{confirmData.tracking_number}</span></div>
                    <div className="flex justify-between"><span>Pallets count:</span><span>{confirmData.pallets.length}</span></div>
                    <div className="flex justify-between"><span>Cartons count:</span><span>{confirmData.cartons.length}</span></div>
                </div>
            )}
            <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBTX} onOpenChange={() => setSelectedBTX(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>BTX Shipment Details</DialogTitle>
            <DialogDescription>
              Type: <span className="font-semibold text-gray-900">{selectedBTX?.shipment_type}</span> |
              Control #: <span className="font-semibold text-gray-900">{selectedBTX?.control_number}</span> |
              Wave #: <span className="font-semibold text-gray-900">{selectedBTX?.wave_number}</span> |
              Tracking #: <span className="font-semibold text-gray-900">{selectedBTX?.tracking_number}</span>
            </DialogDescription>
            <div className="text-sm text-gray-600 mt-2 space-y-1">
              <div>Created: {selectedBTX && formatInEST(selectedBTX.created_date, { dateStyle: 'short', timeStyle: 'medium' })} by {selectedBTX?.created_by.split('@')[0]}</div>
              {selectedBTX?.last_edited_by && (
                <div>Last edited: {selectedBTX && formatInEST(selectedBTX.last_edited_date, { dateStyle: 'short', timeStyle: 'medium' })} by {selectedBTX?.last_edited_by.split('@')[0]}</div>
              )}
            </div>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedBTX?.pallets?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><Package2 className="h-4 w-4" /> Pallets ({selectedBTX.pallets.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                  {selectedBTX.pallets.map((pallet, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                      <span>Pallet {index + 1}</span>
                      <span className="font-mono bg-gray-200 px-2 py-1 rounded">{pallet.length} x {pallet.width} x {pallet.height}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedBTX?.cartons?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Cartons ({selectedBTX.cartons.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                  {selectedBTX.cartons.map((carton, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 rounded-md bg-gray-50">
                      <span>Carton {index + 1}</span>
                      <span className="font-mono bg-gray-200 px-2 py-1 rounded">{carton.length} x {carton.width} x {carton.height}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedBTX(null)}>Close</Button>
            <Button onClick={() => handleEdit(selectedBTX)} className="bg-blue-600 hover:bg-blue-700">
              <Pencil className="h-4 w-4 mr-2" />
              Add Tracking
            </Button>
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
