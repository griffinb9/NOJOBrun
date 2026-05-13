'use client';

import { salarySelectOptions } from '@/lib/salaryRanges';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SalaryRangeSelect({ value, onChange }: Props) {
  const opts = salarySelectOptions(value);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.map((o, i) => (
        <option key={i} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
