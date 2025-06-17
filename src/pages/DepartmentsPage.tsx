import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { FolderPlus, Edit, Trash, Search } from 'lucide-react';
import { useHospital } from '../contexts/HospitalContext';
import Layout from '../components/layout/Layout';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { toast } from 'react-hot-toast';
import { collection, getDocs, setDoc, doc, query } from 'firebase/firestore';
import { db } from '../firebase';

interface Department {
  id: string;
  'Department ID': string;
  'Department Name': string;
}

const DepartmentForm = React.memo(
  ({
    formData,
    setFormData,
    handleSubmit,
    isLoading,
    selectedDepartment,
    onCancel,
    mode,
    setMode,
    availableDepartments,
  }: {
    formData: {
      'Department ID': string;
      'Department Name': string;
      selectedDepartmentId?: string;
    };
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    handleSubmit: (e: React.FormEvent) => Promise<void>;
    isLoading: boolean;
    selectedDepartment?: string | null;
    onCancel: () => void;
    mode: 'select' | 'create';
    setMode: React.Dispatch<React.SetStateAction<'select' | 'create'>>;
    availableDepartments: Department[];
  }) => {
    console.log('DepartmentForm rendered');

    const handleInputChange = useCallback(
      (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
      },
      [setFormData]
    );

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex space-x-4 mb-4">
          <Button
            type="button"
            variant={mode === 'select' ? 'primary' : 'outline'}
            onClick={() => setMode('select')}
            className={
              mode === 'select'
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'border-teal-200 text-teal-700 hover:bg-teal-100'
            }
          >
            Select Existing
          </Button>
          <Button
            type="button"
            variant={mode === 'create' ? 'primary' : 'outline'}
            onClick={() => setMode('create')}
            className={
              mode === 'create'
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'border-teal-200 text-teal-700 hover:bg-teal-100'
            }
          >
            Create New
          </Button>
        </div>

        {mode === 'select' && (
          <Select
            label="Select Department"
            value={formData.selectedDepartmentId || ''}
            onChange={(value) => handleInputChange('selectedDepartmentId', value)}
            options={[
              { value: '', label: 'Choose a department' },
              ...availableDepartments.map((dept) => ({
                value: dept['Department ID'],
                label: dept['Department Name'],
              })),
            ]}
            required
            className="bg-teal-50 border-teal-200 text-teal-900"
          />
        )}

        {mode === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Department Name"
              value={formData['Department Name']}
              onChange={(e) => handleInputChange('Department Name', e.target.value)}
              required
              className="bg-teal-50 border-teal-200 text-teal-900 placeholder-teal-600"
              placeholder="e.g., Cardiology"
            />
            <Input
              label="Department ID"
              value={formData['Department ID']}
              onChange={(e) => handleInputChange('Department ID', e.target.value)}
              className="bg-teal-50 border-teal-200 text-teal-900 placeholder-teal-600"
              placeholder="e.g., CARDIO123 (leave blank for auto-generated)"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-teal-200 text-teal-700 hover:bg-teal-100"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || (mode === 'select' && !formData.selectedDepartmentId)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isLoading
              ? 'Saving...'
              : selectedDepartment
              ? 'Update Department'
              : mode === 'select'
              ? 'Add to Hospital'
              : 'Create and Add Department'}
          </Button>
        </div>
      </form>
    );
  }
);

const DepartmentsPage: React.FC = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment, hospital } = useHospital();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    'Department ID': '',
    'Department Name': '',
    selectedDepartmentId: '',
  });
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([]);

  // Fetch departments from Department collection
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const deptQuery = query(collection(db, 'Department'));
        const snapshot = await getDocs(deptQuery);
        const depts = snapshot.docs.map((doc) => ({
          id: doc.id,
          'Department ID': doc.id,
          'Department Name': doc.data()['Department Name'] || '',
        }));
        // Exclude departments already assigned to hospital
        const unassignedDepts = depts.filter(
          (dept) => !departments.some((d) => d['Department ID'] === dept['Department ID'])
        );
        setAvailableDepartments(unassignedDepts);
      } catch (err) {
        console.error('Failed to fetch departments:', err);
        toast.error('Failed to load available departments');
      }
    };
    fetchDepartments();
  }, [departments]);

  // Memoized filtered and sorted departments
  const filteredDepartments = useMemo(() => {
    return departments
      .filter((dept) => dept['Department Name'].toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a['Department Name'].localeCompare(b['Department Name']));
  }, [departments, searchTerm]);

  // Memoized handlers
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        if (selectedDepartment) {
          // Edit existing hospital department
          const department = departments.find((d) => d.id === selectedDepartment);
          if (department) {
            await updateDepartment({
              ...department,
              'Department ID': formData['Department ID'] || department.id,
              'Department Name': formData['Department Name'],
            });
            toast.success('Department updated successfully');
          }
          setIsEditModalOpen(false);
        } else if (mode === 'select') {
          // Add existing department to hospital
          if (!formData.selectedDepartmentId) {
            toast.error('Please select a department');
            setIsLoading(false);
            return;
          }
          console.log('Adding existing department:', formData.selectedDepartmentId);
          await addDepartment(formData.selectedDepartmentId);
          toast.success('Department added to hospital');
          setIsAddModalOpen(false);
        } else {
          // Create new department and add to hospital
          if (!formData['Department Name']) {
            toast.error('Please enter a department name');
            setIsLoading(false);
            return;
          }
          const newDeptId = formData['Department ID'] || crypto.randomUUID();
          console.log('Creating new department:', { id: newDeptId, name: formData['Department Name'] });
          // Create department with docid as Department ID
          await setDoc(doc(db, 'Department', newDeptId), {
            'Department ID': newDeptId,
            'Department Name': formData['Department Name'],
          });

          await addDepartment({
            id: newDeptId,
            'Department ID': newDeptId,
            'Department Name': formData['Department Name'],
          });
          toast.success('New department created and added to hospital');
          setIsAddModalOpen(false);
        }
        resetForm();
      } catch (err) {
        console.error('Failed to save department:', err);
        toast.error('Failed to save department');
      } finally {
        setIsLoading(false);
      }
    },
    [
      formData,
      mode,
      selectedDepartment,
      departments,
      addDepartment,
      updateDepartment,
    ]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedDepartment) return;
    setIsLoading(true);

    try {
      if (!deleteDepartment) {
        throw new Error('Delete functionality not implemented');
      }
      console.log('Deleting department:', selectedDepartment);
      await deleteDepartment(selectedDepartment);
      toast.success('Department removed from hospital');
      setIsDeleteModalOpen(false);
      setSelectedDepartment(null);
    } catch (err) {
      console.error('Failed to delete department:', err);
      toast.error('Failed to remove department');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDepartment, deleteDepartment]);

  const handleEdit = useCallback(
    (departmentId: string) => {
      const department = departments.find((d) => d.id === departmentId);
      if (department) {
        setFormData({
          'Department ID': department['Department ID'] || department.id,
          'Department Name': department['Department Name'] || '',
          selectedDepartmentId: '',
        });
        setSelectedDepartment(departmentId);
        setIsEditModalOpen(true);
      }
    },
    [departments]
  );

  const resetForm = useCallback(() => {
    setFormData({
      'Department ID': '',
      'Department Name': '',
      selectedDepartmentId: '',
    });
    setSelectedDepartment(null);
    setMode('select');
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    resetForm();
  }, [resetForm]);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    resetForm();
  }, [resetForm]);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedDepartment(null);
  }, []);

  return (
    <Layout>
      <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">Departments</h1>
            <p className="mt-2 text-base text-teal-700">
              Manage hospital departments
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center bg-teal-600 hover:bg-teal-700 text-white"
          >
            <FolderPlus className="w-5 h-5 mr-2" />
            Add Department
          </Button>
        </div>

        {/* Search Bar */}
        <div className="sticky top-0 z-10 bg-teal-50 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-teal-600" />
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-teal-100 border-teal-200 text-teal-900 placeholder-teal-600"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredDepartments.length === 0 && (
          <div className="text-center py-10">
            <p className="text-teal-600 text-lg">
              {searchTerm ? 'No departments found matching your search.' : 'No departments available.'}
            </p>
          </div>
        )}

        {/* Departments Table */}
        {filteredDepartments.length > 0 && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head className="bg-teal-100 text-teal-900">Department Name</Table.Head>
                  <Table.Head className="bg-teal-100 text-teal-900">Department ID</Table.Head>
                  <Table.Head className="bg-teal-100 text-teal-900">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredDepartments.map((department, index) => (
                  <Table.Row
                    key={department.id}
                    className={`${index % 2 === 0 ? 'bg-teal-50' : 'bg-white'} hover:bg-teal-100 transition-colors`}
                  >
                    <Table.Cell className="font-medium text-teal-900">
                      {department['Department Name']}
                    </Table.Cell>
                    <Table.Cell className="text-teal-700">{department['Department ID']}</Table.Cell>
                    <Table.Cell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(department.id)}
                          className="border-teal-200 text-teal-700 hover:bg-teal-200"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDepartment(department.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="border-red-200 text-red-600 hover:bg-red-100"
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}

        {/* Add Department Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          title="Add Department"
          size="lg"
        >
          <DepartmentForm
            formData={formData}
            setFormData={setFormData}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            selectedDepartment={selectedDepartment}
            onCancel={closeAddModal}
            mode={mode}
            setMode={setMode}
            availableDepartments={availableDepartments}
          />
        </Modal>

        {/* Edit Department Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          title="Edit Department"
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Department Name"
                value={formData['Department Name']}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, 'Department Name': e.target.value }))}
                required
                className="bg-teal-50 border-teal-200 text-teal-900 placeholder-teal-600"
                placeholder="e.g., Cardiology"
              />
              <Input
                label="Department ID"
                value={formData['Department ID']}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, 'Department ID': e.target.value }))}
                required
                className="bg-teal-50 border-teal-200 text-teal-900 placeholder-teal-600"
                placeholder="e.g., CARDIO123"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeEditModal}
                className="border-teal-200 text-teal-700 hover:bg-teal-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Update Department'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          title="Remove Department"
          size="md"
        >
          <div className="space-y-6">
            <p className="text-teal-700">
              Are you sure you want to remove the department "
              {departments.find((d) => d.id === selectedDepartment)?.['Department Name']}" from the
              hospital? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteModal}
                className="border-teal-200 text-teal-700 hover:bg-teal-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default DepartmentsPage;