
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/api/entities';
import { LiveLoad } from '@/api/entities';
import { Truckload } from '@/api/entities';
import { Dimension } from '@/api/entities';
import { BTX } from '@/api/entities';
import { CallIn } from '@/api/entities';
import { Changeover } from '@/api/entities';
import { LineCount } from '@/api/entities';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatCard from '../components/admindashboard/StatCard';
import { Truck, Package, Phone, Plane, ArrowRightLeft, Warehouse, LayoutDashboard, Download, CalendarIcon } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { startOfToday, subDays, isAfter, isBefore, format } from 'date-fns';
import moment from 'moment';
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const formatInEST = (dateString) => {
    // moment-timezone is not available. Using fixed offset for EDT (UTC-4).
    const date = moment.utc(dateString).utcOffset(-4);
    return date.format('M/D/YY, h:mm A');
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    // Handles date-only strings like 'YYYY-MM-DD' without timezone conversion issues.
    return moment.utc(dateString).format('M/D/YY');
};

const StatSkeleton = () => (
    <div className="animate-pulse">
        <div className="h-24 bg-slate-200 rounded-lg"></div>
    </div>
);

export default function AdminDashboardPage() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState<Record<string, {
        count: number;
        change: number;
        totalRecords: number;
        icon: React.ComponentType<any>; // Or a more specific icon type if available
        url: string;
    }>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);
    const [exportStartDate, setExportStartDate] = useState<Date | null>(null);
    const [exportEndDate, setExportEndDate] = useState<Date | null>(null);
    const { toast } = useToast();

    const endDateButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const fetchUserAndData = async () => {
            setIsLoading(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);

                if (currentUser?.role !== 'admin') {
                    setIsLoading(false);
                    return;
                }

                const todayStart = startOfToday();
                const yesterdayStart = subDays(todayStart, 1);
                
                const entitiesToFetch = [
                    { name: 'Live Loads', entity: LiveLoad, icon: Truck, url: createPageUrl('LiveLoads') },
                    { name: 'Truckloads', entity: Truckload, icon: Truck, url: createPageUrl('Truckloads') },
                    { name: 'Dimensions', entity: Dimension, icon: Package, url: createPageUrl('Dimensions') },
                    { name: 'BTX', entity: BTX, icon: Plane, url: createPageUrl('BTX') },
                    { name: 'Call-Ins', entity: CallIn, icon: Phone, url: createPageUrl('Call-Ins') },
                    { name: 'Changeovers', entity: Changeover, icon: ArrowRightLeft, url: createPageUrl('Changeovers') },
                ];

                const promises = entitiesToFetch.map(async ({ name, entity, icon, url }) => {
                    const records = await entity.list('-created_date', 100);
                    const todayCount: number = records.filter(r => isAfter(new Date(r.created_date), todayStart)).length;
                    const yesterdayCount: number = records.filter(r => 
                        isAfter(new Date(r.created_date), yesterdayStart) && 
                        !isAfter(new Date(r.created_date), todayStart)
                    ).length;
                    
                    // Calculate percentage change
                    let change: number = 0;
                    if (yesterdayCount > 0) {
                        change = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
                    } else if (todayCount > 0) {
                        change = 100; // If yesterday was 0 and today > 0, it's 100% increase
                    }

                    return { 
                        name, 
                        count: todayCount, 
                        change,
                        icon, 
                        url, 
                        recent: records.slice(0, 5),
                        totalRecords: records.length
                    };
                });

                const results = await Promise.all(promises);
                const statsData = {};
                let allRecentActivity = [];

                results.forEach(result => {
                    statsData[result.name] = { 
                        count: result.count, 
                        change: result.change,
                        totalRecords: result.totalRecords,
                        icon: result.icon, 
                        url: result.url 
                    };
                    allRecentActivity.push(...result.recent.map(r => ({ 
                        ...r, 
                        type: result.name, 
                        url: result.url 
                    })));
                });
                
                allRecentActivity.sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
                
                setStats(statsData);
                setRecentActivity(allRecentActivity.slice(0, 10));

            } catch (error) {
                console.error("Failed to load admin data", error);
            }
            setIsLoading(false);
        };

        fetchUserAndData();
    }, []);

    const exportToCSV = async () => {
        try {
            setIsLoading(true);
            toast({ title: 'Exporting Data...', description: 'Please wait while we gather all records for the export.' });

            let csvContent = '\uFEFF'; // UTF-8 BOM

            // Add date range info to header
            if (exportStartDate || exportEndDate) {
                const startDateStr = exportStartDate ? format(exportStartDate, 'MM/dd/yyyy') : 'Beginning';
                const endDateStr = exportEndDate ? format(exportEndDate, 'MM/dd/yyyy') : 'End';
                csvContent += `EXPORT DATE RANGE: ${startDateStr} to ${endDateStr}\n\n`;
            }

            const fetchDataAndAppendToCsv = async (tableName: string, csvHeaders: string, dataMapper: (data: any) => string, dateColumn: 'created_at' | 'submitted_at' = 'created_at') => {
                let query = supabase.from(tableName).select('*');
                if (exportStartDate) query = query.gte(dateColumn, exportStartDate.toISOString());
                if (exportEndDate) {
                    const endOfDay = new Date(exportEndDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    query = query.lte(dateColumn, endOfDay.toISOString());
                }
                query = query.order(dateColumn, { ascending: true });

                const { data, error } = await query;
                if (error) {
                    console.error(`Error fetching ${tableName}:`, error);
                    csvContent += `\nERROR FETCHING ${tableName.toUpperCase()}: ${error.message}\n`;
                    return;
                }
                if (!data || data.length === 0) {
                    csvContent += `\n${tableName.toUpperCase()}\nNo data found for this period.\n\n`;
                    return;
                }

                csvContent += `\n${tableName.toUpperCase()}\n`;
                csvContent += `${csvHeaders}\n`;
                data.forEach(item => {
                    csvContent += `${dataMapper(item)}\n`;
                });
            };

            // Live Loads
            await fetchDataAndAppendToCsv('liveloads',
                'Date,User,Carrier,P&S Count,AVD Count,Raceway Pallets,Fitting Pallets,Cartons 95,Total Pallets,Total Cartons',
                (load) => [
                    formatInEST(load.submitted_at || load.created_at), // Prefer submitted_at, fallback to created_at
                    load.created_by ? load.created_by.split('@')[0] : '',
                    load.carrier || '',
                    load.ps_count || 0,
                    load.avd_count || 0,
                    load.raceway_pallets || 0,
                    load.fitting_pallets || 0,
                    load.cartons_95 || 0,
                    load.total_pallets || 0,
                    load.total_cartons || 0
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
                'submitted_at' // Use submitted_at for filtering
            );

            // Call-Ins
            await fetchDataAndAppendToCsv('callins',
                'Date,User,Dock Door,Carrier,Trailer Number,Ready Time,Status',
                (call) => [
                    formatInEST(call.submitted_at || call.created_at), // Prefer submitted_at, fallback to created_at
                    call.created_by ? call.created_by.split('@')[0] : '',
                    call.dock_door || '',
                    call.carrier || '',
                    call.trailer_number || '',
                    call.ready_time ? formatInEST(call.ready_time) : '',
                    call.status || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
                'submitted_at' // Use submitted_at for filtering
            );

            // Dimensions
            await fetchDataAndAppendToCsv('dimensions',
                'Date,User,Ship Via,Control Number,Wave Number,Skids Count,Cartons Count,Length (in),Width (in),Height (in),Qty,Volume (in3)',
                (dim) => [
                    formatInEST(dim.created_at),
                    dim.created_by ? dim.created_by.split('@')[0] : '',
                    dim.ship_via || '',
                    dim.control_number || '',
                    dim.wave_number || '',
                    dim.skids ? dim.skids.length : 0,
                    dim.cartons ? dim.cartons.length : 0,
                    dim.length_in || '',
                    dim.width_in || '',
                    dim.height_in || '',
                    dim.qty || '',
                    dim.volume_in3 || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
            );

            // Changeovers
            await fetchDataAndAppendToCsv('changeovers',
                'Date,User,Department,Original Ship Via,New Ship Via,Control Number,Wave Number,Pallets,Cartons,SO Number,Delivery Number,Reason',
                (change) => [
                    formatInEST(change.created_at),
                    change.created_by ? change.created_by.split('@')[0] : '',
                    change.department || '',
                    change.original_ship_via || '',
                    change.new_ship_via || '',
                    change.control_number || '',
                    change.wave_number || '',
                    change.pallets || 0,
                    change.cartons || 0,
                    change.so_number || '',
                    change.delivery_number || '',
                    change.reason_for_change || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
            );

            // BTX
            await fetchDataAndAppendToCsv('btx',
                'Date,User,Shipment Type,Control Number,Wave Number,Tracking Number,Pallets Count,Cartons Count,Length (in),Width (in),Height (in),Qty,Volume (in3),Submission ID',
                (item) => [
                    formatInEST(item.created_at),
                    item.user_display || (item.created_by ? item.created_by.split('@')[0] : ''),
                    item.type || '',
                    item.control_no || '',
                    item.wave_no || '',
                    item.tracking_number || '',
                    item.pallets ? item.pallets.length : 0,
                    item.cartons ? item.cartons.length : 0,
                    item.length_in || '',
                    item.width_in || '',
                    item.height_in || '',
                    item.qty || '',
                    item.volume_in3 || '',
                    item.submission_id || ''
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
            );

            // Truckloads
            await fetchDataAndAppendToCsv('truckloads',
                'Date,User,Pickup Date,Department,Ship Via,Control Numbers,Wave Number,PO Numbers,Company Name,Destination City,Destination State,Total Pieces,Weight,Completed',
                (truck) => [
                    formatInEST(truck.created_at),
                    truck.created_by ? truck.created_by.split('@')[0] : '',
                    truck.pickup_date ? formatDate(truck.pickup_date) : '',
                    truck.department || '',
                    truck.ship_via || '',
                    truck.control_numbers ? (Array.isArray(truck.control_numbers) ? truck.control_numbers.join('; ') : truck.control_numbers) : '',
                    truck.wave_number || '',
                    truck.po_numbers ? (Array.isArray(truck.po_numbers) ? truck.po_numbers.join('; ') : truck.po_numbers) : '',
                    truck.company_name || '',
                    truck.destination_city || '',
                    truck.destination_state || '',
                    truck.total_pieces || 0,
                    truck.weight || 0,
                    truck.completed ? 'Yes' : 'No'
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
            );

            // Line Counts
            await fetchDataAndAppendToCsv('line_counts',
                'Date of Count,Time Period,User,Preferreds,Parcels,LTL,Total',
                (count) => [
                    count.date ? formatDate(count.date) : '', // 'date' is the actual date of count, not submission date
                    count.time_period || '',
                    count.submitted_by ? count.submitted_by.split('@')[0] : '',
                    count.preferreds || 0,
                    count.parcels || 0,
                    count.ltl || 0,
                    count.total || 0
                ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
                'submitted_at' // Use submitted_at for filtering
            );

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            
            const dateRangeText = exportStartDate || exportEndDate 
                ? `_${exportStartDate ? format(exportStartDate, 'yyyy-MM-dd') : 'start'}_to_${exportEndDate ? format(exportEndDate, 'yyyy-MM-dd') : 'end'}`
                : '';
            
            link.setAttribute('download', `paltra_warehouse_report${dateRangeText}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: 'Export Complete',
                description: `Warehouse data${exportStartDate || exportEndDate ? ' for selected date range' : ''} has been exported to CSV successfully.`,
            });

        } catch (error) {
            console.error('Export failed:', error);
            toast({
                title: 'Export Failed',
                description: 'There was an error exporting the data. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {Array(6).fill(0).map((_, i) => <StatSkeleton key={i} />)}
                </div>
            </div>
        );
    }
    
    if (user?.role !== 'admin') {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                <p className="text-slate-600 mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                {/* @ts-ignore - Button as child of PopoverTrigger might not be fully typed */}
                                <Button 
                                    variant="outline" 
                                    className={`justify-start text-left font-normal w-full sm:w-[180px] ${!exportStartDate ? 'text-muted-foreground' : ''}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {exportStartDate ? format(exportStartDate, 'MMM d, yyyy') : 'Start date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                {/* @ts-ignore - Calendar component props might not be fully typed */}
                                <Calendar
                                    mode="single"
                                    selected={exportStartDate}
                                    onSelect={(date) => {
                                        setExportStartDate(date);
                                        // Automatically focus the end date button after a start date is selected
                                        setTimeout(() => endDateButtonRef.current?.click(), 0);
                                    }}
                                    initialFocus
                                    disabled={(date) => isAfter(date, new Date())}
                                />
                            </PopoverContent>
                        </Popover>
                        
                        <span className="text-slate-500 sm:self-center">to</span>
                        
                        <Popover>
                            {/* @ts-ignore - PopoverTrigger ref prop might not be fully typed */}
                            <PopoverTrigger asChild ref={endDateButtonRef}>
                                {/* @ts-ignore - Button as child of PopoverTrigger might not be fully typed */}
                                <Button 
                                    variant="outline" 
                                    className={`justify-start text-left font-normal w-full sm:w-[180px] ${!exportEndDate ? 'text-muted-foreground' : ''}`}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {exportEndDate ? format(exportEndDate, 'MMM d, yyyy') : 'End date'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                {/* @ts-ignore - Calendar component props might not be fully typed */}
                                <Calendar
                                    mode="single"
                                    selected={exportEndDate}
                                    onSelect={setExportEndDate}
                                    initialFocus
                                    disabled={(date) => isAfter(date, new Date()) || (exportStartDate && isBefore(date, exportStartDate))}
                                />
                            </PopoverContent>
                        </Popover>
                        
                        {(exportStartDate || exportEndDate) && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                    setExportStartDate(null);
                                    setExportEndDate(null);
                                }}
                                className="text-slate-500 hover:text-slate-700 w-full sm:w-auto"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                    
                    <Button 
                        onClick={exportToCSV}
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                        disabled={isLoading}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export {exportStartDate || exportEndDate ? 'Filtered ' : 'All '}Data
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Object.entries(stats).map(([name, data]) => (
                    <StatCard 
                        key={name} 
                        title={name} 
                        value={data.count} 
                        change={data.change}
                        totalRecords={data.totalRecords}
                        icon={data.icon} 
                        linkTo={data.url} 
                    />
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>A log of the most recent entries across all sections.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ul className="space-y-3">
                        {recentActivity.map(item => (
                            <li key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-200 rounded-full">
                                      {stats[item.type] && React.createElement(stats[item.type].icon, { className: 'h-4 w-4 text-slate-600' })}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">
                                            New <span className="font-bold">{item.type.slice(0, -1)}</span> entry by <span className="font-bold">{item.created_by.split('@')[0]}</span>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatInEST(item.created_date)}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
