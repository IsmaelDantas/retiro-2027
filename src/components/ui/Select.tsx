import { type SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className = '', ...props }, ref) => {
    const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={selectId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
          {props.required && <span className="text-danger ml-0.5">*</span>}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full px-3.5 py-2.5 rounded-lg border text-sm
            bg-white text-text-primary
            transition-all duration-150 appearance-none
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-surface-tertiary disabled:cursor-not-allowed
            ${error ? 'border-danger ring-1 ring-danger' : 'border-border hover:border-border-strong'}
            ${className}
          `}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
