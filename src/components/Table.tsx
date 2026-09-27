import React from 'react';
import clsx from 'clsx';
interface TableProps extends React.TableHTMLAttributes<HTMLTableElement>{responsive?:boolean;}
const Table=React.forwardRef<HTMLTableElement,TableProps>(({className,responsive=true,children,...props},ref)=><div className={clsx(responsive&&'overflow-x-auto')}><table ref={ref} className={clsx('w-full border-collapse text-left text-sm','bg-neutral-0 rounded-lg overflow-hidden',className)} {...props}>{children}</table></div>);
Table.displayName='Table';
interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement>{}
const TableHead=React.forwardRef<HTMLTableSectionElement,TableHeadProps>(({className,children,...props},ref)=><thead ref={ref} className={clsx('bg-neutral-50 border-b border-neutral-200',className)} {...props}>{children}</thead>);
TableHead.displayName='TableHead';
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement>{}
const TableBody=React.forwardRef<HTMLTableSectionElement,TableBodyProps>(({className,children,...props},ref)=><tbody ref={ref} className={clsx('divide-y divide-neutral-200',className)} {...props}>{children}</tbody>);
TableBody.displayName='TableBody';
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement>{hoverable?:boolean;}
const TableRow=React.forwardRef<HTMLTableRowElement,TableRowProps>(({className,hoverable=true,children,...props},ref)=><tr ref={ref} className={clsx(hoverable&&'hover:bg-neutral-50 transition-colors duration-150',className)} {...props}>{children}</tr>);
TableRow.displayName='TableRow';
interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement>{}
const TableHeaderCell=React.forwardRef<HTMLTableCellElement,TableHeaderCellProps>(({className,children,...props},ref)=><th ref={ref} className={clsx('px-4 py-3 font-semibold text-neutral-700','text-xs uppercase tracking-wider',className)} {...props}>{children}</th>);
TableHeaderCell.displayName='TableHeaderCell';
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement>{variant?:'default'|'numeric'|'status';}
const TableCell=React.forwardRef<HTMLTableCellElement,TableCellProps>(({className,variant='default',children,...props},ref)=><td ref={ref} className={clsx('px-4 py-3 text-neutral-700',variant==='numeric'&&'text-right font-medium',variant==='status'&&'font-medium',className)} {...props}>{children}</td>);
TableCell.displayName='TableCell';
export {Table,TableHead,TableBody,TableRow,TableHeaderCell,TableCell};
export default Table;