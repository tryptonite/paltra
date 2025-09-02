import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Calculator } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SpaceCalculator({ carrierData, onClose }) {
  if (!carrierData) return null;

  const standardPallets = (carrierData.ps_total || 0) + (carrierData.avd_total || 0) + (carrierData.fitting_total || 0);
  const racewayPallets = carrierData.raceway_total || 0;
  const racewaySpots = racewayPallets > 0 ? (Math.ceil(racewayPallets / 3) * 3) : 0;

  const totalSpots = standardPallets + racewaySpots;

  return (
    <Card className="bg-gradient-to-br from-purple-100 to-indigo-100 border-purple-200 rounded-2xl shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-purple-800">
                <Calculator className="h-5 w-5" />
                Space for {carrierData.carrier}
            </CardTitle>
            <CardDescription className="text-purple-700"></CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-purple-600 hover:bg-purple-200/80 -mt-2 -mr-2">
            <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-slate-600">P&S, AVD, & Fittings Pallets</span>
                <span className="font-semibold text-slate-800">{standardPallets} spots</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-slate-600">Raceway Pallets</span>
                <span className="font-semibold text-slate-800">{racewaySpots} spots</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-slate-600">Cartons</span>
                <span className="font-semibold text-slate-800">0 spots</span>
            </div>
        </div>
        <Separator className="bg-purple-200" />
        <div className="flex justify-between items-center text-lg pt-2">
          <span className="font-bold text-purple-800">Total Spots Needed</span>
          <span className="font-extrabold text-3xl text-purple-900">{totalSpots}</span>
        </div>
      </CardContent>
    </Card>
  );
}