import React, { useEffect, useState } from 'react';
import { Plus, Edit, Calendar, Lock, UserX, UserCheck, X } from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { addDoc, collection, doc, getDocs, query, setDoc, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { storage } from '../firebase';
import { Schedule } from '../types';
import { toast } from 'react-hot-toast';
import { createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword, getAuth, deleteUser } from "firebase/auth";
import { auth } from "../firebase";

const DoctorsPage: React.FC = () => {
  const { users: contextUsers, departments, addUser, updateUser, hospital } = useHospital();
  const [users, setUsers] = useState(contextUsers);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userSchedules, setUserSchedules] = useState<Record<string, Schedule>>({});
  const [formStep, setFormStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    Fname: '',
    Lname: '',
    Email: '',
    'Mobile Number': '',
    'Hospital ID': hospital?.id ?? '',
    Title: '',
    Experience: '',
    'Department ID': '',
    Role: true,
    Status: true,
    Region: '',
    'User Pic': '',
  });
  const [scheduleData, setScheduleData] = useState({
    'Active Days': 0,
    'Off Days': 0,
    Shift: 0,
    'Shift Start': Timestamp.fromDate(new Date()),
    'Shift Switch': 0,
  });
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Set default Department ID when departments load or add modal opens
  useEffect(() => {
    if (departments.length > 0 && !formData['Department ID'] && isAddModalOpen) {
      setFormData((prev) => ({
        ...prev,
        'Department ID': departments[0]?.['Department ID'] || '',
      }));
    }
  }, [departments, isAddModalOpen]);

  // Fetch users, only those with matching Hospital ID
  useEffect(() => {
    if (!hospital?.id) {
      console.warn('No hospital ID available. Cannot fetch doctors.');
      setUsers([]);
      return;
    }

    const filterUsers = (users: any[]) =>
      users.filter((user) => user['Hospital ID'] === hospital.id);

    if (contextUsers.some((user) => user.Status === false && user['Hospital ID'] === hospital.id)) {
      setUsers(filterUsers(contextUsers));
    } else {
      console.warn('useHospital may be filtering users. Fetching directly from Firestore.');
      const unsub = onSnapshot(collection(db, 'Users'), (snapshot) => {
        const fetchedUsers = filterUsers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
        if (fetchedUsers.length === 0) {
          console.warn(`No users found with Hospital ID: ${hospital.id}`);
        }
        setUsers(fetchedUsers);
      }, (error) => {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch doctors');
      });
      return () => unsub();
    }
  }, [contextUsers, hospital?.id]);

  const filteredUsers = users.filter(
    (user) =>
      user['Hospital ID'] === hospital?.id &&
      (user.Fname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Lname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        departments
          .find((d) => d.id === user['Department ID'])
          ?.['Department Name'].toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const Title = ['Select a title', 'Dr.', 'Mr.', 'Mrs.', 'Miss.', 'Prof.'];
  const Region = [
    'Select a region','Western North', 'Western', 'Oti', 'Bono', 'Bono East', 'Ahafo', 'Greater Accra',
    'Eastern', 'Central', 'Northern', 'Savannah', 'North East', 'Volta', 'Upper East',
    'Upper West', 'Ashanti'
  ];

  useEffect(() => {
    async function fetchSchedules() {
      const newUserSchedules: Record<string, Schedule> = {};
      for (const user of users) {
        const scheduleCollectionRef = collection(db, 'Users', user.id, 'Schedule');
        const querySnapshot = await getDocs(scheduleCollectionRef);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data() as Schedule;
          newUserSchedules[user.id] = docData;
        }
      }
      setUserSchedules(newUserSchedules);
    }

    if (users.length > 0) {
      fetchSchedules();
    }
  }, [users]);

  // Handle image selection and preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a JPEG, PNG, or GIF image');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, 'User Pic': '' }));
  };

  // Upload image to Firebase Storage
  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!selectedImage || !hospital?.id) return null;

    try {
      const timestamp = Date.now();
      const fileName = `doctor_${timestamp}_${selectedImage.name}`;
      const storageRef = ref(storage, `${hospital.id}/doctors/${userId}/${fileName}`);
      await uploadBytes(storageRef, selectedImage);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (err) {
      console.error('Failed to upload image:', err);
      toast.error('Failed to upload image');
      return null;
    }
  };

  // Generate a random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

const handleDisableEnable = async (userId: string, enable: boolean) => {
  setIsLoading(true);
  try {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    await updateUser({
      ...user,
      Role: enable,
      Status: enable,
    });

    toast.success(`User ${user.Email} ${enable ? 'enabled' : 'disabled'}`);
  } catch (err) {
    console.error(`Failed to ${enable ? 'enable' : 'disable'} doctor:`, err);
    toast.error(`Failed to ${enable ? 'enable' : 'disable'} doctor`);
  } finally {
    setIsLoading(false);
  }
};

const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const user = users.find((u) => u.id === selectedUser);
    if (!user) return;

    // Get the auth user
    const authUser = await getAuth().currentUser;
    
    if (authUser) {
      await updatePassword(authUser, newPassword);
      toast.success(`Password reset for ${user.Email}`);
      setIsResetPasswordModalOpen(false);
      setNewPassword('');
    } else {
      throw new Error('User not authenticated');
    }
  } catch (err) {
    console.error('Failed to reset password:', err);
    toast.error('Failed to reset password');
  } finally {
    setIsLoading(false);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    if (!formData['Department ID']) {
      toast.error('Please select a department');
      return;
    }

    let userId: string | undefined;
    let imageUrl: string | null = formData['User Pic'];

    if (selectedUser) {
      // Existing update logic remains the same
      const user = users.find((u) => u.id === selectedUser);
      if (user) {
        if (selectedImage) {
          imageUrl = await uploadImage(selectedUser);
        }
        await updateUser({
          ...user,
          ...formData,
          'User Pic': imageUrl || user['User Pic'],
          Experience: parseInt(formData.Experience),
        });
        toast.success('Doctor updated successfully');
      }
      setIsEditModalOpen(false);
    } else {
      // New doctor creation - simplified auth
      const password = generateRandomPassword();
      
      // Create auth account directly
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.Email,
        password
      );
      
      // Update display name
      await updateProfile(userCredential.user, {
        displayName: `${formData.Fname} ${formData.Lname}`
      });

      const authUid = userCredential.user.uid;

      // Then create the Firestore user with the same ID
      const newUserId = await addUser({
        ...formData,
        Experience: parseInt(formData.Experience),
        Status: true,
        Role: true,
        CreatedAt: Timestamp.fromDate(new Date()),
        'Hospital ID': hospital?.id ?? '',
        'User ID': authUid,
      }, authUid);

      if (typeof newUserId === 'string' && newUserId) {
        userId = newUserId;
        if (selectedImage) {
          imageUrl = await uploadImage(newUserId);
        }
        const userRef = doc(db, 'Users', newUserId);
        await updateDoc(userRef, {
          'User ID': newUserId,
          'User Pic': imageUrl || '',
        });

        // Create schedule
const scheduleSubRef = doc(db, 'Users', newUserId, 'Schedule', newUserId);
await setDoc(scheduleSubRef, {
  'Active Days': scheduleData['Active Days'],
  'Off Days': scheduleData['Off Days'],
  Shift: scheduleData.Shift,
  'Shift Start': scheduleData['Shift Start'],
  'Shift Switch': scheduleData['Shift Switch'],
});


        toast.success('Doctor added successfully');
        
        // You can optionally show the password to the admin for them to share with the doctor
        toast.success(`Doctor password: ${password}`, { duration: 10000 });
      }
      setIsAddModalOpen(false);
    }
    resetForm();
  } catch (err) {
    console.error('Failed to save doctor:', err);
    toast.error('Failed to save doctor');
    
    // If we created the auth user but failed to create Firestore record,
    // we should delete the auth user to maintain consistency
    if (formData.Email && !selectedUser) {
      try {
        await deleteUser(auth.currentUser!);
      } catch (cleanupErr) {
        console.error('Failed to clean up auth account:', cleanupErr);
      }
    }
  } finally {
    setIsLoading(false);
  }
};

  const updateUserSchedule = async (userId: string, scheduleData: any) => {
    setIsLoading(true);
    try {
      const scheduleCollectionRef = collection(db, 'Users', userId, 'Schedule');
      const q = query(scheduleCollectionRef);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(scheduleCollectionRef, scheduleData);
      } else {
        const scheduleDocRef = doc(db, 'Users', userId, 'Schedule', userId);
        await setDoc(scheduleDocRef, scheduleData);
      }
      toast.success('Schedule updated successfully');
    } catch (err) {
      console.error('Failed to update schedule:', err);
      toast.error('Failed to update schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u) => u.id === selectedUser);
    if (!user) return;

    await updateUserSchedule(user.id, {
      'Active Days': scheduleData['Active Days'],
      'Off Days': scheduleData['Off Days'],
      Shift: scheduleData.Shift,
      'Shift Start': scheduleData['Shift Start'],
      'Shift Switch': scheduleData['Shift Switch'],
    });

    setIsScheduleModalOpen(false);
    resetSchedule();
  };

  const resetForm = () => {
    setFormData({
      Fname: '',
      Lname: '',
      Email: '',
      'Mobile Number': '',
      'Hospital ID': hospital?.id ?? '',
      Title: '',
      Experience: '',
      'Department ID': departments[0]?.['Department ID'] || '',
      Role: true,
      Status: true,
      Region: '',
      'User Pic': '',
    });
    setFormStep(1);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const resetSchedule = () => {
    setScheduleData({
      'Active Days': 0,
      'Off Days': 0,
      Shift: 0,
      'Shift Start': Timestamp.fromDate(new Date()),
      'Shift Switch': 0,
    });
  };

  const ScheduleForm = () => (
    <form onSubmit={handleScheduleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Active Days"
          value={scheduleData['Active Days']}
          onChange={(e) => setScheduleData({ ...scheduleData, 'Active Days': Number(e.target.value) })}
          min="0"
          required
          className="bg-teal-50 border-teal-200 text-teal-900"
        />
        <Input
          type="number"
          label="Off Days"
          value={scheduleData['Off Days']}
          onChange={(e) => setScheduleData({ ...scheduleData, 'Off Days': Number(e.target.value) })}
          min="0"
          required
          className="bg-teal-50 border-teal-200 text-teal-900"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="number"
          label="Number of Shifts"
          value={scheduleData.Shift}
          onChange={(e) => setScheduleData({ ...scheduleData, Shift: Number(e.target.value) })}
          max="3"
          required
          className="bg-teal-50 border-teal-200 text-teal-900"
        />
        <Input
          type="number"
          label="Shift Switch Frequency"
          value={scheduleData['Shift Switch']}
          onChange={(e) => setScheduleData({ ...scheduleData, 'Shift Switch': Number(e.target.value) })}
          min="0"
          required
          className="bg-teal-50 border-teal-200 text-teal-900"
        />
      </div>
      <Input
        label="Shift Start Date"
        type="date"
        value={scheduleData['Shift Start'].toDate().toISOString().split('T')[0]}
        onChange={(e) =>
          setScheduleData({
            ...scheduleData,
            'Shift Start': Timestamp.fromDate(new Date(e.target.value)),
          })
        }
        required
        className="bg-teal-50 border-teal-200 text-teal-900"
      />
      <Button
        type="submit"
        fullWidth
        disabled={isLoading}
        className="bg-teal-600 hover:bg-teal-700 text-white"
      >
        {isLoading ? 'Saving...' : 'Save Schedule'}
      </Button>
    </form>
  );

  return (
    <Layout>
      <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">Doctors</h1>
            <p className="mt-2 text-base text-teal-700">
              Manage your hospital’s doctors and their schedules
            </p>
          </div>
          <Button
            onClick={() => {
              setIsAddModalOpen(true);
              resetForm();
            }}
            className="flex items-center bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Doctor
          </Button>
        </div>

        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-teal-50 py-4">
          <Input
            placeholder="Search by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md bg-teal-100 border-teal-200 text-teal-900 placeholder-teal-600"
          />
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-10">
            <p className="text-teal-600 text-lg">
              {searchTerm ? 'No doctors found matching your search.' : 'No doctors available.'}
            </p>
          </div>
        )}

        {/* Doctor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`bg-teal-100 p-6 rounded-lg shadow-md border-2 ${
                user.Status ? 'border-teal-200' : 'border-red-400'
              } hover:bg-teal-100 transition-all duration-200 `}
            >
              <div className="flex items-center space-x-4">
                {user['User Pic'] ? (
                  <img
                  // src={user['User Pic']}
                    src={user['User Pic'] ? user['User Pic'].toString() : ''}
                    alt={`${user.Fname} ${user.Lname}`}
                    className="h-12 w-12 rounded-full object-cover shadow-md"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center text-white font-semibold shadow-md">
                    {user.Fname.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-teal-900">
                    {user.Title} {user.Fname} {user.Lname}
                  </h3>
                  <p className="text-sm text-teal-700">
                    {departments.find((d) => d.id === user['Department ID'])?.['Department Name'] || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-teal-800">
                  Experience: {user.Experience} years
                </p>
                <p className="text-sm text-teal-800">
                  Status: {user.Status ? 'Active' : 'Disabled'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user.id);
                      setScheduleData({
                        Shift: userSchedules[user.id]?.Shift || 0,
                        'Active Days': userSchedules[user.id]?.['Active Days'] || 0,
                        'Off Days': userSchedules[user.id]?.['Off Days'] || 0,
                        'Shift Start': userSchedules[user.id]?.['Shift Start'] || Timestamp.fromDate(new Date()),
                        'Shift Switch': userSchedules[user.id]?.['Shift Switch'] || 0,
                      });
                      setIsScheduleModalOpen(true);
                    }}
                    className="border-teal-200 text-teal-700 hover:bg-teal-300"
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user.id);
                      setFormData({
                        Fname: user.Fname,
                        Lname: user.Lname,
                        Email: user.Email,
                        'Mobile Number': user['Mobile Number'],
                        'Hospital ID': hospital?.id ?? '',
                        Title: user.Title,
                        Experience: user.Experience.toString(),
                        'Department ID': user['Department ID'],
                        Role: user.Role,
                        Status: user.Status,
                        Region: user.Region,
                        'User Pic': user['User Pic'] ? String(user['User Pic']) : '',
                        // 'User Pic': user['User Pic'] || '',
                      });
                      // setImagePreview(user['User Pic'] || null);
                      setImagePreview(user['User Pic'] ? String(user['User Pic']) : null);
                      setIsEditModalOpen(true);
                    }}
                    className="border-teal-200 text-teal-700 hover:bg-teal-300"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisableEnable(user.id, !user.Status)}
                    className={`border-teal-200 ${
                      user.Status ? 'text-red-600' : 'text-green-600'
                    } hover:bg-teal-300`}
                    disabled={isLoading}
                  >
                    {user.Status ? (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user.id);
                      setNewPassword(generateRandomPassword());
                      setIsResetPasswordModalOpen(true);
                    }}
                    className="border-teal-200 text-teal-700 hover:bg-teal-300"
                    disabled={isLoading}
                  >
                    <Lock className="w-4 h-4 mr-1" />
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Doctor Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            resetForm();
          }}
          title={formStep === 1 ? 'Add Doctor Details' : 'Set Schedule'}
          size="lg"
        >
          <div className="space-y-6">
            {formStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setFormStep(2); }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.Fname}
                    onChange={(e) => setFormData({ ...formData, Fname: e.target.value })}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                  <Input
                    label="Last Name"
                    value={formData.Lname}
                    onChange={(e) => setFormData({ ...formData, Lname: e.target.value })}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                  <Input
                    label="Mobile Number"
                    type="tel"
                    value={formData['Mobile Number']}
                    onChange={(e) => setFormData({ ...formData, 'Mobile Number': e.target.value })}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-teal-700 mb-2">Profile Picture</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-teal-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200"
                    />
                    {imagePreview && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={removeImage}
                        className="border-teal-200 text-red-600 hover:bg-teal-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {imagePreview && (
                    <div className="mt-4">
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="h-24 w-24 rounded-full object-cover shadow-md"
                      />
                    </div>
                  )}
                </div>
                <Input
                  label="Profile Picture URL (Optional)"
                  value={formData['User Pic']}
                  onChange={(e) => setFormData({ ...formData, 'User Pic': e.target.value })}
                  className="bg-teal-50 border-teal-200 text-teal-900"
                  placeholder="Enter URL if not uploading an image"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Title"
                    value={formData.Title}
                    onChange={(value) => setFormData({ ...formData, Title: value })}
                    options={Title.map((title) => ({ value: title, label: title }))}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                  <Input
                    label="Experience (years)"
                    type="number"
                    value={formData.Experience}
                    onChange={(e) => setFormData({ ...formData, Experience: e.target.value })}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Department"
                    value={formData['Department ID']}
                    onChange={(value) => {
                      console.log('Department selected:', value);
                      setFormData({ ...formData, 'Department ID': value });
                    }}
                    options={
                      departments.length > 0
                        ? departments.map((dept) => ({
                            value: dept['Department ID'] || dept.id,
                            label: dept['Department Name'],
                          }))
                        : [{ value: '', label: 'No departments available' }]
                    }
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                    disabled={departments.length === 0}
                  />
                  <Select
                    label="Region"
                    value={formData.Region}
                    onChange={(value) => setFormData({ ...formData, Region: value })}
                    options={Region.map((region) => ({ value: region, label: region }))}
                    required
                    className="bg-teal-50 border-teal-200 text-teal-900"
                  />
                </div>
                {departments.length === 0 && (
                  <p className="text-sm text-red-600">No departments available. Please add departments first.</p>
                )}
                <Button
                  type="submit"
                  fullWidth
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={departments.length === 0 || isLoading}
                >
                  Next: Schedule
                </Button>
              </form>
            )}
            {formStep === 2 && (
              <div className="space-y-6">
                <ScheduleForm />
                <div className="flex justify-between">
                  <Button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className="bg-teal-200 text-teal-900 hover:bg-teal-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Adding...' : 'Add Doctor'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* Edit Doctor Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedUser(null);
            resetForm();
          }}
          title="Edit Doctor"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.Fname}
                onChange={(e) => setFormData({ ...formData, Fname: e.target.value })}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
              <Input
                label="Last Name"
                value={formData.Lname}
                onChange={(e) => setFormData({ ...formData, Lname: e.target.value })}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
              <Input
                label="Mobile Number"
                type="tel"
                value={formData['Mobile Number']}
                onChange={(e) => setFormData({ ...formData, 'Mobile Number': e.target.value })}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-teal-700 mb-2">Profile Picture</label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-teal-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200"
                />
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                    className="border-teal-200 text-red-600 hover:bg-teal-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {imagePreview && (
                <div className="mt-4">
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="h-24 w-24 rounded-full object-cover shadow-md"
                  />
                </div>
              )}
            </div>
            <Input
              label="Profile Picture URL (Optional)"
              value={formData['User Pic']}
              onChange={(e) => setFormData({ ...formData, 'User Pic': e.target.value })}
              className="bg-teal-50 border-teal-200 text-teal-900"
              placeholder="Enter URL if not uploading an image"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Title"
                value={formData.Title}
                onChange={(value) => setFormData({ ...formData, Title: value })}
                options={Title.map((title) => ({ value: title, label: title }))}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
              <Input
                label="Experience (years)"
                type="number"
                value={formData.Experience}
                onChange={(e) => setFormData({ ...formData, Experience: e.target.value })}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Department"
                value={formData['Department ID']}
                onChange={(value) => {
                  console.log('Department selected:', value);
                  setFormData({ ...formData, 'Department ID': value });
                }}
                options={
                  departments.length > 0
                    ? departments.map((dept) => ({
                        value: dept['Department ID'] || dept.id,
                        label: dept['Department Name'],
                      }))
                    : [{ value: '', label: 'No departments available' }]
                }
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
                disabled={departments.length === 0}
              />
              <Select
                label="Region"
                value={formData.Region}
                onChange={(value) => setFormData({ ...formData, Region: value })}
                options={Region.map((region) => ({ value: region, label: region }))}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>
            {departments.length === 0 && (
              <p className="text-sm text-red-600">No departments available. Please add departments first.</p>
            )}
            <Button
              type="submit"
              fullWidth
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading || departments.length === 0}
            >
              {isLoading ? 'Updating...' : 'Update Doctor'}
            </Button>
          </form>
        </Modal>

        {/* Schedule Modal */}
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedUser(null);
            resetSchedule();
          }}
          title="Manage Schedule"
          size="lg"
        >
          <ScheduleForm />
        </Modal>

        {/* Reset Password Modal */}
        <Modal
          isOpen={isResetPasswordModalOpen}
          onClose={() => {
            setIsResetPasswordModalOpen(false);
            setSelectedUser(null);
            setNewPassword('');
          }}
          title="Reset Doctor Password"
          size="md"
        >
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <p className="text-teal-700">
                New password for {users.find((u) => u.id === selectedUser)?.Fname} {users.find((u) => u.id === selectedUser)?.Lname}:
              </p>
              <Input
                label="New Password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="bg-teal-50 border-teal-200 text-teal-900"
              />
            </div>
            <Button
              type="submit"
              fullWidth
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default DoctorsPage;