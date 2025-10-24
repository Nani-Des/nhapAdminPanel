import React, { useMemo, useState, useEffect } from 'react';
import { useHospital } from '../contexts/HospitalContext';
import { ShiftCode, ShiftTiming } from './ShiftSchedule';
import { Users } from '../types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface PrintScheduleProps {
  selectedMonth: Date;
  doctorShifts: Record<string, Record<string, string>>;
  conflicts: string[];
  filteredUsers: Users[];
  selectedDepartmentId: string | null;
  shiftTimings: ShiftTiming | null;
}

// Debug import
console.log('ShiftCode imported:', ShiftCode);

// Fallback shift codes if ShiftCode enum is undefined
const defaultShiftCodes = {
  WholeDay: 'WD',
  MorningShift: 'MS',
  AfternoonShift: 'AS',
  NightShift: 'NS',
  Off: 'OF',
  Holiday: 'HO',
  Leave: 'LV',
  NotAvailable: 'N/A'
};

// Use ShiftCode if defined, otherwise fallback
const shiftConfig: Record<string, { color: string; tooltip: (timings: ShiftTiming | null) => string }> = ShiftCode ? {
  [ShiftCode.WholeDay]: {
    color: '#2dd4bf', // teal-500
    tooltip: () => 'Whole Day'
  },
  [ShiftCode.MorningShift]: {
    color: '#2563eb', // blue-600
    tooltip: (timings) => timings ? `Morning Shift (${timings.Morning.Start} - ${timings.Morning.End})` : 'Morning Shift'
  },
  [ShiftCode.AfternoonShift]: {
    color: '#ea580c', // orange-600
    tooltip: (timings) => timings ? `Afternoon Shift (${timings.Afternoon.Start} - ${timings.Afternoon.End})` : 'Afternoon Shift'
  },
  [ShiftCode.NightShift]: {
    color: '#9333ea', // purple-600
    tooltip: (timings) => timings ? `Night Shift (${timings.Evening.Start} - ${timings.Evening.End})` : 'Night Shift'
  },
  [ShiftCode.Off]: {
    color: '#6b7280', // gray-500
    tooltip: () => 'Day Off'
  },
  [ShiftCode.Holiday]: {
    color: '#ef4444', // red-500
    tooltip: () => 'Holiday'
  },
  [ShiftCode.Leave]: {
    color: '#ca8a04', // yellow-600
    tooltip: () => 'Leave'
  },
  [ShiftCode.NotAvailable]: {
    color: '#1f2937', // gray-800
    tooltip: () => 'Not available (before shift start date)'
  }
} : {
  [defaultShiftCodes.WholeDay]: {
    color: '#2dd4bf', // teal-500
    tooltip: () => 'Whole Day'
  },
  [defaultShiftCodes.MorningShift]: {
    color: '#2563eb', // blue-600
    tooltip: (timings) => timings ? `Morning Shift (${timings.Morning.Start} - ${timings.Morning.End})` : 'Morning Shift'
  },
  [defaultShiftCodes.AfternoonShift]: {
    color: '#ea580c', // orange-600
    tooltip: (timings) => timings ? `Afternoon Shift (${timings.Afternoon.Start} - ${timings.Afternoon.End})` : 'Afternoon Shift'
  },
  [defaultShiftCodes.NightShift]: {
    color: '#9333ea', // purple-600
    tooltip: (timings) => timings ? `Night Shift (${timings.Evening.Start} - ${timings.Evening.End})` : 'Night Shift'
  },
  [defaultShiftCodes.Off]: {
    color: '#6b7280', // gray-500
    tooltip: () => 'Day Off'
  },
  [defaultShiftCodes.Holiday]: {
    color: '#ef4444', // red-500
    tooltip: () => 'Holiday'
  },
  [defaultShiftCodes.Leave]: {
    color: '#ca8a04', // yellow-600
    tooltip: () => 'Leave'
  },
  [defaultShiftCodes.NotAvailable]: {
    color: '#1f2937', // gray-800
    tooltip: () => 'Not available (before shift start date)'
  }
};

export const PrintSchedule: React.FC<PrintScheduleProps> = ({
  selectedMonth,
  doctorShifts,
  conflicts,
  filteredUsers,
  selectedDepartmentId,
  shiftTimings
}) => {
  const { departments } = useHospital();
  const hospitalId = filteredUsers?.[0]?.['Hospital ID'] || 'default_hospital';
  const [hospitalName, setHospitalName] = useState<string>('Default Hospital');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHospitalData = async () => {
      try {
        const hospitalDoc = await getDoc(doc(db, 'Hospitals', hospitalId));
        if (hospitalDoc.exists()) {
          setHospitalName(hospitalDoc.data()['Name'] || 'Default Hospital');
        }
      } catch (e) {
        console.error('Failed to fetch hospital data:', e);
        toast.error('Failed to fetch hospital data.');
      } finally {
        setLoading(false);
      }
    };
    fetchHospitalData();
  }, [hospitalId]);

  const days = useMemo(() => {
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const days: { day: string; date: string }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), i).getDay()
      ];
      days.push({ day: weekday, date: i.toString() });
    }
    return days;
  }, [selectedMonth]);

  const getShiftColor = (shift: string): string => shiftConfig[shift]?.color || '#d1d5db'; // gray-300
  const getShiftTooltip = (shift: string): string => shiftConfig[shift]?.tooltip(shiftTimings) || shift;

  return (
    <div>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
              display: none;
            }
            #print-schedule, #print-schedule * {
              visibility: visible !important;
              display: block !important;
            }
            #print-schedule {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 15mm;
              font-size: 10pt;
              font-family: 'Times New Roman', Times, serif;
              color: #000;
            }
            .print-container {
              max-width: 100%;
              margin: 0;
            }
            .print-header {
              text-align: center;
              margin-bottom: 15mm;
              border-bottom: 2px solid #000;
              padding-bottom: 5mm;
            }
            .print-header h1 {
              font-size: 16pt;
              font-weight: bold;
              margin: 0;
            }
            .print-header h2 {
              font-size: 14pt;
              margin: 5mm 0;
            }
            .print-header h3 {
              font-size: 12pt;
              margin: 5mm 0;
            }
            .conflict-warning {
              color: #ff0000;
              font-weight: bold;
              margin: 5mm 0;
              font-size: 10pt;
            }
            .print-legend {
              margin: 10mm 0;
              font-size: 9pt;
              border: 1px solid #000;
              padding: 5mm;
              background-color: #f9f9f9;
            }
            .print-legend h3 {
              font-weight: bold;
              margin-bottom: 5mm;
              font-size: 10pt;
            }
            .print-legend-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 5mm;
            }
            .print-legend-item {
              display: flex;
              align-items: center;
            }
            .print-legend-color {
              width: 12px;
              height: 12px;
              border: 1px solid #000;
              margin-right: 4px;
            }
            .print-table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
              table-layout: fixed;
            }
            .print-table th, .print-table td {
              border: 1px solid #000;
              padding: 3mm;
              text-align: center;
              font-size: 8pt;
            }
            .print-table th {
              background-color: #e0e0e0;
              font-weight: bold;
              text-transform: uppercase;
            }
            .print-table td:first-child {
              text-align: left;
              width: 20%;
              font-weight: bold;
              padding-left: 5mm;
            }
            .print-table th:not(:first-child) {
              width: ${100 / days.length}%;
            }
            .print-table tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            .conflict-day {
              background-color: #ffe6e6;
              border: 2px solid #ff0000 !important;
            }
          }
        `}
      </style>
      <div id="print-schedule" className="print-container">
        {loading ? (
          <div>Loading hospital data...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="print-header">
            <h1>{hospitalName}</h1>
            <h2>Physician Shift Schedule - {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <p>No physicians found for the selected criteria.</p>
          </div>
        ) : (
          <>
            <div className="print-header">
              <h1>{hospitalName}</h1>
              <h2>Physician Shift Schedule - {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
              {selectedDepartmentId && departments && (
                <h3>Department: {departments.find(d => d.id === selectedDepartmentId)?.['Department Name'] || 'All Departments'}</h3>
              )}
              {conflicts.length > 0 && (
                <p className="conflict-warning">Warning: No physicians available on days {conflicts.join(', ')}</p>
              )}
            </div>
            <div className="print-legend">
              <h3>Shift Legend</h3>
              <div className="print-legend-grid">
                {Object.entries(shiftConfig).map(([code, { color, tooltip }]) => (
                  <div key={code} className="print-legend-item">
                    <span className="print-legend-color" style={{ backgroundColor: color }}></span>
                    <span>{code}: {tooltip(shiftTimings).split('(')[0].trim()}</span>
                  </div>
                ))}
              </div>
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Physician</th>
                  {days.map(day => (
                    <th key={day.date} className={conflicts.includes(day.date) ? 'conflict-day' : ''}>
                      <div>{day.day}</div>
                      <div>{day.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.Title} {user.Fname} {user.Lname}</td>
                    {days.map(day => (
                      <td
                        key={day.date}
                        style={{ backgroundColor: getShiftColor(doctorShifts[user.id]?.[day.date] || (ShiftCode?.NotAvailable || defaultShiftCodes.NotAvailable)) }}
                        className={conflicts.includes(day.date) ? 'conflict-day' : ''}
                      >
                        {doctorShifts[user.id]?.[day.date] || (ShiftCode?.NotAvailable || defaultShiftCodes.NotAvailable)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};