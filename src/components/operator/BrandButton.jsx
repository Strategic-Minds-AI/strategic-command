import React from 'react';
export default function BrandButton({ children, variant = 'primary', className = '', ...props }) {
  return <button type="button" className={`${variant === 'primary' ? 'brand-primary' : 'brand-outline'} ${className}`} {...props}>{children}</button>;
}