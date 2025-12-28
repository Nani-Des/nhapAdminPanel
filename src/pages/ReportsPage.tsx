import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Users, Building2, Filter } from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Users as UserType, Referral, Department } from '../types';
import { toast } from 'react-hot-toast';

// Report types
type ReportType = 'staff' | 'patients' | 'referrals' | 'departments' | 'summary';

interface ReportFilters {
  startDate: string;
  endDate: string;
  departmentId: string;
  status: string;
  reportType: ReportType;
}

// Skeleton Components
const ReportCardSkeleton = () => (
  <div className="bg-teal-100 p-6 rounded-lg shadow-md border-2 border-teal-200 animate-pulse">
    <div className="h-6 w-48 bg-teal-200 rounded mb-4"></div>
    <div className="h-4 w-32 bg-teal-200 rounded"></div>
  </div>
);

const ReportsPage: React.FC = () => {
  const { hospital, users, departments, referrals } = useHospital();
  const { currentAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('summary');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    departmentId: '',
    status: '',
    reportType: 'summary',
  });
  const [allReferrals, setAllReferrals] = useState<Referral[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);

  // Fetch all referrals
  useEffect(() => {
    if (!hospital?.id) {
      setLoading(false);
      return;
    }

    const referralRef = collection(db, 'Hospital', hospital.id, 'Referrals');
    const unsub = onSnapshot(
      referralRef,
      (snapshot) => {
        const fetchedReferrals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          'Serial Number': doc.id,
        })) as Referral[];
        setAllReferrals(fetchedReferrals);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching referrals:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hospital?.id]);

  // Fetch all users
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Users'),
      (snapshot) => {
        const fetchedUsers = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as UserType[];
        // Filter by hospital
        const hospitalUsers = fetchedUsers.filter(
          (u) => u['Hospital ID'] === hospital?.id
        );
        setAllUsers(hospitalUsers);
      },
      (error) => {
        console.error('Error fetching users:', error);
      }
    );

    return () => unsub();
  }, [hospital?.id]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    let data: any[] = [];

    switch (selectedReportType) {
      case 'staff':
        data = allUsers.filter((user) => {
          if (filters.departmentId && user['Department ID'] !== filters.departmentId) {
            return false;
          }
          if (filters.status !== '') {
            const statusFilter = filters.status === 'active';
            if (user.Status !== statusFilter) return false;
          }
          if (filters.startDate && user.CreatedAt) {
            const userDate = user.CreatedAt.toDate();
            const startDate = new Date(filters.startDate);
            if (userDate < startDate) return false;
          }
          if (filters.endDate && user.CreatedAt) {
            const userDate = user.CreatedAt.toDate();
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (userDate > endDate) return false;
          }
          return true;
        });
        break;

      case 'patients':
      case 'referrals':
        data = allReferrals.filter((referral) => {
          // Note: Referrals might not have CreatedAt, adjust based on your data structure
          return true; // Add filtering logic based on referral fields
        });
        break;

      case 'departments':
        data = departments;
        break;

      case 'summary':
        // Summary combines multiple data sources
        data = [
          {
            type: 'Total Staff',
            count: allUsers.length,
            active: allUsers.filter((u) => u.Status).length,
            inactive: allUsers.filter((u) => !u.Status).length,
          },
          {
            type: 'Total Referrals',
            count: allReferrals.length,
          },
          {
            type: 'Total Departments',
            count: departments.length,
          },
        ];
        break;
    }

    return data;
  }, [selectedReportType, filters, allUsers, allReferrals, departments]);

  // Generate PDF report
  const generatePDF = () => {
    setGenerating(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to generate PDF');
        setGenerating(false);
        return;
      }

      const reportTitle = getReportTitle();
      const reportContent = generateReportHTML();

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              @media print {
                @page { margin: 1cm; }
                body { margin: 0; }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #0f766e;
              }
              .header {
                border-bottom: 3px solid #0d9488;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #0d9488;
                margin: 0;
                font-size: 28px;
              }
              .header-info {
                margin-top: 10px;
                color: #666;
                font-size: 14px;
              }
              .report-meta {
                background: #f0fdfa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background: #0d9488;
                color: white;
                padding: 12px;
                text-align: left;
                font-weight: 600;
              }
              td {
                padding: 10px 12px;
                border-bottom: 1px solid #e0e7ff;
              }
              tr:nth-child(even) {
                background: #f0fdfa;
              }
              .summary-card {
                background: #f0fdfa;
                border: 2px solid #0d9488;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
              }
              .summary-card h3 {
                margin-top: 0;
                color: #0d9488;
              }
              .stat {
                display: inline-block;
                margin-right: 30px;
                margin-top: 10px;
              }
              .stat-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
              }
              .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #0d9488;
              }
            </style>
          </head>
          <body>
            ${reportContent}
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const getReportTitle = (): string => {
    const titles: Record<ReportType, string> = {
      staff: 'Staff Report',
      patients: 'Patients Report',
      referrals: 'Referrals Report',
      departments: 'Departments Report',
      summary: 'Hospital Summary Report',
    };
    return titles[selectedReportType];
  };

  const generateReportHTML = (): string => {
    const hospitalName = hospital?.['Hospital Name'] || 'Hospital';
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let content = `
      <div class="header">
        <h1>${getReportTitle()}</h1>
        <div class="header-info">
          <strong>${hospitalName}</strong><br>
          Generated on: ${reportDate}<br>
          Generated by: ${currentAdmin?.name || 'Admin'}
        </div>
      </div>
      <div class="report-meta">
        <strong>Report Period:</strong> 
        ${filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'All Time'} - 
        ${filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'Present'}
        ${filters.departmentId ? `<br><strong>Department:</strong> ${departments.find(d => d.id === filters.departmentId)?.['Department Name'] || 'All'}` : ''}
        ${filters.status !== '' ? `<br><strong>Status:</strong> ${filters.status === 'active' ? 'Active' : 'Inactive'}` : ''}
      </div>
    `;

    switch (selectedReportType) {
      case 'staff':
        content += generateStaffReportHTML();
        break;
      case 'patients':
      case 'referrals':
        content += generateReferralsReportHTML();
        break;
      case 'departments':
        content += generateDepartmentsReportHTML();
        break;
      case 'summary':
        content += generateSummaryReportHTML();
        break;
    }

    return content;
  };

  const generateStaffReportHTML = (): string => {
    const staffData = filteredData as UserType[];
    const deptMap = new Map(departments.map(d => [d.id, d['Department Name']]));

    return `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Title</th>
            <th>Email</th>
            <th>Designation</th>
            <th>Department</th>
            <th>Mobile</th>
            <th>Region</th>
            <th>Status</th>
            <th>Date Added</th>
          </tr>
        </thead>
        <tbody>
          ${staffData.map((user) => `
            <tr>
              <td>${user.Title} ${user.Fname} ${user.Lname}</td>
              <td>${user.Title}</td>
              <td>${user.Email}</td>
              <td>${user.Designation}</td>
              <td>${deptMap.get(user['Department ID']) || 'N/A'}</td>
              <td>${user['Mobile Number']}</td>
              <td>${user.Region}</td>
              <td>${user.Status ? 'Active' : 'Inactive'}</td>
              <td>${user.CreatedAt ? user.CreatedAt.toDate().toLocaleDateString() : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #f0fdfa; border-radius: 8px;">
        <strong>Total Staff Members:</strong> ${staffData.length}<br>
        <strong>Active:</strong> ${staffData.filter(u => u.Status).length} | 
        <strong>Inactive:</strong> ${staffData.filter(u => !u.Status).length}
      </div>
    `;
  };

  const generateReferralsReportHTML = (): string => {
    const referralsData = filteredData as Referral[];
    const userMap = new Map(allUsers.map(u => [u.id, `${u.Fname} ${u.Lname}`]));

    return `
      <table>
        <thead>
          <tr>
            <th>Serial Number</th>
            <th>Patient Name</th>
            <th>Age</th>
            <th>Sex</th>
            <th>Date of Birth</th>
            <th>Reason for Referral</th>
            <th>Diagnosis</th>
            <th>Referred By</th>
            <th>Treatment Administered</th>
          </tr>
        </thead>
        <tbody>
          ${referralsData.map((referral) => `
            <tr>
              <td>${referral['Serial Number'] || referral.id}</td>
              <td>${referral['Name'] || 'N/A'}</td>
              <td>${referral['Age'] || 'N/A'}</td>
              <td>${referral['Sex'] || 'N/A'}</td>
              <td>${referral['Date of Birth'] || 'N/A'}</td>
              <td>${referral['Reason for Referral'] || 'N/A'}</td>
              <td>${referral['Diagnosis'] || 'N/A'}</td>
              <td>${referral['Referred By'] ? userMap.get(referral['Referred By']) || 'N/A' : 'N/A'}</td>
              <td>${referral['Treatment Administered'] || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #f0fdfa; border-radius: 8px;">
        <strong>Total Referrals:</strong> ${referralsData.length}
      </div>
    `;
  };

  const generateDepartmentsReportHTML = (): string => {
    const deptData = filteredData as Department[];

    return `
      <table>
        <thead>
          <tr>
            <th>Department ID</th>
            <th>Department Name</th>
          </tr>
        </thead>
        <tbody>
          ${deptData.map((dept) => `
            <tr>
              <td>${dept['Department ID'] || dept.id}</td>
              <td>${dept['Department Name']}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #f0fdfa; border-radius: 8px;">
        <strong>Total Departments:</strong> ${deptData.length}
      </div>
    `;
  };

  const generateSummaryReportHTML = (): string => {
    const summaryData = filteredData;
    const totalStaff = allUsers.length;
    const activeStaff = allUsers.filter(u => u.Status).length;
    const totalReferrals = allReferrals.length;
    const totalDepartments = departments.length;

    return `
      <div class="summary-card">
        <h3>Hospital Overview</h3>
        <div class="stat">
          <div class="stat-label">Total Staff</div>
          <div class="stat-value">${totalStaff}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Active Staff</div>
          <div class="stat-value">${activeStaff}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Total Referrals</div>
          <div class="stat-value">${totalReferrals}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Departments</div>
          <div class="stat-value">${totalDepartments}</div>
        </div>
      </div>
      
      <h3>Staff by Department</h3>
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Total Staff</th>
            <th>Active</th>
            <th>Inactive</th>
          </tr>
        </thead>
        <tbody>
          ${departments.map((dept) => {
            const deptStaff = allUsers.filter(u => u['Department ID'] === dept.id);
            return `
              <tr>
                <td>${dept['Department Name']}</td>
                <td>${deptStaff.length}</td>
                <td>${deptStaff.filter(u => u.Status).length}</td>
                <td>${deptStaff.filter(u => !u.Status).length}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      departmentId: '',
      status: '',
      reportType: selectedReportType,
    });
  };

  const applyFilters = () => {
    setIsFilterModalOpen(false);
    toast.success('Filters applied');
  };

  return (
    <Layout>
      <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">Reports</h1>
            <p className="mt-2 text-base text-teal-700">
              Generate comprehensive reports on staff and patient data
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center border-teal-200 text-teal-700 hover:bg-teal-100"
              variant="outline"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </Button>
            <Button
              onClick={generatePDF}
              disabled={generating || filteredData.length === 0}
              className="flex items-center bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Download className="w-5 h-5 mr-2" />
              {generating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-teal-900 mb-4">Select Report Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { type: 'summary' as ReportType, label: 'Summary', icon: <FileText className="w-6 h-6" /> },
              { type: 'staff' as ReportType, label: 'Staff', icon: <Users className="w-6 h-6" /> },
              { type: 'referrals' as ReportType, label: 'Referrals', icon: <FileText className="w-6 h-6" /> },
              { type: 'patients' as ReportType, label: 'Patients', icon: <Users className="w-6 h-6" /> },
              { type: 'departments' as ReportType, label: 'Departments', icon: <Building2 className="w-6 h-6" /> },
            ].map((report) => (
              <button
                key={report.type}
                onClick={() => {
                  setSelectedReportType(report.type);
                  setFilters(prev => ({ ...prev, reportType: report.type }));
                }}
                className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                  selectedReportType === report.type
                    ? 'border-teal-600 bg-teal-100 text-teal-900'
                    : 'border-teal-200 bg-white text-teal-700 hover:bg-teal-50 hover:border-teal-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`${selectedReportType === report.type ? 'text-teal-600' : 'text-teal-500'}`}>
                    {report.icon}
                  </div>
                  <span className="font-semibold">{report.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Report Preview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-teal-900">
              {getReportTitle()} Preview
            </h2>
            <span className="text-sm text-teal-600">
              {filteredData.length} {selectedReportType === 'staff' ? 'staff members' : selectedReportType === 'referrals' ? 'referrals' : selectedReportType === 'departments' ? 'departments' : 'items'}
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              <ReportCardSkeleton />
              <ReportCardSkeleton />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-teal-600 text-lg">No data available for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {selectedReportType === 'summary' ? (
                <div className="space-y-4">
                  {(filteredData as any[]).map((item, index) => (
                    <div key={index} className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                      <h3 className="font-semibold text-teal-900 mb-2">{item.type}</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm text-teal-600">Total:</span>
                          <span className="ml-2 font-semibold text-teal-900">{item.count}</span>
                        </div>
                        {item.active !== undefined && (
                          <>
                            <div>
                              <span className="text-sm text-teal-600">Active:</span>
                              <span className="ml-2 font-semibold text-green-600">{item.active}</span>
                            </div>
                            <div>
                              <span className="text-sm text-teal-600">Inactive:</span>
                              <span className="ml-2 font-semibold text-red-600">{item.inactive}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedReportType === 'staff' ? (
                <table className="min-w-full">
                  <thead className="bg-teal-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Designation</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Department</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData as UserType[]).map((user) => (
                      <tr key={user.id} className="border-b border-teal-100 hover:bg-teal-50">
                        <td className="px-4 py-3 text-sm text-teal-900">
                          {user.Title} {user.Fname} {user.Lname}
                        </td>
                        <td className="px-4 py-3 text-sm text-teal-700">{user.Email}</td>
                        <td className="px-4 py-3 text-sm text-teal-700">{user.Designation}</td>
                        <td className="px-4 py-3 text-sm text-teal-700">
                          {departments.find(d => d.id === user['Department ID'])?.['Department Name'] || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            user.Status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.Status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedReportType === 'referrals' || selectedReportType === 'patients' ? (
                <table className="min-w-full">
                  <thead className="bg-teal-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Serial Number</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Patient Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Age</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Sex</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Diagnosis</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Referred By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData as Referral[]).map((referral) => {
                      const referringDoctor = allUsers.find(u => u.id === referral['Referred By']);
                      return (
                        <tr key={referral.id} className="border-b border-teal-100 hover:bg-teal-50">
                          <td className="px-4 py-3 text-sm text-teal-900">{referral['Serial Number'] || referral.id}</td>
                          <td className="px-4 py-3 text-sm text-teal-900">{referral['Name'] || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-teal-700">{referral['Age'] || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-teal-700">{referral['Sex'] || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-teal-700">{referral['Diagnosis'] || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-teal-700">
                            {referringDoctor ? `${referringDoctor.Fname} ${referringDoctor.Lname}` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-teal-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Department ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-teal-900">Department Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredData as Department[]).map((dept) => (
                      <tr key={dept.id} className="border-b border-teal-100 hover:bg-teal-50">
                        <td className="px-4 py-3 text-sm text-teal-900">{dept['Department ID'] || dept.id}</td>
                        <td className="px-4 py-3 text-sm text-teal-900">{dept['Department Name']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Filter Modal */}
        <Modal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          title="Filter Report"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
              <Input
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>

            {selectedReportType === 'staff' && (
              <>
                <Select
                  label="Department"
                  value={filters.departmentId}
                  onChange={(value) => handleFilterChange('departmentId', value)}
                  options={[
                    { value: '', label: 'All Departments' },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept['Department Name'],
                    })),
                  ]}
                  className="bg-teal-50 border-teal-200 text-teal-900"
                />
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  className="bg-teal-50 border-teal-200 text-teal-900"
                />
              </>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                className="border-teal-200 text-teal-700 hover:bg-teal-100"
              >
                Reset
              </Button>
              <Button
                onClick={applyFilters}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ReportsPage;

