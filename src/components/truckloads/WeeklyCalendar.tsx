import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';

export default function WeeklyCalendar({ truckloads, onDateClick }) {
    const [currentWeekStart, setCurrentWeekStart] = useState(() => 
        startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday = 1
    );

    const weekDays = Array.from({ length: 7 }, (_, i) => 
        addDays(currentWeekStart, i)
    );

    const goToPreviousWeek = () => {
        setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    };

    const goToCurrentWeek = () => {
        setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    };

    const getTruckloadsForDate = (date) => {
        return truckloads.filter(truckload => {
            try {
                // pickup_date is a string like 'YYYY-MM-DD'
                // Appending 'T00:00:00' makes new Date() parse it in the local timezone, avoiding UTC shift.
                const pickupDate = new Date(truckload.pickup_date + 'T00:00:00');
                return isSameDay(pickupDate, date);
            } catch {
                return false;
            }
        });
    };

    const handleDateClick = (date) => {
        const dateString = format(date, 'yyyy-MM-dd');
        onDateClick(dateString);
    };

    return (
        <Card className="border-slate-200 shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-slate-800">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Calendar className="h-5 w-5 text-indigo-600" />
                        </div>
                        Weekly Pickup Calendar
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToCurrentWeek} className="text-xs">
                            Today
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToNextWeek}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <p className="text-slate-600 text-sm">
                    Week of {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((date, index) => {
                        const dayTruckloads = getTruckloadsForDate(date);
                        const isToday = isSameDay(date, new Date());
                        const isWeekend = index >= 5; // Saturday and Sunday
                        
                        return (
                            <div
                                key={date.toISOString()}
                                onClick={() => handleDateClick(date)}
                                className={`
                                    relative cursor-pointer rounded-lg border-2 p-3 min-h-[80px] transition-all duration-200
                                    border-slate-200 hover:border-slate-300 hover:shadow-sm
                                    ${isToday ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
                                    ${isWeekend ? 'bg-slate-50' : 'bg-white'}
                                    ${dayTruckloads.length > 0 ? 'border-green-300 bg-green-50' : ''}
                                `}
                            >
                                <div className="flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-medium ${isWeekend ? 'text-slate-500' : 'text-slate-700'}`}>
                                            {format(date, 'EEE')}
                                        </span>
                                        {isToday && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                    </div>
                                    <div className={`text-lg font-bold mb-1 ${isWeekend ? 'text-slate-500' : 'text-slate-900'}`}>
                                        {format(date, 'd')}
                                    </div>
                                    
                                    {dayTruckloads.length > 0 && (
                                        <div className="flex-1 flex flex-col justify-end">
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {Array.from({ length: Math.min(dayTruckloads.length, 4) }, (_, i) => (
                                                    <div key={i} className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                ))}
                                                {dayTruckloads.length > 4 && (
                                                    <span className="text-xs text-green-700 font-semibold">
                                                        +{dayTruckloads.length - 4}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-green-700 font-semibold mt-1">
                                                {dayTruckloads.length} pickup{dayTruckloads.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {dayTruckloads.length === 0 && !isWeekend && (
                                        <div className="flex-1 flex items-end">
                                            <div className="text-xs text-slate-400">No pickups</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-50 border border-green-300 rounded"></div>
                            <span>Has pickups</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Today</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Each pickup</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}