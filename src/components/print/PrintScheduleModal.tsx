import React, { useState, useEffect } from 'react';
import { X, Calendar, Printer } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { useHospital } from '../../contexts/HospitalContext';
import { toast } from 'react-hot-toast';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDoctors?: string[];
  selectedDepartment?: string;
  allDoctors?: any[];
}

const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  selectedDoctors = [],
  selectedDepartment,
  allDoctors = []
}) => {
  const { departments, hospital } = useHospital();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [printType, setPrintType] = useState<'selected' | 'department' | 'all'>('selected');
  const [doctorsToPrint, setDoctorsToPrint] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get current date for month selection
  const currentDate = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    return {
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  });

  useEffect(() => {
    if (isOpen) {
      loadDoctorsForPrint();
    }
  }, [isOpen, selectedDoctors, selectedDepartment, allDoctors]);

  const loadDoctorsForPrint = async () => {
    setIsLoading(true);
    try {
      let doctors: any[] = [];

      if (printType === 'selected' && selectedDoctors.length > 0) {
        // Use provided selected doctors
        doctors = allDoctors.filter(doc => selectedDoctors.includes(doc.id));
      } else if (printType === 'department' && selectedDepartment) {
        // Load doctors from selected department
        const q = query(
          collection(db, 'Users'),
          where('Hospital ID', '==', hospital?.id),
          where('Department ID', '==', selectedDepartment)
        );
        const querySnapshot = await getDocs(q);
        doctors = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else if (printType === 'all') {
        // Load all doctors
        doctors = allDoctors.filter(doc => doc['Hospital ID'] === hospital?.id);
      }

      // Load schedule data for each doctor
      const doctorsWithSchedule = await Promise.all(
        doctors.map(async (doctor) => {
          const scheduleRef = collection(db, 'Users', doctor.id, 'Schedule');
          const scheduleQuery = query(scheduleRef);
          const scheduleSnapshot = await getDocs(scheduleQuery);
          
          let schedule = null;
          if (!scheduleSnapshot.empty) {
            schedule = scheduleSnapshot.docs[0].data();
          }

          return {
            ...doctor,
            schedule
          };
        })
      );

      setDoctorsToPrint(doctorsWithSchedule);
    } catch (error) {
      console.error('Error loading doctors for print:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePrintContent = () => {
    const monthDate = new Date(selectedMonth + '-01');
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const printDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    let title = '';
    if (printType === 'selected' && selectedDoctors.length === 1) {
      const doctor = doctorsToPrint[0];
      title = `Schedule for ${doctor.Title} ${doctor.Fname} ${doctor.Lname}`;
    } else if (printType === 'selected' && selectedDoctors.length > 1) {
      title = `Schedule for Selected Doctors`;
    } else if (printType === 'department' && selectedDepartment) {
      const dept = departments.find(d => d.id === selectedDepartment);
      title = `Schedule for ${dept?.['Department Name'] || 'Department'}`;
    } else {
      title = `Schedule for All Doctors`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the schedule');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${monthName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 10pt;
            color: #1f2937;
            background: white;
            line-height: 1.6;
            padding: 20px;
          }
          
          .print-container {
            max-width: 100%;
          }
          
          .print-header {
            background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
            color: #000000;
            padding: 25px 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 2px solid #0d9488;
          }
          
          .print-header h1 {
            font-size: 28pt;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
            color: #000000;
          }
          
          .print-header h2 {
            font-size: 18pt;
            font-weight: 500;
            margin-bottom: 12px;
            color: #000000;
          }
          
          .print-header .meta-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            font-size: 11pt;
            color: #000000;
            padding-top: 15px;
            border-top: 1px solid #0d9488;
          }
          
          .doctor-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          
          .doctor-name {
            font-size: 20pt;
            font-weight: 700;
            color: #0d9488;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #cbd5e1;
          }
          
          .doctor-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            font-size: 10pt;
          }
          
          .doctor-info-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .doctor-info-item strong {
            color: #0d9488;
            font-weight: 600;
            min-width: 100px;
          }
          
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .schedule-table thead {
            background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
            color: #000000;
            border-bottom: 2px solid #0d9488;
          }
          
          .schedule-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000000;
          }
          
          .schedule-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10pt;
          }
          
          .schedule-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .schedule-table tbody tr:hover {
            background: #f1f5f9;
          }
          
          .schedule-value {
            font-weight: 600;
            color: #0d9488;
          }
          
          .no-schedule {
            text-align: center;
            padding: 30px;
            color: #000000;
            font-style: italic;
            background: #f8fafc;
            border-radius: 8px;
            border: 2px dashed #cbd5e1;
          }
          
          .print-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 9pt;
            color: #000000;
            page-break-inside: avoid;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              padding: 0;
            }
            
            .print-header {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .schedule-table thead {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            
            .doctor-section {
              page-break-inside: avoid;
            }
            
            @page {
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <h1>${hospital?.['Hospital Name'] || hospital?.name || 'Hospital'}</h1>
            <h2>${title} - ${monthName}</h2>
            <div class="meta-info">
              <span>Generated: ${printDate}</span>
              <span>Total Doctors: ${doctorsToPrint.length}</span>
            </div>
          </div>

          ${doctorsToPrint.map((doctor, index) => `
            <div class="doctor-section">
              <div class="doctor-name">${doctor.Title} ${doctor.Fname} ${doctor.Lname}</div>
              <div class="doctor-info">
                <div class="doctor-info-item">
                  <strong>Email:</strong>
                  <span>${doctor.Email || 'N/A'}</span>
                </div>
                <div class="doctor-info-item">
                  <strong>Department:</strong>
                  <span>${departments.find(d => d.id === doctor['Department ID'])?.['Department Name'] || 'N/A'}</span>
                </div>
                <div class="doctor-info-item">
                  <strong>Designation:</strong>
                  <span>${doctor.Designation || 'N/A'}</span>
                </div>
                <div class="doctor-info-item">
                  <strong>Mobile:</strong>
                  <span>${doctor['Mobile Number'] || 'N/A'}</span>
                </div>
              </div>

              ${doctor.schedule ? `
                <table class="schedule-table">
                  <thead>
                    <tr>
                      <th>Schedule Details</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Active Days</td>
                      <td class="schedule-value">${doctor.schedule['Active Days'] || 0}</td>
                    </tr>
                    <tr>
                      <td>Off Days</td>
                      <td class="schedule-value">${doctor.schedule['Off Days'] || 0}</td>
                    </tr>
                    <tr>
                      <td>Number of Shifts</td>
                      <td class="schedule-value">${doctor.schedule.Shift || 0}</td>
                    </tr>
                    <tr>
                      <td>Shift Start</td>
                      <td class="schedule-value">${doctor.schedule['Shift Start']?.toDate ? doctor.schedule['Shift Start'].toDate().toLocaleDateString() : (doctor.schedule['Shift Start'] || 'N/A')}</td>
                    </tr>
                    <tr>
                      <td>Shift Switch Frequency</td>
                      <td class="schedule-value">${doctor.schedule['Shift Switch'] || 0}</td>
                    </tr>
                  </tbody>
                </table>
              ` : `
                <div class="no-schedule">No schedule data available for this month.</div>
              `}
            </div>
          `).join('')}
          
          <div class="print-footer">
            <p>This is an official hospital document. Generated by the Hospital Management System.</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    
    toast.success('Opening print preview...');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print Schedule"
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-teal-700 mb-2">Print Type</label>
          <Select
            value={printType}
            onChange={setPrintType}
            options={[
              { value: 'selected', label: 'Selected Doctors' },
              { value: 'department', label: 'Department' },
              { value: 'all', label: 'All Doctors' }
            ]}
            className="bg-teal-50 border-teal-200 text-teal-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-teal-700 mb-2">Month</label>
          <Select
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={months}
            className="bg-teal-50 border-teal-200 text-teal-900"
          />
        </div>

        {printType === 'department' && (
          <div>
            <label className="block text-sm font-medium text-teal-700 mb-2">Department</label>
            <Select
              value={selectedDepartment || ''}
              onChange={(value) => {
                // This will be handled by the parent component
              }}
              options={[
                { value: '', label: 'Select Department' },
                ...departments.map(dept => ({
                  value: dept.id,
                  label: dept['Department Name']
                }))
              ]}
              className="bg-teal-50 border-teal-200 text-teal-900"
            />
          </div>
        )}

        <div className="text-sm text-teal-600">
          {doctorsToPrint.length} doctor(s) will be included in the printout.
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            onClick={onClose}
            className="bg-teal-200 text-teal-900 hover:bg-teal-300"
          >
            Cancel
          </Button>
          <Button
            onClick={generatePrintContent}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
            disabled={isLoading || doctorsToPrint.length === 0}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Schedule
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PrintScheduleModal;
