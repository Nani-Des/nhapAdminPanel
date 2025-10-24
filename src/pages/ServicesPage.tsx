import React, { useEffect, useState, memo } from 'react';
import { FilePlus2, Edit, Trash } from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { addDoc, collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Service } from '../types';
import { toast } from 'react-hot-toast';

// Skeleton Loading Components
const ServicesHeaderSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 w-32 bg-teal-200 rounded-lg mb-2"></div>
    <div className="h-4 w-64 bg-teal-200 rounded-md"></div>
  </div>
);

const ServiceCardSkeleton = () => (
  <div className="bg-teal-100 shadow-lg rounded-lg animate-pulse">
    <div className="bg-teal-200 h-16 rounded-t-lg p-4">
      <div className="flex justify-between items-center">
        <div className="h-6 w-3/4 bg-teal-300 rounded"></div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-teal-300 rounded-full"></div>
          <div className="h-8 w-8 bg-teal-300 rounded-full"></div>
        </div>
      </div>
    </div>
    <div className="p-4 space-y-4">
      <div>
        <div className="h-4 w-1/3 bg-teal-200 rounded mb-2"></div>
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-6 w-16 bg-teal-200 rounded-full"></div>
          ))}
        </div>
      </div>
      <div>
        <div className="h-4 w-1/3 bg-teal-200 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-teal-200 rounded"></div>
      </div>
      <div>
        <div className="h-4 w-1/3 bg-teal-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-teal-200 rounded"></div>
        <div className="h-4 w-2/3 bg-teal-200 rounded mt-1"></div>
      </div>
    </div>
  </div>
);

const AddButtonSkeleton = () => (
  <div className="h-10 w-32 bg-teal-200 rounded-lg animate-pulse"></div>
);

// Memoized ServiceForm to prevent re-creation on parent re-renders
interface ServiceFormProps {
  formData: ServiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<ServiceFormData>>;
  timeError: string;
  setTimeError: React.Dispatch<React.SetStateAction<string>>;
  descriptionError: string;
  setDescriptionError: React.Dispatch<React.SetStateAction<string>>;
  validateTime: (time: string) => boolean;
  validateDescription: (time: string) => boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  selectedService: string | null;
  daysOfWeek: string[];
}

interface ServiceFormData {
  'Service Name': string;
  Days: string[];
  Time: string;
  'Post ID': string;
  Description: string;
}

const ServiceForm = memo(
  ({
    formData,
    setFormData,
    timeError,
    setTimeError,
    descriptionError,
    setDescriptionError,
    validateTime,
    validateDescription,
    handleSubmit,
    selectedService,
    daysOfWeek,
  }: ServiceFormProps) => {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Service Name"
          value={formData['Service Name']}
          onChange={(e) => {
            const value = e.target.value;
            setFormData((prev) => ({ ...prev, 'Service Name': value }));
          }}
          required
          className="bg-teal-50 border-teal-200 text-teal-900"
        />
        <div>
          <label className="block text-sm font-medium text-teal-700 mb-2">Available Days</label>
          <div className="grid grid-cols-2 gap-4">
            {daysOfWeek.map((day) => (
              <label key={day} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.Days.includes(day)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      Days: e.target.checked
                        ? [...prev.Days, day]
                        : prev.Days.filter((d) => d !== day),
                    }))
                  }
                  className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-teal-700">{day}</span>
              </label>
            ))}
          </div>
          {formData.Days.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Please select at least one day</p>
          )}
        </div>
        <Input
          label="Time Slots (e.g., 09:00-17:00)"
          value={formData.Time}
          onChange={(e) => {
            const value = e.target.value;
            setFormData((prev) => ({ ...prev, Time: value }));
            validateTime(value);
          }}
          required
          className={`bg-teal-50 border-teal-200 text-teal-900 ${timeError ? 'border-red-500' : ''}`}
        />
        {timeError && <p className="text-xs text-red-500 mt-1">{timeError}</p>}
        <div>
          <label className="block text-sm font-medium text-teal-700 mb-2">Service Description</label>
          <textarea
            value={formData.Description}
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({ ...prev, Description: value }));
              validateDescription(value);
            }}
            rows={4}
            required
            className={`w-full rounded-md bg-teal-50 border-teal-200 text-teal-900 focus:ring-teal-500 focus:border-teal-500 ${
              descriptionError ? 'border-red-500' : ''
            }`}
          />
          {descriptionError && <p className="text-xs text-red-500 mt-1">{descriptionError}</p>}
          <p className="text-xs text-teal-600 mt-1">Describe the service (this will be posted publicly).</p>
        </div>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            onClick={() => {
              setFormData({ 'Service Name': '', Days: [], Time: '', 'Post ID': '', Description: '' });
              setTimeError('');
              setDescriptionError('');
            }}
            className="bg-teal-200 text-teal-900 hover:bg-teal-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={
              !formData['Service Name'] ||
              formData.Days.length === 0 ||
              !!timeError ||
              !!descriptionError ||
              !formData.Description
            }
          >
            {selectedService ? 'Update Service' : 'Add Service'}
          </Button>
        </div>
      </form>
    );
  }
);

const ServicesPage: React.FC = () => {
  const { hospital } = useHospital();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [hospitalServices, setHospitalServices] = useState<Record<string, Service[]>>({});
  const [loading, setLoading] = useState(true);
  const [timeError, setTimeError] = useState<string>('');
  const [descriptionError, setDescriptionError] = useState<string>('');
  const [formData, setFormData] = useState<ServiceFormData>({
    'Service Name': '',
    Days: [],
    Time: '',
    'Post ID': '',
    Description: '',
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Validate time format (e.g., 09:00-17:00)
  const validateTime = (time: string): boolean => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(time)) {
      setTimeError('Time must be in format HH:mm-HH:mm (e.g., 09:00-17:00)');
      return false;
    }
    setTimeError('');
    return true;
  };

  // Validate description
  const validateDescription = (description: string): boolean => {
    if (!description.trim()) {
      setDescriptionError('Description is required');
      return false;
    }
    setDescriptionError('');
    return true;
  };

  // Fetch services with real-time updates
  useEffect(() => {
    if (!hospital?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const serviceCollectionRef = collection(db, 'Hospital', hospital.id, 'Services');
    const unsub = onSnapshot(
      serviceCollectionRef,
      (snapshot) => {
        const services: Service[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Service));
        setHospitalServices({ [hospital.id]: services });
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching services:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [hospital?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospital?.id) {
      console.error('No hospital selected');
      toast.error('No hospital selected');
      return;
    }

    if (
      !validateTime(formData.Time) ||
      !formData['Service Name'] ||
      formData.Days.length === 0 ||
      !validateDescription(formData.Description)
    ) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    try {
      // Fetch hospital logo
      const hospitalDocRef = doc(db, 'Hospital', hospital.id);
      const hospitalDoc = await getDoc(hospitalDocRef);
      const hospitalData = hospitalDoc.data();
      const logo = hospitalData?.Logo || '';

      const serviceCollectionRef = collection(db, 'Hospital', hospital.id, 'Services');
      let postId = formData['Post ID'] || doc(collection(db, 'Posts')).id;
      const serviceData: Service = {
        'Service Name': formData['Service Name'],
        Days: formData.Days,
        Time: formData.Time,
        'Post ID': postId,
        Description: formData.Description,
      };

      let serviceId: string;
      if (selectedService) {
        const serviceDocRef = doc(db, 'Hospital', hospital.id, 'Services', selectedService);
        await setDoc(serviceDocRef, serviceData, { merge: true });
        serviceId = selectedService;
        toast.success('Service updated!');
      } else {
        const serviceDoc = await addDoc(serviceCollectionRef, serviceData);
        serviceId = serviceDoc.id;
        toast.success('Service added!');
      }

      // Create or update post in Posts collection
      const postDocRef = doc(db, 'Posts', postId);
      await setDoc(postDocRef, {
        Content: formData.Description,
        ImageURL: logo,
        Likes: 0,
        'Post ID': postId,
        Timestamp: serverTimestamp(),
        'User ID': hospital.id,
      });

      setFormData({
        'Service Name': '',
        Days: [],
        Time: '',
        'Post ID': '',
        Description: '',
      });
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedService(null);
      setTimeError('');
      setDescriptionError('');
    } catch (error) {
      console.error('Error saving service or post:', error);
      toast.error('Failed to save service');
    }
  };

  const handleDelete = async () => {
    if (!hospital?.id || !selectedService) return;

    try {
      const serviceDocRef = doc(db, 'Hospital', hospital.id, 'Services', selectedService);
      const serviceDoc = await getDoc(serviceDocRef);
      const serviceData = serviceDoc.data() as Service;

      await deleteDoc(serviceDocRef);

      if (serviceData?.['Post ID']) {
        const postDocRef = doc(db, 'Posts', serviceData['Post ID']);
        await deleteDoc(postDocRef);
      }

      toast.success('Service and associated post deleted!');
      setIsDeleteModalOpen(false);
      setSelectedService(null);
    } catch (error) {
      console.error('Error deleting service or post:', error);
      toast.error('Failed to delete service');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          {loading ? (
            <ServicesHeaderSkeleton />
          ) : (
            <div>
              <h1 className="text-3xl font-bold text-teal-900">Services</h1>
              <p className="mt-2 text-base text-teal-700">Manage hospital services and schedules</p>
            </div>
          )}
          
          {loading ? (
            <AddButtonSkeleton />
          ) : (
            <Button
              onClick={() => {
                setIsAddModalOpen(true);
                setSelectedService(null);
                setFormData({ 'Service Name': '', Days: [], Time: '', 'Post ID': '', Description: '' });
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
            >
              <FilePlus2 className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          )}
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <ServiceCardSkeleton key={i} />
            ))}
          </div>
        ) : hospitalServices[hospital?.id || '']?.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-teal-600 text-lg">No services available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitalServices[hospital?.id || '']?.map((service) => (
              <Card
                key={service.id}
                className="bg-teal-100 shadow-lg rounded-lg hover:shadow-xl transition-shadow"
              >
                <CardHeader className="bg-teal-200 rounded-t-lg">
                  <CardTitle className="flex justify-between items-center text-teal-900">
                    <span>{service['Service Name']}</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedService(service.id ?? null);
                          setFormData({
                            'Service Name': service['Service Name'] || '',
                            Days: service.Days || [],
                            Time: service.Time || '',
                            'Post ID': service['Post ID'] || '',
                            Description: service.Description || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="border-teal-200 text-teal-700 hover:bg-teal-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedService(service.id ?? null);
                          setIsDeleteModalOpen(true);
                        }}
                        className="border-teal-200 text-red-600 hover:bg-red-100"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-teal-700">Available Days</h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {service.Days?.map((day) => (
                        <span
                          key={day}
                          className="inline-block bg-teal-600 text-white text-xs font-semibold px-2 py-1 rounded-full"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-teal-700">Time Slots</h4>
                    <p className="mt-1 text-teal-900">{service.Time || '-'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-teal-700">Description</h4>
                    <p className="mt-1 text-teal-900">{service.Description || '-'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Service Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedService(null);
            setFormData({ 'Service Name': '', Days: [], Time: '', 'Post ID': '', Description: '' });
            setTimeError('');
            setDescriptionError('');
          }}
          title="Add New Service"
          size="lg"
        >
          <ServiceForm
            formData={formData}
            setFormData={setFormData}
            timeError={timeError}
            setTimeError={setTimeError}
            descriptionError={descriptionError}
            setDescriptionError={setDescriptionError}
            validateTime={validateTime}
            validateDescription={validateDescription}
            handleSubmit={handleSubmit}
            selectedService={selectedService}
            daysOfWeek={daysOfWeek}
          />
        </Modal>

        {/* Edit Service Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedService(null);
            setFormData({ 'Service Name': '', Days: [], Time: '', 'Post ID': '', Description: '' });
            setTimeError('');
            setDescriptionError('');
          }}
          title="Edit Service"
          size="lg"
        >
          <ServiceForm
            formData={formData}
            setFormData={setFormData}
            timeError={timeError}
            setTimeError={setTimeError}
            descriptionError={descriptionError}
            setDescriptionError={setDescriptionError}
            validateTime={validateTime}
            validateDescription={validateDescription}
            handleSubmit={handleSubmit}
            selectedService={selectedService}
            daysOfWeek={daysOfWeek}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedService(null);
          }}
          title="Delete Service"
          size="md"
        >
          <div className="space-y-6">
            <p className="text-teal-700">
              Are you sure you want to delete this service and its associated post? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedService(null);
                }}
                className="bg-teal-200 text-teal-900 hover:bg-teal-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ServicesPage;