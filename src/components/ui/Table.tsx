import React, { forwardRef } from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableCellProps extends TableProps {
  onClick?: () => void;
}

export const Table: React.FC<TableProps> & {
  Header: React.FC<TableProps>;
  Body: React.FC<TableProps>;
  Row: React.FC<TableProps & { isClickable?: boolean }>;
  Head: React.FC<TableProps>;
  Cell: React.ForwardRefExoticComponent<TableCellProps & React.RefAttributes<HTMLTableCellElement>>;
} = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto rounded-md border border-gray-700">
      <table className={`min-w-full divide-y divide-gray-700 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-800 ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableProps & { isClickable?: boolean }> = ({
  children,
  className = '',
  isClickable = false,
}) => {
  return (
    <tr
      className={`
        ${isClickable ? 'hover:bg-gray-600 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium text-teal-400 uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
};

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>((props, ref) => {
  const { children, className = '', onClick } = props;
  return (
    <td
      ref={ref}
      className={`px-6 py-4 text-sm text-gray-100 ${className}`}
      onClick={onClick}
    >
      {children}
    </td>
  );
});

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;