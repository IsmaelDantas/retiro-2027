import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs
        ${hoverable || onClick ? 'hover:border-indigo-300 hover:shadow-md active:scale-[0.99] cursor-pointer transition-all duration-150' : ''}
        ${onClick ? 'w-full text-left' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}
