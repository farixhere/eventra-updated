import React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{variant?:ButtonVariant;size?:ButtonSize;isLoading?:boolean;icon?:React.ReactNode;iconPosition?:'left'|'right';fullWidth?:boolean;}
const Button=React.forwardRef<HTMLButtonElement,ButtonProps>(({variant='primary',size='md',isLoading=false,icon,iconPosition='left',fullWidth=false,className,children,disabled,...props},ref)=>{
const baseStyles=clsx('inline-flex items-center justify-center gap-2','font-medium rounded-lg','transition-all duration-200','disabled:opacity-50 disabled:cursor-not-allowed','focus-visible:outline-2 focus-visible:outline-offset-2',fullWidth&&'w-full');
const variantStyles={primary:clsx('bg-primary-500 text-white','hover:bg-primary-600 active:bg-primary-700','focus-visible:outline-primary-500'),secondary:clsx('bg-neutral-100 text-neutral-700','border border-neutral-200','hover:bg-neutral-200 active:bg-neutral-300','focus-visible:outline-neutral-500'),destructive:clsx('bg-error-500 text-white','hover:bg-error-600 active:bg-error-700','focus-visible:outline-error-500'),ghost:clsx('text-neutral-600','hover:bg-neutral-100 active:bg-neutral-200','focus-visible:outline-neutral-500')};
const sizeStyles={sm:'px-3 py-2 text-sm',md:'px-4 py-2.5 text-base',lg:'px-6 py-3 text-lg'};
return <button ref={ref} className={clsx(baseStyles,variantStyles[variant],sizeStyles[size],className)} disabled={disabled||isLoading} {...props}>{isLoading?<><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>Loading...</>:<>{icon&&iconPosition==='left'&&icon}{children}{icon&&iconPosition==='right'&&icon}</>}</button>});
Button.displayName='Button';
export default Button;