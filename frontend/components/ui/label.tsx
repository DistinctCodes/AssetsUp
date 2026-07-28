import { LabelHTMLAttributes, forwardRef } from 'react';

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, children, ...props }, ref) => (
    <label ref={ref} className={`text-sm font-medium text-gray-700 ${className || ''}`} {...props}>
      {children}
    </label>
  ),
);
Label.displayName = 'Label';
