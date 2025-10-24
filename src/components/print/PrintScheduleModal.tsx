import React, { useState, useEffect } from 'react';
import { X, Calendar, Printer } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { useHospital } from '../../contexts/HospitalContext';

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
    
    let title = '';
    if (printType === 'selected' && selectedDoctors.length === 1) {
      const doctor = doctorsToPrint[0];
      title = `Schedule for ${doctor.Title} ${doctor.Fname} ${doctor.Lname} - ${monthName}`;
    } else if (printType === 'selected' && selectedDoctors.length > 1) {
      title = `Schedule for Selected Doctors - ${monthName}`;
    } else if (printType === 'department' && selectedDepartment) {
      const dept = departments.find(d => d.id === selectedDepartment);
      title = `Schedule for ${dept?.['Department Name'] || 'Department'} - ${monthName}`;
    } else {
      title = `Schedule for All Doctors - ${monthName}`;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
          .hospital-name { font-size: 24px; font-weight: bold; color: #0d9488; }
          .month-title { font-size: 20px; margin: 10px 0; }
          .doctor-section { margin: 20px 0; page-break-inside: avoid; }
          .doctor-name { font-size: 18px; font-weight: bold; color: #0d9488; margin-bottom: 10px; }
          .doctor-info { margin-bottom: 10px; }
          .schedule-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .schedule-table th, .schedule-table td { 
            border: 1px solid #ccc; 
            padding: 8px; 
            text-align: left; 
          }
          .schedule-table th { background-color: #f0fdfa; }
          .no-schedule { color: #666; font-style: italic; }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">${hospital?.name || 'Hospital'}</div>
          <div class="month-title">${title}</div>
          <div>Generated on: ${new Date().toLocaleDateString()}</div>
        </div>

        ${doctorsToPrint.map((doctor, index) => `
          <div class="doctor-section${index > 0 ? ' page-break' : ''}">
            <div class="doctor-name">${doctor.Title} ${doctor.Fname} ${doctor.Lname}</div>
            <div class="doctor-info">
              <strong>Email:</strong> ${doctor.Email}<br>
              <strong>Department:</strong> ${departments.find(d => d.id === doctor['Department ID'])?.['Department Name'] || 'N/A'}<br>
              <strong>Experience:</strong> ${doctor.Experience} years<br>
              <strong>Mobile:</strong> ${doctor['Mobile Number'] || 'N/A'}
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
                    <td>${doctor.schedule['Active Days'] || 0}</td>
                  </tr>
                  <tr>
                    <td>Off Days</td>
                    <td>${doctor.schedule['Off Days'] || 0}</td>
                  </tr>
                  <tr>
                    <td>Number of Shifts</td>
                    <td>${doctor.schedule.Shift || 0}</td>
                  </tr>
                  <tr>
                    <td>Shift Start</td>
                    <td>${doctor.schedule['Shift Start']?.toDate()?.toLocaleDateString() || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Shift Switch Frequency</td>
                    <td>${doctor.schedule['Shift Switch'] || 0}</td>
                  </tr>
                </tbody>
              </table>
            ` : `
              <div class="no-schedule">No schedule data available for this month.</div>
            `}
          </div>
        `).join('')}
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
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
