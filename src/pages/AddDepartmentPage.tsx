import React, { useState } from 'react';
import { useHospital } from '../contexts/HospitalContext';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

const AddDepartmentPage: React.FC = () => {
  const { addDepartment, hospital } = useHospital();
  const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsLoading(true);
  const formData = new FormData(e.currentTarget);

  const addDepartment = {
    email: formData.get('email'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    hospitalId: hospital?.id,  // from your current hospital context or state
  };

  try {
    // Add your data here
    await addDoc(collection(db, "departments"), addDepartment);
    console.log("department added successfully");

    // Reset the form after successful submit
    setFormData({ name: '', phone: '', email: '' });
  } catch (error) {
    console.error("Error adding department:", error);
  } finally {
    setIsLoading(false);  // <-- stop loading
  }
}

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Add New Department</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Department Name"
                        name="name"
        type="text"
        required
        placeholder="Department Name"
                value={formData.name}
        onChange={handleChange}
              />
              <Input
                label="Contact Phone"
        name="phone"
        type="tel"
        required
        placeholder="+123 456 7890"
                value={formData.phone}
        onChange={handleChange}
              />
              <Input
                label="Contact Email"
                name='email'
                type="email"
                placeholder='example@gmail.com'
                required
                        value={formData.email}
        onChange={handleChange}
              />
              <Button
                type="submit"
                isLoading={isLoading}
                fullWidth
              >
                {isLoading ? 'Adding...' : 'Add Department'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AddDepartmentPage;