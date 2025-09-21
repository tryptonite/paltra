
import React, { useState, useEffect, useRef } from 'react';
import { LineCount } from '@/api/entities';
import { User } from '@/api/entities';
import { getLineCounts } from '@/api/vLineCounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CalendarIcon, BarChart3, TrendingUp, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import moment from 'moment';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatInEST = (dateString) => {
    if (!dateString) return '';
    return moment.utc(dateString).utcOffset(-4).format('M/D/YY, h:mm A');
};

const getAverageData = (records) => {
    const dateGroups = {};

    records.forEach(record => {
        const recordDate = record.count_date || record.date;
        if (!dateGroups[recordDate]) {
            dateGroups[recordDate] = [];
        }
        dateGroups[recordDate].push(record.total);
    });

    const chartData = Object.entries(dateGroups).map(([date, totals]) => {
        const averageTotal = totals.reduce((sum, current) => sum + current, 0) / totals.length;
        return {
            date: format(new Date(date + 'T00:00:00'), 'MMM d'),
            fullDate: format(new Date(date + 'T00:00:00'), 'MMM d, yyyy'),
            averageTotal: Math.round(averageTotal),
        };
    });

    return chartData.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
};

export default function LineCountsPage() {
    const [records, setRecords] = useState([]);
    const [user, setUser] = useState(null);
    const [date, setDate] = useState(new Date());
    const [timePeriod, setTimePeriod] = useState('');
    const [preferreds, setPreferreds] = useState('');
    const [parcels, setParcels] = useState('');
    const [ltl, setLtl] = useState('');
    const [total, setTotal] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState(null);

    // New state for Undo functionality
    const [lastSubmittedRecordId, setLastSubmittedRecordId] = useState(null);
    const [showUndoNotification, setShowUndoNotification] = useState(false);
    const undoTimerRef = useRef(null); // Ref to store the timer ID

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            // Fetch more records to ensure if one is deleted, there are still recent ones visible
            const data = await getLineCounts(30);
            setRecords(data);
        } catch (e) {
            console.error("Failed to load records", e);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                await fetchRecords();
            } catch (e) {
                console.error("Failed to load initial data", e);
            }
            setIsLoading(false);
        };
        loadInitialData();

        // Cleanup function for the timer if component unmounts
        return () => {
            if (undoTimerRef.current) {
                clearTimeout(undoTimerRef.current);
            }
        };
    }, []);

    const clearUndoNotification = () => {
        if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
            undoTimerRef.current = null;
        }
        setShowUndoNotification(false);
        setLastSubmittedRecordId(null);
    };

    const resetForm = () => {
        setDate(new Date());
        setTimePeriod('');
        setPreferreds('');
        setParcels('');
        setLtl('');
        setTotal('');
        // Clear any active undo notification when resetting form for a new submission
        clearUndoNotification();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user || !date || !timePeriod || preferreds === '' || parcels === '' || ltl === '' || total === '') {
            alert("Please fill all required fields.");
            return;
        }
        const data = {
            date: format(date, 'yyyy-MM-dd'),
            date_display: format(date, 'PPP'),
            time_period: timePeriod,
            preferreds: Number(preferreds),
            parcels: Number(parcels),
            ltl: Number(ltl),
            total: Number(total),
        };
        setConfirmData(data);
        setShowConfirm(true);
    };

    const handleConfirmSubmit = async () => {
        if (!confirmData) return;
        setIsLoading(true);
        setShowConfirm(false);
        clearUndoNotification(); // Clear any previous undo notification to prevent conflicts

        try {
            // Assuming LineCount.create returns the newly created record object which contains its 'id'.
            const newRecord = await LineCount.create({
                date: confirmData.date,
                time_period: confirmData.time_period,
                preferreds: confirmData.preferreds,
                parcels: confirmData.parcels,
                ltl: confirmData.ltl,
                total: confirmData.total,
                user_role: user.role,
                user_department: user.department,
            });

            resetForm();
            setConfirmData(null);
            await fetchRecords();

            // Set up undo notification
            setLastSubmittedRecordId(newRecord.id);
            setShowUndoNotification(true);
            undoTimerRef.current = setTimeout(() => {
                clearUndoNotification();
            }, 10000); // Show for 10 seconds

        } catch (error) {
            console.error("Error submitting line count:", error);
            alert("Failed to save line count. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = async () => {
        if (!lastSubmittedRecordId) return;

        setIsLoading(true);
        clearUndoNotification(); // Immediately hide the notification

        try {
            // This assumes a LineCount.delete(id) method exists in your entity.
            await LineCount.delete(lastSubmittedRecordId);
            setLastSubmittedRecordId(null);
            await fetchRecords(); // Re-fetch records to update the list
            // Optionally, provide more subtle user feedback like a toast notification
        } catch (error) {
            console.error("Error undoing line count:", error);
            alert("Failed to undo submission. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const chartData = getAverageData(records);

    return (
        <div className="space-y-6 sm:space-y-8">
            {showUndoNotification && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-3 rounded-lg shadow-xl flex items-center justify-between z-50 animate-fade-in-up">
                    <span className="mr-4">Submission successful.</span>
                    <Button
                        onClick={handleUndo}
                        variant="outline"
                        className="bg-white text-blue-600 hover:bg-blue-50/90 hover:text-blue-700 px-4 py-2 rounded-md transition-colors duration-200"
                        disabled={isLoading}
                    >
                        <Undo2 className="h-4 w-4 mr-2" /> Undo
                    </Button>
                </div>
            )}

            <Card className="border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
                    <CardTitle className="flex items-center gap-3 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        New Line Count
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="date" className="text-slate-700 font-medium">Date *</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full mt-2 justify-start text-left font-normal rounded-lg border-slate-300">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, 'PPP') : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label htmlFor="timePeriod" className="text-slate-700 font-medium">Time Period *</Label>
                                <Select value={timePeriod} onValueChange={setTimePeriod} required>
                                    <SelectTrigger className="mt-2 rounded-lg border-slate-300">
                                        <SelectValue placeholder="Select time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2:00 PM">2PM</SelectItem>
                                        <SelectItem value="5:00 PM">5PM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Label htmlFor="preferreds" className="text-slate-700 font-medium">Preferreds *</Label>
                                <Input id="preferreds" type="number" min="0" step="1" value={preferreds} onChange={(e) => setPreferreds(e.target.value)} required className="mt-2 rounded-lg border-slate-300" />
                            </div>
                            <div>
                                <Label htmlFor="parcels" className="text-slate-700 font-medium">Parcels *</Label>
                                <Input id="parcels" type="number" min="0" step="1" value={parcels} onChange={(e) => setParcels(e.target.value)} required className="mt-2 rounded-lg border-slate-300" />
                            </div>
                            <div>
                                <Label htmlFor="ltl" className="text-slate-700 font-medium">LTL *</Label>
                                <Input id="ltl" type="number" min="0" step="1" value={ltl} onChange={(e) => setLtl(e.target.value)} required className="mt-2 rounded-lg border-slate-300" />
                            </div>
                            <div>
                                <Label htmlFor="total" className="text-slate-700 font-bold">Total *</Label>
                                <Input id="total" type="number" min="0" step="1" value={total} onChange={(e) => setTotal(e.target.value)} required className="mt-2 rounded-lg border-slate-300 font-bold" />
                            </div>
                        </div>

                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-teal-600 text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 px-8">
                            {isLoading ? 'Saving...' : 'Save Line Count'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                    <CardTitle className="text-slate-800">Recent Entries</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time Period</TableHead>
                                    <TableHead>Preferreds</TableHead>
                                    <TableHead>Parcels</TableHead>
                                    <TableHead>LTL</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Submitted By</TableHead>
                                    <TableHead>Submitted At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading && <TableRow><TableCell colSpan="8" className="text-center py-8">Loading...</TableCell></TableRow>}
                                {!isLoading && records.length === 0 && <TableRow><TableCell colSpan="8" className="text-center py-8">No records found.</TableCell></TableRow>}
                                {records.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{format(new Date((record.count_date || record.date) + 'T00:00:00'), 'PPP')}</TableCell>
                                        <TableCell>{record.time_period}</TableCell>
                                        <TableCell>{record.preferreds}</TableCell>
                                        <TableCell>{record.parcels}</TableCell>
                                        <TableCell>{record.ltl}</TableCell>
                                        <TableCell className="font-bold">{record.total}</TableCell>
                                        <TableCell>{record.user_display || record.created_by?.split('@')[0] || 'Unknown User'}</TableCell>
                                        <TableCell>{formatInEST(record.submitted_at || record.created_date)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg rounded-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-t-2xl border-b border-slate-100">
                    <CardTitle className="flex items-center gap-3 text-slate-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        Daily Average Line Count
                    </CardTitle>
                    <CardDescription>Average of 2PM and 5PM totals for each day.</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={chartData}
                                margin={{
                                    top: 5, right: 20, left: -10, bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '0.75rem',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                                    }}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                />
                                <Legend wrapperStyle={{ fontSize: "14px" }} />
                                <Line
                                    type="monotone"
                                    dataKey="averageTotal"
                                    name="Average Total"
                                    stroke="#2563eb"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#2563eb' }}
                                    activeDot={{ r: 6, fill: '#1d4ed8' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-10 text-slate-500">
                            No data available to display the chart.
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Line Count</DialogTitle>
                        <DialogDescription>Please review the details before submitting.</DialogDescription>
                    </DialogHeader>
                    {confirmData && (
                        <div className="space-y-2 py-4 text-sm">
                            <div className="flex justify-between"><span>Date:</span><span>{confirmData.date_display}</span></div>
                            <div className="flex justify-between"><span>Time Period:</span><span>{confirmData.time_period}</span></div>
                            <div className="flex justify-between"><span>Preferreds:</span><span>{confirmData.preferreds}</span></div>
                            <div className="flex justify-between"><span>Parcels:</span><span>{confirmData.parcels}</span></div>
                            <div className="flex justify-between"><span>LTL:</span><span>{confirmData.ltl}</span></div>
                            <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>Total:</span><span>{confirmData.total}</span></div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                        <Button onClick={handleConfirmSubmit}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
