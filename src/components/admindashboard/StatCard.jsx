import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ title, value, icon: Icon, linkTo, change, totalRecords }) {
  const getTrendIcon = () => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-slate-500';
  };

  return (
    <Link to={linkTo}>
      <Card className="hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-600 truncate pr-2">{title}</CardTitle>
          <Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <Badge variant="secondary" className="text-xs text-slate-600">
              Today
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="font-medium">
                {change === 0 ? 'No change' : `${change >= 0 ? '+' : ''}${change}%`}
              </span>
            </div>
            <span className="text-slate-500">vs yesterday</span>
          </div>
          
          <div className="pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Records:</span>
              <span className="font-medium text-slate-700">{totalRecords}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}