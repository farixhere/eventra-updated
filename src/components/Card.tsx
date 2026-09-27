import React from 'react';
import clsx from 'clsx';
interface CardProps extends React.HTMLAttributes<HTMLDivElement>{bordered?:boolean;hoverable?:boolean;padding?:'sm'|'md'|'lg';}
const Card=React.forwardRef<HTMLDivElement,CardProps>(({className,bordered=true,hoverable=false,padding='md',children,...props},ref)=>{const paddingStyles={sm:'p-3',md:'p-4',lg:'p-6'};return <div ref={ref} className={clsx('bg-neutral-0 rounded-lg shadow-sm',bordered&&'border border-neutral-200',hoverable&&'transition-all duration-200 hover:shadow-md cursor-pointer',paddingStyles[padding],className)} {...props}>{children}</div>});
Card.displayName='Card';
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement>{title?:string;subtitle?:string;}
const CardHeader=React.forwardRef<HTMLDivElement,CardHeaderProps>(({className,title,subtitle,children,...props},ref)=><div ref={ref} className={clsx('mb-4 pb-4 border-b border-neutral-200',className)} {...props}>{title&&<h3 className="text-lg font-semibold text-neutral-900">{title}</h3>}{subtitle&&<p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}{children}</div>);
CardHeader.displayName='CardHeader';
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement>{}
const CardContent=React.forwardRef<HTMLDivElement,CardContentProps>(({className,children,...props},ref)=><div ref={ref} className={clsx('',className)} {...props}>{children}</div>);
CardContent.displayName='CardContent';
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement>{}
const CardFooter=React.forwardRef<HTMLDivElement,CardFooterProps>(({className,children,...props},ref)=><div ref={ref} className={clsx('mt-6 pt-4 border-t border-neutral-200 flex gap-2',className)} {...props}>{children}</div>);
CardFooter.displayName='CardFooter';
export {Card,CardHeader,CardContent,CardFooter};
export default Card;