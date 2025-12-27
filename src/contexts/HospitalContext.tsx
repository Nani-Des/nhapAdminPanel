import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Hospital,
  Department,
  Users,
  MedicalRecord,
  Service,
  Referral,
  Notification,
  Metrics,
} from '../types';
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  Timestamp,
  documentId,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface HospitalContextType {
  hospital: Hospital | null;
  departments: Department[];
  users: Users[];
  medicalRecords: MedicalRecord[];
  services: Service[];
  referrals: Referral[];
  notifications: Notification[];
  metrics: Metrics | null;
  addDepartment: (data: string | Department) => Promise<void>;
  updateDepartment: (department: Department) => Promise<void>;
  deleteDepartment: (departmentId: string) => Promise<void>;
  addUser: (user: Omit<Users, 'id'>, authUid: string) => Promise<string | undefined>;
  updateUser: (user: Users) => Promise<void>;
  toggleUserStatus: (userId: string) => Promise<void>;
  // addMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'hospitalId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  // updateMedicalRecord: (record: MedicalRecord) => Promise<void>;
  // updateReferralStatus: (referralId: string, status: 'accepted' | 'declined') => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  setSelectedHospitalId?: (hospitalId: string) => void; // For main_admin to switch hospitals
  loading: boolean;
  error: string | null;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

export const HospitalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentAdmin } = useAuth();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalDepartments, setHospitalDepartments] = useState<Department[]>([]);
  const [hospitalUsers, setHospitalUsers] = useState<Users[]>([]);
  const [hospitalRecords, setHospitalRecords] = useState<MedicalRecord[]>([]);
  const [hospitalServices, setHospitalServices] = useState<Service[]>([]);
  const [hospitalReferrals, setHospitalReferrals] = useState<Referral[]>([]);
  const [hospitalNotifications, setHospitalNotifications] = useState<Notification[]>([]);
  const [hospitalMetrics, setHospitalMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHospitalId, setSelectedHospitalIdState] = useState<string | null>(null);

  // Function to set selected hospital ID (for main_admin)
  const setSelectedHospitalId = (hospitalId: string) => {
    setSelectedHospitalIdState(hospitalId);
  };

  // 1. Fetch hospital + general collections
  useEffect(() => {
      if (!currentAdmin) {
        setLoading(true);
        return;
      }
    
    // For main_admin, use selectedHospitalId if set, otherwise show selection page
    // For other roles, use currentAdmin.hospitalId
    let hospitalId: string | undefined;
    
    if (currentAdmin.baseRole === 'main_admin') {
      hospitalId = selectedHospitalId || undefined;
      // If main_admin but no hospital selected, don't load hospital data
      if (!selectedHospitalId) {
        setHospital(null);
        setHospitalDepartments([]);
        setHospitalUsers([]);
        setHospitalRecords([]);
        setHospitalServices([]);
        setHospitalReferrals([]);
        setHospitalNotifications([]);
        setHospitalMetrics(null);
        setLoading(false);
        return;
      }
    } else {
      hospitalId = currentAdmin.hospitalId;
    }

    if (!hospitalId) {
      console.warn('Admin has no hospitalId');
      setLoading(false);
      setHospital(null);
      setHospitalDepartments([]);
      setHospitalUsers([]);
      setHospitalRecords([]);
      setHospitalServices([]);
      setHospitalReferrals([]);
      setHospitalNotifications([]);
      setHospitalMetrics(null);
      setLoading(false);
      return;
    }
    console.log('Fetching hospital:', hospitalId);

    const unsubHospital = onSnapshot(
      doc(db, 'Hospital', hospitalId),
      (docSnap) => {
        if (docSnap.exists()) {
          setHospital({ id: docSnap.id, ...docSnap.data() } as Hospital);
          setError(null);
        } else {
          console.warn('Hospital not found:', hospitalId);
          setHospital(null);
          setError('Hospital not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Hospital fetch error:', err);
        setError('Failed to load hospital');
        setLoading(false);
      }
    );

    const fetchCollection = (colName: string, setter: Function, filters: any[] = []) => {
      const colRef = collection(db, colName);
      const q = filters.length > 0 ? query(colRef, ...filters) : query(colRef);
      return onSnapshot(
        q,
        (querySnap) => {
          const items = querySnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setter(items);
        },
        (err) => {
          console.error(`${colName} fetch error:`, err);
          setError(`Failed to load ${colName.toLowerCase()}`);
        }
      );
    };

    const hospitalFilter = where('Hospital ID', '==', hospitalId);

    const unsubUsers = fetchCollection('Users', setHospitalUsers, [hospitalFilter, where('Role', '==', true)]);
    const unsubRecords = fetchCollection('medicalRecords', setHospitalRecords, [hospitalFilter]);
    const unsubServices = fetchCollection('Services', setHospitalServices, [hospitalFilter]);
    const unsubReferrals = fetchCollection('Referrals', setHospitalReferrals, [hospitalFilter]);
    const unsubNotifications = fetchCollection('notifications', setHospitalNotifications, [hospitalFilter]);

    return () => {
      unsubHospital();
      unsubUsers();
      unsubRecords();
      unsubServices();
      unsubReferrals();
      unsubNotifications();
    };
  }, [currentAdmin, selectedHospitalId]);

  // 2. Fetch departments after hospital is loaded
  useEffect(() => {
    if (!hospital) {
      setHospitalDepartments([]);
      return;
    }

    // Validate departmentIds
    const departmentIds = (hospital['Hospital Department'] || [])
      .filter((id: any) => typeof id === 'string')
      .map((id: string) => id);
    console.log('Department IDs:', departmentIds);

    if (!departmentIds.length) {
      console.log('No department IDs found');
      setHospitalDepartments([]);
      return;
    }

    const fetchCollectionWithChunks = (colName: string, setter: Function, ids: string[]) => {
      const colRef = collection(db, colName);
      const chunks: string[][] = [];
      const unsubscribers: (() => void)[] = [];

      for (let i = 0; i < ids.length; i += 10) {
        chunks.push(ids.slice(i, i + 10));
      }

      chunks.forEach((chunk) => {
        const q = query(colRef, where(documentId(), 'in', chunk));
        const unsub = onSnapshot(
          q,
          (querySnap) => {
            const chunkItems = querySnap.docs.map((doc) => ({
              id: doc.id,
              'Department ID': doc.id,
              'Department Name': doc.data()['Department Name'] || '',
            }));
            setter((prev: Department[]) => {
              const filtered = prev.filter((d) => !chunk.includes(d.id));
              return [...filtered, ...chunkItems];
            });
          },
          (err) => {
            console.error('Department fetch error:', err);
            setError('Failed to load departments');
          }
        );
        unsubscribers.push(unsub);
      });

      return () => unsubscribers.forEach((unsub) => unsub());
    };

    setHospitalDepartments([]); // Clear state
    const unsubDepartments = fetchCollectionWithChunks('Department', setHospitalDepartments, departmentIds);

    return () => {
      if (unsubDepartments) unsubDepartments();
    };
  }, [hospital]);

  // Department functions
  const addDepartment = async (data: string | Department) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot add department: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    const hospitalRef = doc(db, 'Hospital', hospital.id);

    try {
      if (typeof data === 'string') {
        // Existing department: add Department ID to Hospital Department
        console.log('Adding existing department ID:', data);
        const deptRef = doc(db, 'Department', data);
        const deptSnap = await getDoc(deptRef);
        if (!deptSnap.exists()) {
          throw new Error(`Department ${data} does not exist`);
        }
        await updateDoc(hospitalRef, {
          'Hospital Department': arrayUnion(data),
        });
        // Update local state
        setHospitalDepartments((prev) => {
          if (prev.some((d) => d['Department ID'] === data)) return prev;
          return [
            ...prev,
            {
              id: data,
              'Department ID': data,
              'Department Name': deptSnap.data()['Department Name'] || '',
            },
          ];
        });
      } else {
        // New department: create in Department collection and add to hospital
        console.log('Adding new department:', data);
        const deptRef = doc(db, 'Department', data['Department ID']);
        const deptSnap = await getDoc(deptRef);
        if (!deptSnap.exists()) {
          await setDoc(deptRef, {
            'Department ID': data['Department ID'],
            'Department Name': data['Department Name'],
          });
        }
        await updateDoc(hospitalRef, {
          'Hospital Department': arrayUnion(data['Department ID']),
        });
        // Update local state
        setHospitalDepartments((prev) => {
          if (prev.some((d) => d['Department ID'] === data['Department ID'])) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error('Add department error:', err);
      throw err;
    }
  };

  const updateDepartment = async (department: Department) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot update department: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    console.log('Updating department:', department);
    try {
      const deptRef = doc(db, 'Department', department['Department ID']);
      await setDoc(deptRef, {
        'Department ID': department['Department ID'],
        'Department Name': department['Department Name'],
      });

      setHospitalDepartments((prev) =>
        prev.map((d) => (d['Department ID'] === department['Department ID'] ? department : d))
      );
    } catch (err) {
      console.error('Update department error:', err);
      throw err;
    }
  };

  const deleteDepartment = async (departmentId: string) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot delete department: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    console.log('Deleting department:', departmentId);
    try {
      const hospitalRef = doc(db, 'Hospital', hospital.id);
      await updateDoc(hospitalRef, {
        'Hospital Department': arrayRemove(departmentId),
      });

      setHospitalDepartments((prev) => prev.filter((d) => d['Department ID'] !== departmentId));
    } catch (err) {
      console.error('Delete department error:', err);
      throw err;
    }
  };

  // User functions
const addUser = async (user: Omit<Users, 'id'>, authUid: string): Promise<string | undefined> => {
  if (!currentAdmin || !hospital) {
    console.warn('Cannot add user: no admin or hospital');
    return;
  }

  console.log('Adding user:', user);
  try {
    const userData = {
      ...user,
      // id: authUid, // Use auth UID as document ID
      'Hospital ID': hospital.id,
      CreatedAt: Timestamp.fromDate(new Date()),
    };

    // Use setDoc with explicit document ID instead of addDoc
    const userRef = doc(db, 'Users', authUid);
    await setDoc(userRef, userData);

    const newUser: Users = {
      id: authUid, // Use auth UID as document ID
      ...userData,
    };
    setHospitalUsers((prev) => [...prev, newUser]);
    return authUid;
  } catch (err) {
    console.error('Add user error:', err);
    throw err;
  }
};

  const updateUser = async (user: Users) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot update user: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    console.log('Updating user:', user);
    try {
      const { id, ...userData } = user;
      const userRef = doc(db, 'Users', id);
      await updateDoc(userRef, userData);

      setHospitalUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...userData } : u)));
    } catch (err) {
      console.error('Update user error:', err);
      throw err;
    }
  };

  const toggleUserStatus = async (userId: string) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot toggle user status: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    console.log('Toggling user status:', userId);
    try {
      const userRef = doc(db, 'Users', userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        console.warn('User not found:', userId);
        return;
      }

      const currentStatus = snap.data().status;
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      await updateDoc(userRef, { status: newStatus });

      setHospitalUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error('Toggle user status error:', err);
      throw err;
    }
  };

  // // Medical record functions
  // const addMedicalRecord = async (
  //   record: Omit<MedicalRecord, 'id' | 'hospitalId' | 'createdAt' | 'updatedAt'>
  // ) => {
  //   if (!currentAdmin || !hospital) {
  //     console.warn('Cannot add medical record: no admin or hospital');
  //     throw new Error('Not authenticated or hospital not loaded');
  //   }

  //   console.log('Adding medical record:', record);
  //   try {
  //     const now = Timestamp.fromDate(new Date());
  //     const newRecord: MedicalRecord = {
  //       id: crypto.randomUUID(),
  //       hospitalId: hospital.id,
  //       createdAt: now,
  //       updatedAt: now,
  //       ...record,
  //     };

  //     const recordRef = doc(db, 'medicalRecords', newRecord.id);
  //     await setDoc(recordRef, newRecord);
  //     setHospitalRecords((prev) => [...prev, newRecord]);
  //   } catch (err) {
  //     console.error('Add medical record error:', err);
  //     throw err;
  //   }
  // };

  // const updateMedicalRecord = async (record: MedicalRecord) => {
  //   if (!currentAdmin || !hospital) {
  //     console.warn('Cannot update medical record: no admin or hospital');
  //     throw new Error('Not authenticated or hospital not loaded');
  //   }

  //   console.log('Updating medical record:', record);
  //   try {
  //     const updated = {
  //       ...record,
  //       updatedAt: Timestamp.fromDate(new Date()),
  //     };

  //     const recordRef = doc(db, 'medicalRecords', record.id);
  //     await setDoc(recordRef, updated);

  //     setHospitalRecords((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
  //   } catch (err) {
  //     console.error('Update medical record error:', err);
  //     throw err;
  //   }
  // };

  // // Referral functions
  // const updateReferralStatus = async (referralId: string, status: 'accepted' | 'declined') => {
  //   if (!currentAdmin || !hospital) {
  //     console.warn('Cannot update referral status: no admin or hospital');
  //     throw new Error('Not authenticated or hospital not loaded');
  //   }

  //   console.log('Updating referral status:', { referralId, status });
  //   try {
  //     const referralRef = doc(db, 'Referrals', referralId);
  //     const snap = await getDoc(referralRef);
  //     if (!snap.exists()) {
  //       console.warn('Referral not found:', referralId);
  //       return;
  //     }

  //     const updatedData = {
  //       status,
  //       treatmentGiven: status === 'declined' ? 'Service declined' : snap.data().treatmentGiven,
  //     };

  //     await updateDoc(referralRef, updatedData);

  //     setHospitalReferrals((prev) =>
  //       prev.map((r) => (r.id === referralId ? { ...r, ...updatedData } : r))
  //     );
  //   } catch (err) {
  //     console.error('Update referral status error:', err);
  //     throw err;
  //   }
  // };

  // Notification functions
  const markNotificationAsRead = async (notificationId: string) => {
    if (!currentAdmin || !hospital) {
      console.warn('Cannot mark notification as read: no admin or hospital');
      throw new Error('Not authenticated or hospital not loaded');
    }

    console.log('Marking notification as read:', notificationId);
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });

      setHospitalNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Mark notification as read error:', err);
      throw err;
    }
  };

  return (
    <HospitalContext.Provider
      value={{
        hospital,
        departments: hospitalDepartments,
        users: hospitalUsers,
        medicalRecords: hospitalRecords,
        services: hospitalServices,
        referrals: hospitalReferrals,
        notifications: hospitalNotifications,
        metrics: hospitalMetrics,
        setSelectedHospitalId,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addUser,
        updateUser,
        toggleUserStatus,
        // addMedicalRecord,
        // updateMedicalRecord,
        // updateReferralStatus,
        markNotificationAsRead,
        loading,
        error,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = (): HospitalContextType => {
  const context = useContext(HospitalContext);
  if (context === undefined) {
    throw new Error('useHospital must be used within a HospitalProvider');
  }
  return context;
};