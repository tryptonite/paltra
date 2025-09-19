import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ControlNumberInput({ values, setValues, label, placeholder, maxLength }) {
  const [currentValue, setCurrentValue] = useState('');

  const handleAdd = () => {
    const trimmedValue = currentValue.trim();
    if (trimmedValue && !values.includes(trimmedValue)) {
      setValues([...values, trimmedValue]);
      setCurrentValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (numToRemove) => {
    setValues(values.filter(num => num !== numToRemove));
  };

  const handleChange = (e) => {
    const val = e.target.value.toUpperCase();
    if (maxLength && val.length > maxLength) {
        return;
    }
    setCurrentValue(val);
  };

  // Handle form submission to accept current input
  const handleSubmit = () => {
    if (currentValue.trim()) {
      handleAdd();
    }
  };

  // Call handleSubmit when parent form is submitted
  React.useEffect(() => {
    const form = document.querySelector('form');
    if (form) {
      const handleFormSubmit = () => {
        handleSubmit();
      };
      form.addEventListener('submit', handleFormSubmit);
      return () => form.removeEventListener('submit', handleFormSubmit);
    }
  }, [currentValue]);

  return (
    <div className="space-y-3">
      <Label className="text-slate-700 font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder={placeholder}
          className="rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 w-full"
        />
        <Button type="button" variant="outline" size="icon" onClick={handleAdd} className="rounded-lg flex-shrink-0">
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
        {values.map(num => (
          <Badge key={num} variant="secondary" className="flex items-center gap-2 text-sm py-1 px-3">
            {num}
            <button type="button" onClick={() => handleRemove(num)} className="rounded-full hover:bg-slate-300 p-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}