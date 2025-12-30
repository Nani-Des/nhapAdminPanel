import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Upload, Download, CheckCircle, XCircle, X, AlertCircle, Trash2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Users, Department } from '../../types';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface BulkUploadDoctorsProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  hospitalId: string;
  existingUsers: Users[];
  onBulkImport: (doctors: ProcessedDoctorRow[]) => Promise<{ success: number; failed: number; errors: string[] }>;
}

export interface ProcessedDoctorRow {
  rowIndex: number;
  Fname: string;
  Lname: string;
  Email: string;
  'Mobile Number': string;
  Title: string;
  Designation: string;
  'Department ID': string;
  Region: string;
  Status: boolean;
  'Active Days': number;
  'Off Days': number;
  Shift: number;
  'Shift Start': Date | string;
  'Shift Switch': number;
  isValid: boolean;
  errors: string[];
  isSelected: boolean;
}

const REQUIRED_FIELDS = ['Fname', 'Lname', 'Email', 'Mobile Number', 'Title', 'Designation', 'Department ID'];
const EXCEL_COLUMNS = [
  'Fname',
  'Lname',
  'Email',
  'Mobile Number',
  'Title',
  'Designation',
  'Department ID',
  'Region',
  'Active Days',
  'Off Days',
  'Shift',
  'Shift Start',
  'Shift Switch',
];

const BulkUploadDoctors: React.FC<BulkUploadDoctorsProps> = ({
  isOpen,
  onClose,
  departments,
  hospitalId,
  existingUsers,
  onBulkImport,
}) => {
  const [uploadedData, setUploadedData] = useState<ProcessedDoctorRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadedData([]);
      setImportResults(null);
      setIsProcessing(false);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  // Generate and download modern PDF guide
  const downloadGuide = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Colors
    const primaryColor = [20, 128, 128]; // Teal
    const secondaryColor = [245, 247, 250]; // Light gray
    const textColor = [51, 51, 51]; // Dark gray

    let yPos = 20;

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Bulk Upload Doctors', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Complete Field Guide & Instructions', 105, 30, { align: 'center' });

    yPos = 50;

    // Introduction
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('This guide explains all fields required for bulk uploading doctors to the system.', 15, yPos);
    yPos += 10;

    // Required Fields Section
    yPos += 5;
    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPos - 5, 180, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Required Fields', 20, yPos);
    yPos += 10;

    const requiredFields = [
      ['Field Name', 'Description', 'Example'],
      ['Fname', 'Doctor\'s first name', 'John'],
      ['Lname', 'Doctor\'s last name', 'Doe'],
      ['Email', 'Unique email address. Must be valid format and not exist in system', 'john.doe@example.com'],
      ['Mobile Number', 'Doctor\'s mobile/phone number', '+1234567890'],
      ['Title', 'Professional title (e.g., Dr., Prof.)', 'Dr.'],
      ['Designation', 'Doctor\'s medical specialization', 'Cardiologist'],
      ['Department ID', 'ID of department. Must match existing department ID', 'DEPT001'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [requiredFields[0]],
      body: requiredFields.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 85 },
        2: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Optional Fields Section
    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPos - 5, 180, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Optional Fields', 20, yPos);
    yPos += 10;

    const optionalFields = [
      ['Field Name', 'Description', 'Example'],
      ['Region', 'Geographic region or location', 'Downtown'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [optionalFields[0]],
      body: optionalFields.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 85 },
        2: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Schedule Fields Section
    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPos - 5, 180, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Schedule Fields', 20, yPos);
    yPos += 5;
    
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('These fields control the doctor\'s work schedule and shift patterns.', 20, yPos);
    yPos += 10;

    const scheduleFields = [
      ['Field Name', 'Description', 'Example'],
      ['Active Days', 'Number of active working days per week (typically 5)', '5'],
      ['Off Days', 'Number of off days per week (typically 2)', '2'],
      ['Shift', 'Shift type: 1 = Whole Day, 2 = 2 Shifts, 3 = 3 Shifts', '1'],
      ['Shift Start', 'Date when shift schedule starts (format: YYYY-MM-DD). Defaults to current date if not provided.', new Date().toISOString().split('T')[0]],
      ['Shift Switch', 'Frequency of shift rotation (days before switching)', '5'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [scheduleFields[0]],
      body: scheduleFields.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 85 },
        2: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Important Notes Section
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...secondaryColor);
    doc.rect(15, yPos - 5, 180, 8, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Important Notes', 20, yPos);
    yPos += 10;

    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const notes = [
      '• Email addresses must be unique. Duplicate emails in the file or existing in the system will be flagged as errors.',
      '• Department ID must match an existing department ID in the system. Invalid IDs will be flagged.',
      '• All required fields must be filled in for each doctor row.',
      '• Schedule fields have default values if not provided: Active Days = 5, Off Days = 2, Shift = 1 (Whole Day), Shift Switch = 5',
      '• Shift values: 1 = Whole Day, 2 = 2 Shifts per day, 3 = 3 Shifts per day',
      '• After uploading, you can review and edit all fields in the preview before importing.',
      '• Invalid rows can be removed or corrected before final import.',
      '• The system will validate all data and show errors for any issues before allowing import.',
    ];

    notes.forEach((note) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(note, 20, yPos, { maxWidth: 170 });
      yPos += 8;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        105,
        287,
        { align: 'center' }
      );
    }

    doc.save('Bulk_Upload_Doctors_Guide.pdf');
    toast.success('Guide downloaded successfully');
  };

  // Generate and download Excel template
  const downloadTemplate = () => {
    const templateData = [
      {
        Fname: 'John',
        Lname: 'Doe',
        Email: 'john.doe@example.com',
        'Mobile Number': '+1234567890',
        Title: 'Dr.',
        Designation: 'Cardiologist',
        'Department ID': departments[0]?.['Department ID'] || '',
        Region: 'Downtown',
        'Active Days': 5,
        'Off Days': 2,
        Shift: 1,
        'Shift Start': new Date().toISOString().split('T')[0],
        'Shift Switch': 5,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doctors');

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Fname
      { wch: 15 }, // Lname
      { wch: 30 }, // Email
      { wch: 18 }, // Mobile Number
      { wch: 10 }, // Title
      { wch: 20 }, // Designation
      { wch: 20 }, // Department ID
      { wch: 15 }, // Region
      { wch: 12 }, // Experience
      { wch: 12 }, // Active Days
      { wch: 12 }, // Off Days
      { wch: 10 }, // Shift
      { wch: 15 }, // Shift Start
      { wch: 12 }, // Shift Switch
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'Doctors_Bulk_Upload_Template.xlsx');
    toast.success('Template downloaded successfully');
  };

  // Handle file upload and parse Excel
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      if (jsonData.length === 0) {
        toast.error('The Excel file is empty');
        setIsProcessing(false);
        return;
      }

      // Process and validate each row
      const processedData: ProcessedDoctorRow[] = jsonData.map((row: any, index: number) => {
        // Parse Shift Start date
        let shiftStart: Date | string = new Date();
        if (row['Shift Start']) {
          const dateStr = String(row['Shift Start']).trim();
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            shiftStart = parsedDate;
          } else {
            // Try Excel date serial number
            const excelDate = XLSX.SSF.parse_date_code(parseFloat(dateStr));
            if (excelDate) {
              shiftStart = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
            }
          }
        }

        const processedRow: ProcessedDoctorRow = {
          rowIndex: index + 2, // +2 because Excel rows start at 1 and we have header
          Fname: String(row.Fname || '').trim(),
          Lname: String(row.Lname || '').trim(),
          Email: String(row.Email || '').trim().toLowerCase(),
          'Mobile Number': String(row['Mobile Number'] || row['MobileNumber'] || '').trim(),
          Title: String(row.Title || '').trim(),
          Designation: String(row.Designation || '').trim(),
          'Department ID': String(row['Department ID'] || row['DepartmentID'] || '').trim(),
          Region: String(row.Region || '').trim(),
          'Active Days': parseInt(String(row['Active Days'] || '5'), 10) || 5,
          'Off Days': parseInt(String(row['Off Days'] || '2'), 10) || 2,
          Shift: parseInt(String(row.Shift || '1'), 10) || 1, // 1 = Whole Day, 2-3 = Number of shifts
          'Shift Start': shiftStart,
          'Shift Switch': parseInt(String(row['Shift Switch'] || row['ShiftSwitch'] || '5'), 10) || 5,
          Status: true,
          isValid: true,
          errors: [],
          isSelected: true,
        };

        // Validate row
        const errors: string[] = [];
        
        // Check required fields
        REQUIRED_FIELDS.forEach((field) => {
          const value = processedRow[field as keyof ProcessedDoctorRow];
          if (!value || String(value).trim() === '') {
            errors.push(`${field} is required`);
          }
        });

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (processedRow.Email && !emailRegex.test(processedRow.Email)) {
          errors.push('Invalid email format');
        }

        // Check for duplicate email in existing users
        const emailExists = existingUsers.some(
          (user) => user.Email.toLowerCase() === processedRow.Email.toLowerCase()
        );
        if (emailExists) {
          errors.push('Email already exists in the system');
        }

        // Validate Department ID exists
        if (processedRow['Department ID']) {
          const deptExists = departments.some(
            (dept) => dept['Department ID'] === processedRow['Department ID']
          );
          if (!deptExists) {
            errors.push(`Department ID "${processedRow['Department ID']}" not found`);
          }
        }

        // Validate schedule fields
        if (processedRow['Active Days'] < 0 || processedRow['Active Days'] > 7) {
          errors.push('Active Days must be between 0 and 7');
        }
        if (processedRow['Off Days'] < 0 || processedRow['Off Days'] > 7) {
          errors.push('Off Days must be between 0 and 7');
        }
        if (processedRow.Shift < 1 || processedRow.Shift > 3) {
          errors.push('Shift must be between 1 and 3 (1 = Whole Day, 2-3 = Number of shifts)');
        }
        if (processedRow['Shift Switch'] < 0) {
          errors.push('Shift Switch must be a positive number');
        }

        processedRow.errors = errors;
        processedRow.isValid = errors.length === 0;

        return processedRow;
      });

      // Check for duplicates within the uploaded data
      processedData.forEach((row, index) => {
        const duplicateInUpload = processedData.some(
          (item, idx) => idx !== index && item.Email.toLowerCase() === row.Email.toLowerCase() && row.Email
        );
        if (duplicateInUpload) {
          row.errors.push('Duplicate email in upload file');
          row.isValid = false;
        }
      });

      setUploadedData(processedData);
      toast.success(`Loaded ${processedData.length} doctor(s) from file`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process Excel file. Please check the format.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Update a specific field in a row
  const updateRowField = (rowIndex: number, field: keyof ProcessedDoctorRow, value: any) => {
    setUploadedData((prev) => {
      const updated = prev.map((row, idx) => {
        if (idx === rowIndex) {
          const updatedRow = { ...row, [field]: value };
          
          // Re-validate the row
          const errors: string[] = [];
          
          REQUIRED_FIELDS.forEach((reqField) => {
            const fieldValue = updatedRow[reqField as keyof ProcessedDoctorRow];
            if (!fieldValue || String(fieldValue).trim() === '') {
              errors.push(`${reqField} is required`);
            }
          });

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (updatedRow.Email && !emailRegex.test(updatedRow.Email)) {
            errors.push('Invalid email format');
          }

          // Improved conflict detection for emails
          const existingUser = existingUsers.find(
            (user) => user.Email.toLowerCase() === updatedRow.Email.toLowerCase()
          );
          if (existingUser) {
            errors.push(`Email already exists: ${existingUser.Fname} ${existingUser.Lname} (ID: ${existingUser.id})`);
          }

          // Check for duplicates in upload file with row numbers
          const duplicateRows: number[] = [];
          prev.forEach((item, idx) => {
            if (idx !== rowIndex && item.Email.toLowerCase() === updatedRow.Email.toLowerCase() && updatedRow.Email) {
              duplicateRows.push(item.rowIndex);
            }
          });
          if (duplicateRows.length > 0) {
            errors.push(`Duplicate email in upload file (row${duplicateRows.length > 1 ? 's' : ''} ${duplicateRows.join(', ')})`);
          }

          if (updatedRow['Department ID']) {
            const deptExists = departments.some(
              (dept) => dept['Department ID'] === updatedRow['Department ID']
            );
            if (!deptExists) {
              errors.push(`Department ID "${updatedRow['Department ID']}" not found`);
            }
          }

          // Validate schedule fields
          if (updatedRow['Active Days'] < 0 || updatedRow['Active Days'] > 7) {
            errors.push('Active Days must be between 0 and 7');
          }
          if (updatedRow['Off Days'] < 0 || updatedRow['Off Days'] > 7) {
            errors.push('Off Days must be between 0 and 7');
          }
          if (updatedRow.Shift < 1 || updatedRow.Shift > 3) {
            errors.push('Shift must be between 1 and 3 (1 = Whole Day, 2-3 = Number of shifts)');
          }
          if (updatedRow['Shift Switch'] < 0) {
            errors.push('Shift Switch must be a positive number');
          }

          updatedRow.errors = errors;
          updatedRow.isValid = errors.length === 0;
          
          return updatedRow;
        }
        return row;
      });
      return updated;
    });
  };

  // Toggle row selection
  const toggleRowSelection = (rowIndex: number) => {
    setUploadedData((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, isSelected: !row.isSelected } : row))
    );
  };

  // Remove a row
  const removeRow = (rowIndex: number) => {
    setUploadedData((prev) => prev.filter((_, idx) => idx !== rowIndex));
    toast.success('Row removed');
  };

  // Select/Deselect all rows
  const toggleSelectAll = () => {
    const allSelected = uploadedData.every((row) => row.isSelected);
    setUploadedData((prev) => prev.map((row) => ({ ...row, isSelected: !allSelected })));
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    const selectedRows = uploadedData.filter((row) => row.isSelected && row.isValid);
    
    if (selectedRows.length === 0) {
      toast.error('Please select at least one valid row to import');
      return;
    }

    const invalidSelected = uploadedData.filter((row) => row.isSelected && !row.isValid);
    if (invalidSelected.length > 0) {
      toast.error(`Please fix errors in ${invalidSelected.length} selected row(s) before importing`);
      return;
    }

    setIsImporting(true);
    try {
      const results = await onBulkImport(selectedRows);
      setImportResults(results);
      
      if (results.failed === 0) {
        toast.success(`Successfully imported ${results.success} doctor(s)`);
      } else if (results.success > 0) {
        toast.success(
          `Imported ${results.success} doctor(s) successfully. ${results.failed} doctor(s) were skipped due to errors.`,
          { duration: 6000 }
        );
      } else {
        toast.error(`Failed to import doctors. All ${results.failed} doctor(s) had errors.`);
      }
      
      // Close modal and clear preview after import completes
      // Wait a moment to show the success message
      setTimeout(() => {
        // Clear all state
        setUploadedData([]);
        setImportResults(null);
        setIsImporting(false);
        setIsProcessing(false);
        
        // Reset file input if it exists
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Close the modal
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Failed to import doctors');
      setIsImporting(false);
    }
  };

  const validSelectedCount = uploadedData.filter((row) => row.isSelected && row.isValid).length;
  const invalidCount = uploadedData.filter((row) => !row.isValid).length;
  const selectedCount = uploadedData.filter((row) => row.isSelected).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Doctors" size="xl">
      <div className="space-y-6 max-h-[85vh] overflow-y-auto -mx-6 px-6">
        {/* Step 1: Download Template & Upload File */}
        {uploadedData.length === 0 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Download the Excel template below</li>
                <li>Fill in the doctor information</li>
                <li>Upload the completed file</li>
                <li>Review and edit the preview</li>
                <li>Import the doctors</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="flex-1"
                icon={<Download className="w-4 h-4" />}
              >
                Download Template
              </Button>
              <Button
                onClick={downloadGuide}
                variant="outline"
                className="flex-1"
                icon={<FileText className="w-4 h-4" />}
              >
                Download Guide
              </Button>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="bulk-upload-file"
                />
                <label htmlFor="bulk-upload-file">
                  <Button
                    variant="primary"
                    className="w-full"
                    icon={<Upload className="w-4 h-4" />}
                    disabled={isProcessing}
                    isLoading={isProcessing}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isProcessing ? 'Processing...' : 'Upload Excel File'}
                  </Button>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview and Edit */}
        {uploadedData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Preview ({uploadedData.length} doctor{uploadedData.length !== 1 ? 's' : ''})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {validSelectedCount} valid selected, {invalidCount} with errors
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedCount === uploadedData.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedData([]);
                    setImportResults(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Preview Table - Large for better visibility */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '1800px' }}>
                <thead className="bg-teal-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedCount === uploadedData.length && uploadedData.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[120px]">
                      First Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[120px]">
                      Last Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[200px]">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[140px]">
                      Mobile
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[100px]">
                      Title
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[150px]">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[150px]">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[100px]">
                      Region
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[100px]">
                      Active Days
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[100px]">
                      Off Days
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[80px]">
                      Shift
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[120px]">
                      Shift Start
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider min-w-[100px]">
                      Shift Switch
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider w-20">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-teal-900 uppercase tracking-wider w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadedData.map((row, index) => (
                    <tr
                      key={index}
                      className={`${
                        !row.isValid ? 'bg-red-50' : row.isSelected ? 'bg-teal-50' : 'bg-white'
                      } hover:bg-teal-100 transition-colors`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={row.isSelected}
                          onChange={() => toggleRowSelection(index)}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Fname}
                          onChange={(e) => updateRowField(index, 'Fname', e.target.value)}
                          className="min-w-[120px] text-sm"
                          error={row.errors.some((e) => e.includes('Fname')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Lname}
                          onChange={(e) => updateRowField(index, 'Lname', e.target.value)}
                          className="min-w-[120px] text-sm"
                          error={row.errors.some((e) => e.includes('Lname')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Email}
                          onChange={(e) => updateRowField(index, 'Email', e.target.value.toLowerCase())}
                          className="min-w-[200px] text-sm"
                          error={row.errors.some((e) => e.includes('email') || e.includes('Email')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row['Mobile Number']}
                          onChange={(e) => updateRowField(index, 'Mobile Number', e.target.value)}
                          className="min-w-[140px] text-sm"
                          error={row.errors.some((e) => e.includes('Mobile Number')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Title}
                          onChange={(e) => updateRowField(index, 'Title', e.target.value)}
                          className="min-w-[100px] text-sm"
                          error={row.errors.some((e) => e.includes('Title')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Designation}
                          onChange={(e) => updateRowField(index, 'Designation', e.target.value)}
                          className="min-w-[150px] text-sm"
                          error={row.errors.some((e) => e.includes('Designation')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={row['Department ID']}
                          onChange={(value) => updateRowField(index, 'Department ID', value)}
                          options={[
                            { value: '', label: 'Select Department' },
                            ...departments.map((dept) => ({
                              value: dept['Department ID'],
                              label: dept['Department Name'],
                            })),
                          ]}
                          className="min-w-[150px] text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.Region}
                          onChange={(e) => updateRowField(index, 'Region', e.target.value)}
                          className="min-w-[100px] text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={row['Active Days']}
                          onChange={(e) => updateRowField(index, 'Active Days', parseInt(e.target.value, 10) || 0)}
                          className="min-w-[100px] text-sm"
                          min="0"
                          max="7"
                          error={row.errors.some((e) => e.includes('Active Days')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={row['Off Days']}
                          onChange={(e) => updateRowField(index, 'Off Days', parseInt(e.target.value, 10) || 0)}
                          className="min-w-[100px] text-sm"
                          min="0"
                          max="7"
                          error={row.errors.some((e) => e.includes('Off Days')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={row.Shift}
                          onChange={(e) => updateRowField(index, 'Shift', parseInt(e.target.value, 10) || 1)}
                          className="min-w-[80px] text-sm"
                          min="1"
                          max="3"
                          error={row.errors.some((e) => e.includes('Shift')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="date"
                          value={
                            row['Shift Start'] instanceof Date
                              ? row['Shift Start'].toISOString().split('T')[0]
                              : typeof row['Shift Start'] === 'string'
                              ? row['Shift Start'].split('T')[0]
                              : new Date().toISOString().split('T')[0]
                          }
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            updateRowField(index, 'Shift Start', date);
                          }}
                          className="min-w-[120px] text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={row['Shift Switch']}
                          onChange={(e) => updateRowField(index, 'Shift Switch', parseInt(e.target.value, 10) || 0)}
                          className="min-w-[100px] text-sm"
                          min="0"
                          error={row.errors.some((e) => e.includes('Shift Switch')) ? '' : undefined}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.isValid ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="relative group">
                            <XCircle className="w-5 h-5 text-red-500 cursor-help" />
                            <div className="absolute left-0 top-6 hidden group-hover:block z-20 bg-red-50 border border-red-200 rounded p-2 shadow-lg min-w-[200px]">
                              <p className="text-xs font-semibold text-red-900 mb-1">Errors:</p>
                              <ul className="text-xs text-red-700 space-y-1">
                                {row.errors.map((error, errIdx) => (
                                  <li key={errIdx}>• {error}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => removeRow(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Results */}
            {importResults && (
              <div className={`p-4 rounded-lg border ${
                importResults.failed === 0
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h4 className="font-semibold mb-2">
                  Import Results: {importResults.success} succeeded, {importResults.failed} failed
                </h4>
                {importResults.errors.length > 0 && (
                  <ul className="text-sm space-y-1 mt-2">
                    {importResults.errors.map((error, idx) => (
                      <li key={idx} className="text-red-700">• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkImport}
                disabled={validSelectedCount === 0 || isImporting}
                isLoading={isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${validSelectedCount} Doctor(s)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkUploadDoctors;

