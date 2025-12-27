import React, { useEffect, useState } from 'react';
import {
  FileText,
  FolderPlus,
  CircleUser,
  FilePlus2,
  Users
} from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import ActionCard from '../components/dashboard/ActionCard';
import NotificationPreview from '../components/dashboard/NotificationPreview';
import { db, storage } from '../firebase';
import { collection, documentId, getCountFromServer, query, where } from 'firebase/firestore';
import { ref, listAll } from 'firebase/storage';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Skeleton Loading Components
const MetricSkeleton = () => (
  <div className="bg-teal-100 p-6 rounded-lg shadow-md border border-teal-200 animate-pulse">
    <div className="flex items-center mb-4">
      <div className="h-6 w-6 bg-teal-200 rounded-full"></div>
      <div className="ml-2 h-6 w-32 bg-teal-200 rounded"></div>
    </div>
    <div className="h-32 bg-teal-200 rounded"></div>
  </div>
);

const ActionHeaderSkeleton = () => (
    <div className="animate-pulse">
    <div className="h-8 w-32 bg-teal-200 rounded-lg mb-2"></div>
  </div>
)

const QuickActionSkeleton = () => (
  <div className="bg-teal-400 p-5 rounded-xl shadow-sm animate-pulse h-full">
    <div className="flex items-start">
      <div className="p-2 bg-teal-500/20 rounded-lg mr-4">
        <div className="h-6 w-6 bg-teal-500/50 rounded-full"></div>
      </div>
      <div className="flex-1">
        <div className="h-6 w-24 bg-teal-500/50 rounded mb-2"></div>
        <div className="h-4 w-32 bg-teal-500/30 rounded"></div>
      </div>
    </div>
  </div>
);

const WelcomeSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 w-64 bg-teal-200 rounded-lg mb-2"></div>
    <div className="h-4 w-80 bg-teal-200 rounded-md"></div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { hospital, notifications } = useHospital();
  const { currentAdmin } = useAuth();
  const [metrics, setMetrics] = useState({
    totalMedicalRecords: 0,
    totalDepartments: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  // Helper function to check if user has permission
  const hasPermission = (permissionKey: string): boolean => {
    if (!currentAdmin?.permissions) return false;
    
    // If permissions is an array of strings
    if (Array.isArray(currentAdmin.permissions)) {
      return currentAdmin.permissions.includes(permissionKey);
    }
    
    // If permissions is an object with boolean values
    if (typeof currentAdmin.permissions === 'object') {
      return currentAdmin.permissions[permissionKey] === true;
    }
    
    return false;
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const departmentIds = hospital?.['Hospital Department'];

        if (!hospital?.id || !departmentIds || departmentIds.length === 0) return;

        const countFilesInStorage = async (folderPath: string): Promise<number> => {
          const folderRef = ref(storage, folderPath);
          const list = await listAll(folderRef);
          return list.items.length;
        };

        const [fileCount, deptSnap, usersSnap] = await Promise.all([
          countFilesInStorage('referral_files'),
          getCountFromServer(
            query(collection(db, 'Department'), where(documentId(), 'in', departmentIds))
          ),
          getCountFromServer(
            query(collection(db, 'Users'), where('Role', '==', true), where('Hospital ID', '==', hospital.id))
          ),
        ]);

        setMetrics({
          totalMedicalRecords: fileCount,
          totalDepartments: deptSnap.data().count,
          totalUsers: usersSnap.data().count,
        });
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [hospital]);

  // Mock platform averages for comparison
  const platformAverages = {
    totalMedicalRecords: 75,
    totalDepartments: 15,
    totalUsers: 20,
  };

  // Chart options for bar charts (Medical Records, Departments)
  const barChartOptions = {
    indexAxis: 'y' as const,
    scales: {
      x: { beginAtZero: true, grid: { color: '#ccfbf1' } },
      y: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0f766e' },
    },
    maintainAspectRatio: false,
  };

  // Chart options for line graph (Doctors)
  const lineChartOptions = {
    scales: {
      x: { grid: { color: '#ccfbf1' } },
      y: { beginAtZero: true, grid: { color: '#ccfbf1' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#0f766e' },
    },
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4, borderWidth: 2 },
      point: { radius: 5, hoverRadius: 7 },
    },
  };

  // Chart data for Medical Records (Bar)
  const medicalRecordsData = {
    labels: ['Your Hospital', 'Platform Average'],
    datasets: [
      {
        label: 'Medical Records',
        data: [metrics.totalMedicalRecords, platformAverages.totalMedicalRecords],
        backgroundColor: ['#0d9488', '#6ee7b7'],
        borderColor: ['#0f766e', '#10b981'],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for Departments (Bar)
  const departmentsData = {
    labels: ['Your Hospital', 'Platform Average'],
    datasets: [
      {
        label: 'Departments',
        data: [metrics.totalDepartments, platformAverages.totalDepartments],
        backgroundColor: ['#0d9488', '#6ee7b7'],
        borderColor: ['#0f766e', '#10b981'],
        borderWidth: 1,
      },
    ],
  };

  // Chart data for Doctors (Line)
  const doctorsData = {
    labels: ['Your Hospital', 'Platform Average'],
    datasets: [
      {
        label: 'Doctors',
        data: [metrics.totalUsers, platformAverages.totalUsers],
        borderColor: '#0d9488',
        backgroundColor: '#0d9488',
        pointBackgroundColor: '#0d9488',
        pointBorderColor: '#0f766e',
        pointHoverBackgroundColor: '#10b981',
        fill: false,
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-8 bg-teal-50 p-6 rounded-lg">
        {/* Welcome section */}
        {loading ? (
          <WelcomeSkeleton />
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-teal-900">
              Welcome to {hospital?.['Hospital Name']} Admin Panel
            </h1>
            <p className="mt-2 text-base text-teal-700">
              Monitor and manage your hospital's operations with real-time insights.
            </p>
          </div>
        )}

        {/* Metrics section with charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {loading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <div className="bg-teal-100 p-6 rounded-lg shadow-md border border-teal-200">
                <div className="flex items-center mb-4">
                  <FileText className="h-6 w-6 text-teal-700" />
                  <h3 className="ml-2 text-lg font-semibold text-teal-900">Medical Records</h3>
                </div>
                <div className="h-32">
                  <Bar data={medicalRecordsData} options={barChartOptions} />
                </div>
              </div>
              <div className="bg-teal-100 p-6 rounded-lg shadow-md border border-teal-200">
                <div className="flex items-center mb-4">
                  <FolderPlus className="h-6 w-6 text-teal-700" />
                  <h3 className="ml-2 text-lg font-semibold text-teal-900">Departments</h3>
                </div>
                <div className="h-32">
                  <Bar data={departmentsData} options={barChartOptions} />
                </div>
              </div>
              <div className="bg-teal-100 p-6 rounded-lg shadow-md border border-teal-200">
                <div className="flex items-center mb-4">
                  <CircleUser className="h-6 w-6 text-teal-700" />
                  <h3 className="ml-2 text-lg font-semibold text-teal-900">Doctors</h3>
                </div>
                <div className="h-32">
                  <Line data={doctorsData} options={lineChartOptions} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick actions section */}
        <div>
                 {loading ? (
          <ActionHeaderSkeleton />
        ) : (
          <h2 className="text-xl font-semibold text-teal-900 mb-4">Quick Actions</h2>
        )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                <QuickActionSkeleton />
                <QuickActionSkeleton />
                <QuickActionSkeleton />
                <QuickActionSkeleton />
                <QuickActionSkeleton />
                <QuickActionSkeleton />
              </>
            ) : (
              <>
                {hasPermission('departments') && (
                  <ActionCard
                    title="Manage Departments"
                    description="Manage departments in your hospital"
                    icon={<FolderPlus className="h-6 w-6 text-white" />}
                    path="/departments"
                  />
                )}
                {hasPermission('shift_schedule') && (
                  <>
                    <ActionCard
                      title="Shift Schedule"
                      description="Manage doctor shift schedules"
                      icon={<Users className="h-6 w-6 text-white" />}
                      path="/shift-schedule"
                    />
                    <ActionCard
                      title="Shift Roster"
                      description="Manage department rosters"
                      icon={<Users className="h-6 w-6 text-white" />}
                      path="/shift-schedule"
                    />
                  </>
                )}
                {hasPermission('medical_records') && (
                  <ActionCard
                    title="View Medical Records"
                    description="Access patient medical records"
                    icon={<FileText className="h-6 w-6 text-white" />}
                    path="/medical-records"
                  />
                )}
                {hasPermission('doctors') && (
                  <ActionCard
                    title="Manage Doctors"
                    description="Manage doctor profiles"
                    icon={<CircleUser className="h-6 w-6 text-white" />}
                    path="/doctors"
                  />
                )}
                {hasPermission('services') && (
                  <ActionCard
                    title="Manage Services"
                    description="Mange hospital services"
                    icon={<FilePlus2 className="h-6 w-6 text-white" />}
                    path="/services"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Notifications preview */}
        {!loading && <NotificationPreview notifications={notifications} />}
      </div>
    </Layout>
  );
};

export default DashboardPage;