import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Contêiner estrutural de superfície limpa.
 * Não renderiza <button> para evitar elementos interativos aninhados inválidos (<a> dentro de <button>).
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-border p-4 sm:p-5
        shadow-[0_1px_2px_rgba(15,23,42,0.04)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
