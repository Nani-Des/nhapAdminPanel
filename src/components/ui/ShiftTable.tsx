import React, { forwardRef } from 'react';

interface ShiftTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ShiftTableCellProps extends ShiftTableProps {
  onClick?: () => void;
}

export const ShiftTable: React.FC<ShiftTableProps> & {
  Header: React.FC<ShiftTableProps>;
  Body: React.FC<ShiftTableProps>;
  Row: React.FC<ShiftTableProps & { isClickable?: boolean }>;
  Head: React.FC<ShiftTableProps>;
  Cell: React.ForwardRefExoticComponent<ShiftTableCellProps & React.RefAttributes<HTMLTableCellElement>>;
} = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto rounded-lg">
      <table className={`min-w-full divide-y divide-gray-700 ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<ShiftTableProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-gray-800 ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<ShiftTableProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-gray-700 ${className}`}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<ShiftTableProps & { isClickable?: boolean }> = ({
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

export const TableHead: React.FC<ShiftTableProps> = ({ children, className = '' }) => {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
};

export const TableCell = forwardRef<HTMLTableCellElement, ShiftTableCellProps>((props, ref) => {
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

ShiftTable.Header = TableHeader;
ShiftTable.Body = TableBody;
ShiftTable.Row = TableRow;
ShiftTable.Head = TableHead;
ShiftTable.Cell = TableCell;

export default ShiftTable;