
import React, { useState, useEffect } from 'react';
import { Changeover } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowRight, ArrowRightLeft, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import moment from 'moment';
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

const DEPARTMENTS = ['WM-95', 'AVD', 'P&S'];
const CARRIERS = ['AAA', 'ABF', 'AVR', 'CEN', 'ESTES', 'FEF', 'OLD', 'R&L', 'SAIA', 'SEF', 'T-FORCE', 'WARD', 'XPO'];
const ITEMS_PER_PAGE = 5;

const formatInEST = (dateString, options = {}) => {
    const date = moment.utc(dateString).utcOffset(-4);
    if (options.dateStyle === 'short' && options.timeStyle === 'short') {
        return date.format('M/D/YY, h:mm A');
    }
    return date.format('M/D/YY, h:mm A');
};

export default function ChangeoversPage() {
    const [records, setRecords] = useState([]);
    const [user, setUser] = useState(null);
    const [department, setDepartment] = useState('');
    const [originalShipVia, setOriginalShipVia] = useState('');
    const [newShipVia, setNewShipVia] = useState('');
    const [controlNumber, setControlNumber] = useState('');
    const [waveNumber, setWaveNumber] = useState('');
    const [pallets, setPallets] = useState('');
    const [cartons, setCartons] = useState('');
    const [soNumber, setSoNumber] = useState('');
    const [deliveryNumber, setDeliveryNumber] = useState('');
    const [reasonForChange, setReasonForChange] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState(null);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const { toast } = useToast();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
            const data = await Changeover.list('-created_date');
            setRecords(data);
        } catch (e) {
            console.error("Failed to load data", e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const resetForm = () => {
        setDepartment('');
        setOriginalShipVia('');
        setNewShipVia('');
        setControlNumber('');
        setWaveNumber('');
        setPallets('');
        setCartons('');
        setSoNumber('');
        setDeliveryNumber('');
        setReasonForChange('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user || !department || !originalShipVia || !newShipVia || !controlNumber) {
            alert("Please fill all required fields.");
            return;
        }

        // Validate AVD-specific fields
        if (department === 'AVD' && (!soNumber || !deliveryNumber || !reasonForChange)) {
            alert("Please fill SO #, Delivery #, and Reason for Change for AVD department.");
            return;
        }

        const data = {
            department,
            original_ship_via: originalShipVia,
            new_ship_via: newShipVia,
            control_number: controlNumber,
            wave_number: waveNumber,
            pallets: Number(pallets) || 0,
            cartons: Number(cartons) || 0,
            so_number: department === 'AVD' ? soNumber : '',
            delivery_number: department === 'AVD' ? deliveryNumber : '',
            reason_for_change: department === 'AVD' ? reasonForChange : '',
        };
        setConfirmData(data);
        setShowConfirm(true);
    };

    const handleConfirmSubmit = async () => {
        if (!confirmData) return;
        setIsLoading(true);
        setShowConfirm(false);

        const newRecord = await Changeover.create({
            ...confirmData,
            user_role: user.role,
            user_department: user.department,
        });

        resetForm();
        setConfirmData(null);
        await loadData();
        setIsLoading(false);

        toast({
            title: 'Entry Saved',
            description: 'Your changeover entry has been submitted.',
            duration: 10000,
            action: (
                <ToastAction
                    alt="Undo"
                    onClick={async () => {
                        await Changeover.delete(newRecord.id);
                        await loadData();
                        toast({ description: 'Entry successfully removed.' });
                    }}
                >
                    Undo
                </ToastAction>
            ),
        });
    };

    // Filter records by department
    const filteredRecords = departmentFilter === 'all' 
        ? records 
        : records.filter(record => record.department === departmentFilter);

    // Paginate filtered records
    const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
    const paginatedRecords = filteredRecords.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset to first page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [departmentFilter]);

    return (
        <div className="space-y-6 sm:space-y-8">
            <Card className="border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
                    <CardTitle className="flex items-center gap-3 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                        </div>
                        Record a Changeover
                    </CardTitle>
                    <CardDescription>Enter the details for the changeover.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="department" className="text-slate-700 font-medium">Department *</Label>
                            <Select value={department} onValueChange={setDepartment} required>
                                <SelectTrigger className="mt-2 rounded-lg border-slate-300">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map(dept => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-700 font-medium">Ship Via Change *</Label>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <Input
                                    placeholder="Original Ship Via"
                                    value={originalShipVia}
                                    onChange={(e) => setOriginalShipVia(e.target.value.toUpperCase())}
                                    required
                                    className="mt-2 rounded-lg border-slate-300 uppercase"
                                />
                                <ArrowRight className="h-6 w-6 text-slate-400 flex-shrink-0" />
                                <Input
                                    placeholder="New Ship Via"
                                    value={newShipVia}
                                    onChange={(e) => setNewShipVia(e.target.value.toUpperCase())}
                                    required
                                    className="mt-2 rounded-lg border-slate-300 uppercase"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="controlNumber" className="text-slate-700 font-medium">Control # *</Label>
                                <Input id="controlNumber" value={controlNumber} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val.length <= 6) setControlNumber(val); }} required className="mt-2 rounded-lg border-slate-300 uppercase" />
                            </div>
                            <div>
                                <Label htmlFor="waveNumber" className="text-slate-700 font-medium">Wave #</Label>
                                <Input id="waveNumber" value={waveNumber} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val.length <= 4) setWaveNumber(val); }} className="mt-2 rounded-lg border-slate-300 uppercase" />
                            </div>
                        </div>

                        {department === 'AVD' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                <div>
                                    <Label htmlFor="soNumber" className="text-slate-700 font-medium">SO # *</Label>
                                    <Input 
                                        id="soNumber" 
                                        value={soNumber} 
                                        onChange={(e) => { 
                                            const val = e.target.value.toUpperCase(); 
                                            if (val.length <= 20) setSoNumber(val); 
                                        }} 
                                        required={department === 'AVD'}
                                        className="mt-2 rounded-lg border-slate-300 uppercase" 
                                        placeholder="Required for AVD"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="deliveryNumber" className="text-slate-700 font-medium">Delivery # *</Label>
                                    <Input 
                                        id="deliveryNumber" 
                                        value={deliveryNumber} 
                                        onChange={(e) => { 
                                            const val = e.target.value.toUpperCase(); 
                                            if (val.length <= 20) setDeliveryNumber(val); 
                                        }} 
                                        required={department === 'AVD'}
                                        className="mt-2 rounded-lg border-slate-300 uppercase" 
                                        placeholder="Required for AVD"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="pallets" className="text-slate-700 font-medium">Pallets</Label>
                                <Input id="pallets" type="number" min="0" step="1" value={pallets} onChange={(e) => setPallets(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300" />
                            </div>
                            <div>
                                <Label htmlFor="cartons" className="text-slate-700 font-medium">Cartons</Label>
                                <Input id="cartons" type="number" min="0" step="1" value={cartons} onChange={(e) => setCartons(e.target.value)} placeholder="0" className="mt-2 rounded-lg border-slate-300" />
                            </div>
                        </div>

                        {department === 'AVD' && (
                            <div>
                                <Label htmlFor="reasonForChange" className="text-slate-700 font-medium">Reason for Change *</Label>
                                <Textarea 
                                    id="reasonForChange" 
                                    value={reasonForChange} 
                                    onChange={(e) => { 
                                        if (e.target.value.length <= 500) setReasonForChange(e.target.value); 
                                    }} 
                                    required
                                    className="mt-2 rounded-lg border-slate-300 h-24" 
                                    placeholder="Explain the reason for this changeover..."
                                />
                                <div className="text-sm text-slate-500 mt-1">{reasonForChange.length}/500 characters</div>
                            </div>
                        )}

                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 px-8">
                            {isLoading ? 'Submitting...' : 'Submit Changeover'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                    <CardTitle className="text-slate-800">Recent Changeovers</CardTitle>
                    <CardDescription className="text-slate-600">Click on an AVD changeover row to view details including reason for change.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <Label htmlFor="departmentFilter" className="text-slate-700 font-medium">Filter by Department:</Label>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-48 rounded-lg border-slate-300">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {DEPARTMENTS.map(dept => (
                                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-200">
                                    <TableHead className="text-slate-600 font-medium">Date & Time</TableHead>
                                    <TableHead className="text-slate-600 font-medium">Department</TableHead>
                                    <TableHead className="text-slate-600 font-medium">User</TableHead>
                                    <TableHead className="text-slate-600 font-medium">Original Ship Via</TableHead>
                                    <TableHead className="text-slate-600 font-medium">New Ship Via</TableHead>
                                    <TableHead className="text-slate-600 font-medium">Control #</TableHead>
                                    <TableHead className="text-slate-600 font-medium">Wave #</TableHead>
                                    <TableHead className="text-center text-slate-600 font-medium">Pallets</TableHead>
                                    <TableHead className="text-center text-slate-600 font-medium">Cartons</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && <TableRow><TableCell colSpan="9" className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>}
                                {!isLoading && paginatedRecords.length === 0 && <TableRow><TableCell colSpan="9" className="text-center py-8 text-slate-500">No changeovers recorded.</TableCell></TableRow>}
                                {paginatedRecords.map(record => (
                                    <TableRow 
                                        key={record.id} 
                                        onClick={() => record.department === 'AVD' ? setSelectedRecord(record) : null}
                                        className={`hover:bg-slate-50 transition-colors border-slate-100 ${record.department === 'AVD' ? 'cursor-pointer' : ''}`}
                                    >
                                        <TableCell className="text-sm text-slate-600">{formatInEST(record.created_date, { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                                        <TableCell className={`text-sm font-semibold ${
                                            record.department === 'WM-95' ? 'text-blue-600' :
                                            record.department === 'AVD' ? 'text-amber-600' :
                                            record.department === 'P&S' ? 'text-green-600' : 'text-slate-600'
                                        }`}>
                                            {record.department}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-700 font-medium">{record.created_by.split('@')[0]}</TableCell>
                                        <TableCell className="text-slate-700 line-through">{record.original_ship_via}</TableCell>
                                        <TableCell className="font-semibold text-green-600">{record.new_ship_via}</TableCell>
                                        <TableCell className="font-semibold text-slate-800">{record.control_number}</TableCell>
                                        <TableCell className="text-slate-700">{record.wave_number || 'N/A'}</TableCell>
                                        <TableCell className="text-center text-slate-700">{record.pallets}</TableCell>
                                        <TableCell className="text-center text-slate-700">{record.cartons}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <span className="text-sm text-slate-600">
                                Page {currentPage} of {totalPages} ({filteredRecords.length} total)
                            </span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                                disabled={currentPage === totalPages}
                            >
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Changeover</DialogTitle>
                        <DialogDescription>Please review the details before submitting.</DialogDescription>
                    </DialogHeader>
                    {confirmData && (
                        <div className="space-y-2 py-4 text-sm">
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Department:</span><span className="text-slate-800 text-right">{confirmData.department}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Original Ship Via:</span><span className="text-slate-800 text-right">{confirmData.original_ship_via}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-slate-600">New Ship Via:</span><span className="text-slate-800 text-right">{confirmData.new_ship_via}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Control #:</span><span className="text-slate-800 text-right">{confirmData.control_number}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Wave #:</span><span className="text-slate-800 text-right">{confirmData.wave_number || 'N/A'}</span></div>
                            {confirmData.department === 'AVD' && (
                                <>
                                    <div className="flex justify-between"><span className="font-medium text-slate-600">SO #:</span><span className="text-slate-800 text-right">{confirmData.so_number}</span></div>
                                    <div className="flex justify-between"><span className="font-medium text-slate-600">Delivery #:</span><span className="text-slate-800 text-right">{confirmData.delivery_number}</span></div>
                                </>
                            )}
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Pallets:</span><span className="text-slate-800 text-right">{confirmData.pallets}</span></div>
                            <div className="flex justify-between"><span className="font-medium text-slate-600">Cartons:</span><span className="text-slate-800 text-right">{confirmData.cartons}</span></div>
                            {confirmData.reason_for_change && (
                                <div className="pt-2 border-t">
                                    <span className="font-medium text-slate-600">Reason for Change:</span>
                                    <p className="text-slate-800 text-sm mt-1 p-2 bg-slate-50 rounded">{confirmData.reason_for_change}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="sm:justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button type="button" onClick={handleConfirmSubmit}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>AVD Changeover Details</DialogTitle>
                        <DialogDescription>
                            Control #: <span className="font-semibold text-slate-800">{selectedRecord?.control_number}</span> | 
                            {selectedRecord?.original_ship_via} → {selectedRecord?.new_ship_via}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRecord && (
                        <div className="space-y-3 py-4 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600">Date & Time:</span>
                                <span className="text-slate-800 font-semibold">{formatInEST(selectedRecord.created_date, { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600">User:</span>
                                <span className="text-slate-800">{selectedRecord.created_by.split('@')[0]}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600">Wave #:</span>
                                <span className="text-slate-800">{selectedRecord.wave_number || 'N/A'}</span>
                            </div>
                            {selectedRecord.so_number && (
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-600">SO #:</span>
                                    <span className="text-slate-800">{selectedRecord.so_number}</span>
                                </div>
                            )}
                            {selectedRecord.delivery_number && (
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-600">Delivery #:</span>
                                    <span className="text-slate-800">{selectedRecord.delivery_number}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600">Pallets:</span>
                                <span className="text-slate-800">{selectedRecord.pallets}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-slate-600">Cartons:</span>
                                <span className="text-slate-800">{selectedRecord.cartons}</span>
                            </div>
                            {selectedRecord.reason_for_change && (
                                <div className="pt-2 border-t">
                                    <span className="font-medium text-slate-600 block mb-2">Reason for Change:</span>
                                    <div className="text-slate-800 text-sm p-3 bg-slate-50 rounded-lg border">
                                        {selectedRecord.reason_for_change}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedRecord(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
