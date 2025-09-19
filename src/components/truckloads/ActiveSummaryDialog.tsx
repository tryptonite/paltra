import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ActiveSummaryDialog({ open, onOpenChange, date, truckloads }) {
  if (!date || !truckloads) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pickup Summary for {format(new Date(date + 'T00:00:00'), 'PPP')}</DialogTitle>
          <DialogDescription>
            A quick overview of all truckloads scheduled for this day.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ship Via</TableHead>
                <TableHead>Control #</TableHead>
                <TableHead>PO #</TableHead>
                <TableHead>Destination</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {truckloads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="4" className="text-center py-8 text-slate-500">
                    No pickups scheduled for this day.
                  </TableCell>
                </TableRow>
              ) : (
                truckloads.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.ship_via}</TableCell>
                    <TableCell>{record.control_numbers?.join(', ')}</TableCell>
                    <TableCell>{record.po_numbers?.join(', ')}</TableCell>
                    <TableCell>{record.destination_city}, {record.destination_state}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}