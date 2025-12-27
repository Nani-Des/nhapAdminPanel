import React, { useEffect, useState } from 'react';
import { Building2, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Hospital } from '../types';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import { useHospital } from '../contexts/HospitalContext';

// Skeleton Loading Component
const HospitalCardSkeleton = () => (
  <div className="bg-teal-100 p-6 rounded-lg shadow-md border-2 border-teal-200 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="h-12 w-12 rounded-lg bg-teal-200"></div>
      <div className="space-y-2 flex-1">
        <div className="h-5 w-48 bg-teal-200 rounded"></div>
        <div className="h-4 w-32 bg-teal-200 rounded"></div>
      </div>
    </div>
  </div>
);

const HospitalSelectionPage: React.FC = () => {
  const { currentAdmin } = useAuth();
  const { setSelectedHospitalId } = useHospital();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch all hospitals
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'Hospital'),
      (snapshot) => {
        const fetchedHospitals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Hospital[];
        setHospitals(fetchedHospitals);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching hospitals:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredHospitals = hospitals.filter((hospital) =>
    (hospital['Hospital Name'] || hospital.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hospital.Location || hospital.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleHospitalSelect = (hospitalId: string) => {
    // Set the selected hospital ID in context
    if (setSelectedHospitalId) {
      setSelectedHospitalId(hospitalId);
    }
    // Navigate to dashboard
    navigate('/');
  };

  return (
    <Layout>
      <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-teal-900">Select Hospital</h1>
          <p className="mt-2 text-base text-teal-700">
            Choose a hospital to manage as {currentAdmin?.baseRole === 'main_admin' ? 'Super Admin' : 'Admin'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-teal-50 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-teal-600" />
            <Input
              placeholder="Search hospitals by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-teal-100 border-teal-200 text-teal-900 placeholder-teal-600"
            />
          </div>
        </div>

        {/* Empty State */}
        {!loading && filteredHospitals.length === 0 && (
          <div className="text-center py-10">
            <p className="text-teal-600 text-lg">
              {searchTerm ? 'No hospitals found matching your search.' : 'No hospitals available.'}
            </p>
          </div>
        )}

        {/* Hospitals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <HospitalCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHospitals.map((hospital) => (
              <div
                key={hospital.id}
                onClick={() => handleHospitalSelect(hospital.id)}
                className="bg-teal-100 p-6 rounded-lg shadow-md border-2 border-teal-200 hover:bg-teal-200 hover:border-teal-400 cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center text-white font-semibold shadow-md">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-teal-900">
                      {hospital['Hospital Name'] || hospital.name || 'Unnamed Hospital'}
                    </h3>
                    <p className="text-sm text-teal-700">
                      {hospital.Location || hospital.address || 'No location'}
                    </p>
                  </div>
                </div>
                {hospital.email && (
                  <div className="mt-4 pt-4 border-t border-teal-200">
                    <p className="text-xs text-teal-600">{hospital.email}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HospitalSelectionPage;

