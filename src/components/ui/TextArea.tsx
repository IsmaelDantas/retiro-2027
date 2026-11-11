import { type TextareaHTMLAttributes, forwardRef } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const textareaId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={3}
          className={`
            w-full px-3.5 py-2.5 rounded-lg border text-sm resize-y
            bg-white text-text-primary placeholder:text-text-tertiary
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            ${error ? 'border-danger ring-1 ring-danger' : 'border-border hover:border-border-strong'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
