import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle, ClipboardList, Clock3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

type RequestStatus = 'open' | 'waiting' | 'completed';
type RequestPriority = 'normal' | 'urgent';
const departments = ['P&S', 'WM-95', 'AVD'] as const;
type Department = typeof departments[number];

type OrderRequest = {
  id: string;
  order_number: string;
  control_number: string | null;
  new_pro_tracking_number: string | null;
  department: Department | null;
  customer: string | null;
  request_type: string;
  request_details: string;
  requested_by: string | null;
  action_needed: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

const emptyForm = {
  order_number: '',
  control_number: '',
  new_pro_tracking_number: '',
  department: '' as Department | '',
  customer: '',
  request_type: 'special_request',
  request_details: '',
  requested_by: '',
  action_needed: '',
  priority: 'normal' as RequestPriority,
  notes: '',
};

const requestTypeLabels: Record<string, string> = {
  order_change: 'Order Change',
  special_request: 'Special Request',
  hold: 'Hold / Release',
  ship_via: 'Ship Via / Carrier',
  address: 'Address / Destination',
  quantity: 'Quantity',
  missed_ltl: 'Missed LTL',
  other: 'Other',
};

const statusLabels: Record<RequestStatus, string> = {
  open: 'Open',
  waiting: 'Waiting',
  completed: 'Completed',
};

const statusStyles: Record<RequestStatus, string> = {
  open: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  waiting: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  completed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
};

const formatEastern = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function OrderRequests() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as OrderRequest[]);
    } catch (error: any) {
      console.error('OrderRequests: failed to load requests', error);
      toast({
        title: 'Unable to load requests',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRequests();

    const channel = supabase
      .channel('order-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_requests' },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests]);

  const stats = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        if (item.status === 'open') acc.open += 1;
        if (item.status === 'waiting') acc.waiting += 1;
        if (item.status !== 'completed' && item.priority === 'urgent') acc.urgent += 1;
        return acc;
      },
      { open: 0, waiting: 0, urgent: 0 }
    );
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return requests.filter((item) => {
      const statusMatches = statusFilter === 'all' || item.status === statusFilter;
      if (!statusMatches) return false;
      if (!needle) return true;

      return [
        item.order_number,
        item.control_number,
        item.new_pro_tracking_number,
        item.department,
        item.customer,
        item.request_details,
        item.requested_by,
        item.action_needed,
        item.created_by_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [requests, search, statusFilter]);

  const displayName =
    profile?.full_name ||
    profile?.email ||
    user?.email ||
    'Paltra User';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user?.id) {
      toast({
        title: 'Not signed in',
        description: 'Please sign in again before creating a request.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.order_number.trim() || !departments.includes(form.department as Department) || !form.request_details.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Order #, department, and request details are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        order_number: form.order_number.trim(),
        control_number: form.control_number.trim() || null,
        new_pro_tracking_number: form.new_pro_tracking_number.trim() || null,
        department: form.department,
        customer: form.customer.trim() || null,
        request_type: form.request_type,
        request_details: form.request_details.trim(),
        requested_by: form.requested_by.trim() || null,
        action_needed: form.action_needed.trim() || null,
        priority: form.priority,
        status: 'open',
        notes: form.notes.trim() || null,
        created_by: user.id,
        created_by_name: displayName,
      };

      const { error } = await supabase.from('order_requests').insert(payload);
      if (error) throw error;

      setForm(emptyForm);
      toast({
        title: 'Request added',
        description: `${payload.order_number} is now being tracked.`,
      });
      await loadRequests();
    } catch (error: any) {
      console.error('OrderRequests: failed to create request', error);
      toast({
        title: 'Unable to add request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = async (item: OrderRequest, status: RequestStatus) => {
    if (!user?.id || item.status === status) return;

    setUpdatingId(item.id);
    try {
      const completing = status === 'completed';
      const updates = {
        status,
        completed_at: completing ? new Date().toISOString() : null,
        completed_by: completing ? user.id : null,
        completed_by_name: completing ? displayName : null,
      };

      const { error } = await supabase
        .from('order_requests')
        .update(updates)
        .eq('id', item.id);

      if (error) throw error;

      setRequests((current) =>
        current.map((request) =>
          request.id === item.id
            ? { ...request, ...updates, updated_at: new Date().toISOString() }
            : request
        )
      );

      toast({
        title: 'Status updated',
        description: `${item.order_number} is now ${statusLabels[status].toLowerCase()}.`,
      });
    } catch (error: any) {
      console.error('OrderRequests: failed to update status', error);
      toast({
        title: 'Unable to update status',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (item: OrderRequest) => {
    if (!user?.id || item.created_by !== user.id) return;

    setDeletingId(item.id);
    try {
      const { data, error } = await supabase
        .from('order_requests')
        .delete()
        .eq('id', item.id)
        .eq('created_by', user.id)
        .select('id');

      if (error) throw error;
      if (!data?.length) throw new Error('Request could not be deleted. Refresh and try again.');

      setRequests((current) => current.filter((request) => request.id !== item.id));
      toast({ title: 'Request deleted', description: `${item.order_number} was removed.` });
    } catch (error: any) {
      console.error('OrderRequests: failed to delete request', error);
      toast({
        title: 'Unable to delete request',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Order Requests</h1>
          <p className="text-slate-600">
            Track changed orders, special instructions, holds, carrier changes, and other exceptions.
          </p>
        </div>
        <Button variant="outline" onClick={loadRequests} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-100 p-2">
              <ClipboardList className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Open</p>
              <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-amber-100 p-2">
              <Clock3 className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Waiting</p>
              <p className="text-2xl font-bold text-slate-900">{stats.waiting}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Urgent Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.urgent}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Request
          </CardTitle>
          <CardDescription>
            Use this for any order change or special instruction that needs to be remembered and closed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="order-number">Order # *</Label>
                <Input
                  id="order-number"
                  value={form.order_number}
                  onChange={(e) => setForm((current) => ({ ...current, order_number: e.target.value }))}
                  placeholder="Order #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="control-number">Control #</Label>
                <Input
                  id="control-number"
                  value={form.control_number}
                  onChange={(e) => setForm((current) => ({ ...current, control_number: e.target.value }))}
                  placeholder="Control #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pro-tracking-number">New PRO/Tracking #</Label>
                <Input
                  id="new-pro-tracking-number"
                  value={form.new_pro_tracking_number}
                  onChange={(e) => setForm((current) => ({ ...current, new_pro_tracking_number: e.target.value }))}
                  placeholder="New PRO or tracking #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={form.department}
                  onValueChange={(value) => setForm((current) => ({ ...current, department: value as Department }))}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>{department}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Input
                  id="customer"
                  value={form.customer}
                  onChange={(e) => setForm((current) => ({ ...current, customer: e.target.value }))}
                  placeholder="Customer or destination"
                />
              </div>
              <div className="space-y-2">
                <Label>Request Type</Label>
                <Select
                  value={form.request_type}
                  onValueChange={(value) => setForm((current) => ({ ...current, request_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(requestTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, priority: value as RequestPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="requested-by">Requested By</Label>
                <Input
                  id="requested-by"
                  value={form.requested_by}
                  onChange={(e) => setForm((current) => ({ ...current, requested_by: e.target.value }))}
                  placeholder="Customer service, planner, customer, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-needed">Action Needed</Label>
                <Input
                  id="action-needed"
                  value={form.action_needed}
                  onChange={(e) => setForm((current) => ({ ...current, action_needed: e.target.value }))}
                  placeholder="Example: Reprint BOL and notify dock"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="request-details">Request / Change Details *</Label>
                <Textarea
                  id="request-details"
                  value={form.request_details}
                  onChange={(e) => setForm((current) => ({ ...current, request_details: e.target.value }))}
                  placeholder="What changed or what special instruction needs to be followed?"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                  placeholder="Optional supporting information"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-2 h-4 w-4" />
                {isSaving ? 'Adding…' : 'Add Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Request Log</CardTitle>
          <CardDescription>
            Open items stay visible until someone moves them to Completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, control #, PRO/tracking #, department…"
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as 'all' | RequestStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[145px]">Order #</TableHead>
                  <TableHead className="min-w-[130px]">Control #</TableHead>
                  <TableHead className="min-w-[165px]">New PRO/Tracking #</TableHead>
                  <TableHead className="min-w-[120px]">Department</TableHead>
                  <TableHead className="min-w-[280px]">Request</TableHead>
                  <TableHead className="min-w-[120px]">Priority</TableHead>
                  <TableHead className="min-w-[150px]">Status</TableHead>
                  <TableHead className="min-w-[160px]">Requested By</TableHead>
                  <TableHead className="min-w-[165px]">Entered By</TableHead>
                  <TableHead className="min-w-[145px]">Created</TableHead>
                  <TableHead className="min-w-[150px]">Completed</TableHead>
                  <TableHead className="min-w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-slate-500">
                      Loading requests…
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-10 text-center text-slate-500">
                      No requests match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((item) => (
                    <TableRow key={item.id} className={item.priority === 'urgent' && item.status !== 'completed' ? 'bg-red-50/60' : ''}>
                      <TableCell className="align-top">
                        <div className="font-semibold text-slate-900">{item.order_number}</div>
                        {item.customer && <div className="mt-1 text-xs text-slate-500">{item.customer}</div>}
                        <div className="mt-1 text-xs text-slate-500">
                          {requestTypeLabels[item.request_type] || item.request_type}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {item.control_number || '—'}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {item.new_pro_tracking_number || '—'}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {item.department || '—'}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="whitespace-pre-wrap text-sm text-slate-800">{item.request_details}</div>
                        {item.action_needed && (
                          <div className="mt-2 rounded-md bg-slate-100 px-2 py-1.5 text-xs text-slate-700">
                            <span className="font-semibold">Action:</span> {item.action_needed}
                          </div>
                        )}
                        {item.notes && (
                          <div className="mt-2 text-xs text-slate-500">
                            <span className="font-semibold">Notes:</span> {item.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {item.priority === 'urgent' ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Urgent
                          </Badge>
                        ) : (
                          <Badge variant="outline">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Select
                          value={item.status}
                          onValueChange={(value) => updateStatus(item, value as RequestStatus)}
                          disabled={updatingId === item.id}
                        >
                          <SelectTrigger className={`h-8 w-[135px] ${statusStyles[item.status]}`} aria-label={`Status for order ${item.order_number}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="waiting">Waiting</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {item.requested_by || '—'}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-700">
                        {item.created_by_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-600">
                        {formatEastern(item.created_at)}
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-600">
                        {item.status === 'completed' ? (
                          <div>
                            <div>{formatEastern(item.completed_at)}</div>
                            {item.completed_by_name && (
                              <div className="mt-1 text-xs text-slate-500">by {item.completed_by_name}</div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {user?.id === item.created_by && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" disabled={deletingId === item.id} className="text-red-600 hover:text-red-700">
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete request for {item.order_number}?</AlertDialogTitle>
                                <AlertDialogDescription>This permanently removes this request from the log.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRequest(item)} className="bg-red-600 hover:bg-red-700">Delete request</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
