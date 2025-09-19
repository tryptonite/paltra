import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Package } from 'lucide-react';

export default function DimensionRowInput({ items, setItems, type }) {
  const addItem = () => {
    setItems([...items, { length: '', width: '', height: '' }]);
  };

  const valueAsNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) || num < 0 ? '' : num;
  }

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = valueAsNumber(value);
    setItems(newItems);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const getIcon = () => {
    if (type === 'skid') return Package;
    return Package;
  };

  const IconComponent = getIcon();

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold text-slate-700 capitalize flex items-center gap-2">
        <IconComponent className="h-4 w-4" />
        {type} Dimensions
      </Label>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl bg-gradient-to-r from-slate-50 to-white shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-2 items-center flex-1">
            <Input 
              type="number" 
              min="0"
              step="1"
              placeholder="L" 
              value={item.length} 
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 3) updateItem(index, 'length', val);
              }} 
              className="w-full min-w-0 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-center"
            />
            <span className="text-slate-400 font-medium">×</span>
            <Input 
              type="number" 
              min="0"
              step="1"
              placeholder="W" 
              value={item.width} 
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 3) updateItem(index, 'width', val);
              }} 
              className="w-full min-w-0 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-center"
            />
            <span className="text-slate-400 font-medium">×</span>
            <Input 
              type="number" 
              min="0"
              step="1"
              placeholder="H" 
              value={item.height} 
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 3) updateItem(index, 'height', val);
              }} 
              className="w-full min-w-0 rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 text-center"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => removeItem(index)} 
            className="hover:bg-red-50 hover:text-red-600 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={addItem} 
        className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 rounded-lg font-medium"
      >
        <PlusCircle className="h-4 w-4" />
        Add {type}
      </Button>
    </div>
  );
}