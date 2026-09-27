import React from 'react';
import clsx from 'clsx';
type BadgeVariant='default'|'success'|'warning'|'error'|'info'|'pending'|'published'|'draft';
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>{variant?:BadgeVariant;size?:'sm'|'md';}
const variantStyles={default:'bg-neutral-100 text-neutral-700',success:'bg-success-100 text-success-700',warning:'bg-warning-100 text-warning-700',error:'bg-error-100 text-error-700',info:'bg-cyan-100 text-cyan-700',pending:'bg-warning-100 text-warning-700',published:'bg-success-100 text-success-700',draft:'bg-neutral-100 text-neutral-700'};
const statusIcons={default:'•',success:'✓',warning:'◆',error:'✕',info:'ℹ',pending:'◆',published:'✓',draft:'◎'};
const Badge=React.forwardRef<HTMLSpanElement,BadgeProps>(({variant='default',size='md',className,children,...props},ref)=>{const sizeStyles={sm:'px-2 py-1 text-xs font-medium rounded-md',md:'px-3 py-1.5 text-sm font-medium rounded-lg'};return <span ref={ref} className={clsx('inline-flex items-center gap-1','font-semibold tracking-tight',sizeStyles[size],variantStyles[variant],className)} {...props}><span className="text-current">{statusIcons[variant]}</span>{children}</span>});
Badge.displayName='Badge';
export default Badge;