// import React, { useState } from 'react';
// import { Users as UsersIcon, UserPlus, Edit, Power } from 'lucide-react';
// import { useHospital } from '../contexts/HospitalContext';
// import Layout from '../components/layout/Layout';
// import Table from '../components/ui/Table';
// import Button from '../components/ui/Button';
// import Badge from '../components/ui/Badge';
// import Modal from '../components/ui/Modal';
// import { collection, addDoc } from "firebase/firestore";
// import { db } from "../firebase";
// import Input from '../components/ui/Input';
// import Select from '../components/ui/Select';

// const UsersPage: React.FC = () => {
//   const { users, updateUser, toggleUserStatus, hospital } = useHospital();
//   const [isAddModalOpen, setIsAddModalOpen] = useState(false);
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<string | null>(null);
//     const [formData, setFormData] = useState({
//     email: '',
//     name: '',
//     phone: '',
//     role: 'user',
//     status: 'active',
//     hospitalId: hospital?.id || '',
//     });
    

// const handleSubmit = async (e: React.FormEvent) => {
//   e.preventDefault();

//   const booleanStatus = formData.status === 'active'; // true or false
//   const booleanRole = formData.role === 'doctor'; // true = doctor, false = user

//   if (selectedUser) {
//     const user = users.find(u => u.id === selectedUser);
//     if (user) {
//       updateUser({
//         ...user,
//         ...formData,
//         status: booleanStatus,
//         Role: booleanRole,
//       });
//     }
//     setIsEditModalOpen(false);
//   } else {
//     await addDoc(collection(db, "users"), {
//       ...formData,
//       status: booleanStatus,
//       role: booleanRole,
//       hospitalId: hospital?.id,
//     });
//     setIsAddModalOpen(false);
//   }

//   // Reset form
//   setFormData({
//     email: '',
//     name: '',
//     phone: '',
//     role: 'user',
//     status: 'active',
//     hospitalId: hospital?.id || '',
//   });
// };


//   return (
//     <Layout>
//       <div className="space-y-6">
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Users</h1>
//             <p className="mt-1 text-sm text-gray-500">
//               Manage your hospital's users and their access
//             </p>
//           </div>
//           <Button
//             onClick={() => setIsAddModalOpen(true)}
//             className="flex items-center"
//           >
//             <UserPlus className="w-4 h-4 mr-2" />
//             Add User
//           </Button>
//         </div>

//         <div className="bg-white shadow rounded-lg">
//           <Table>
//             <Table.Header>
//               <Table.Row>
//                 <Table.Head>Name</Table.Head>
//                 <Table.Head>Email</Table.Head>
//                 <Table.Head>Phone</Table.Head>
//                 <Table.Head>Role</Table.Head>
//                 <Table.Head>Status</Table.Head>
//                 <Table.Head>Actions</Table.Head>
//               </Table.Row>
//             </Table.Header>
//             <Table.Body>
//               {users.map((user) => (
//                 <Table.Row key={user.id}>
//                   <Table.Cell className="font-medium text-gray-900">
//                     {user.name}
//                   </Table.Cell>
//                   <Table.Cell>{user.email}</Table.Cell>
//                   <Table.Cell>{user.phone}</Table.Cell>
//                   <Table.Cell>
//                     <Badge variant={user.Role === true ? 'info' : 'default'}>
//                       {user.Role === true ? 'Doctor' : 'User'}
//                     </Badge>
//                   </Table.Cell>
//                   <Table.Cell>
//                     <Badge
//                       variant={user.status === true ? 'success' : 'danger'}
//                     >
//                       {user.status === true ? 'Active' : 'Inactive'}
//                     </Badge>
//                   </Table.Cell>
//                   <Table.Cell>
//                     <div className="flex space-x-2">
//                       <Button
//                         variant="outline"
//                         size="sm"
//   onClick={() => {
//     setSelectedUser(user.id);
//     setFormData({
//       email: user.email,
//       name: user.name,
//       phone: user.phone,
//       role: user.Role ? 'doctor' : 'user', // Convert boolean back to string
//       status: user.status ? 'active' : 'inactive', // Convert boolean back to string
//       hospitalId: hospital?.id || '',
//     });
//     setIsEditModalOpen(true);
//   }}
//                       >
//                         <Edit className="w-4 h-4" />
//                       </Button>
//                       <Button
//                         variant={user.status === true ? 'danger' : 'success'}
//                         size="sm"
//                         onClick={() => toggleUserStatus(user.id)}
//                       >
//                         <Power className="w-4 h-4" />
//                       </Button>
//                     </div>
//                   </Table.Cell>
//                 </Table.Row>
//               ))}
//             </Table.Body>
//           </Table>
//         </div>
//       </div>

//       {/* Add User Modal */}
// <Modal
//   isOpen={isAddModalOpen}
//           onClose={() => {
//           setIsAddModalOpen(false);
//           setFormData({
//             email: '',
//             name: '',
//             phone: '',
//             role: 'user',
//             status: 'active',
//             hospitalId: hospital?.id || '',
//           });
//         }}
  
//   title="Add New User"
// >
//             <form onSubmit={handleSubmit} className="space-y-4">
//       <Input
//         label="Email"
//         type="email"
//         value={formData.email}
//         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//         required
//       />
//       <Input
//         label="Name"
//         value={formData.name}
//         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//         required
//       />
//       <Input
//         label="Phone"
//         type="tel"
//         value={formData.phone}
//         onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//         required
//       />
//       <Select
//         label="Role"
//         value={formData.role}
//         onChange={(value) => setFormData({ ...formData, role: value })}
//         options={[
//           { value: 'user', label: 'User' },
//           { value: 'doctor', label: 'Doctor' },
//         ]}
//         required
//       />
//             <Select
//         label="Status"
//         value={formData.status}
//         onChange={(value) => setFormData({ ...formData, status: value })}
//         options={[
//           { value: 'active', label: 'Active' },
//           { value: 'inactive', label: 'Inactive' },
//         ]}
//         required
//       />
//       <Button type="submit" fullWidth>
//         {selectedUser ? 'Update User' : 'Add User'}
//       </Button>
//     </form>
// </Modal>


//       {/* Edit User Modal */}
//       <Modal
//         isOpen={isEditModalOpen}
//         onClose={() => {
//           setIsEditModalOpen(false);
//           setSelectedUser(null);
//           setFormData({
//             email: '',
//             name: '',
//             phone: '',
//             role: 'user',
//             status: 'active',
//             hospitalId: hospital?.id || '',
//           });
//         }}
//         title="Edit User"   >
//                     <form onSubmit={handleSubmit} className="space-y-4">
//       <Input
//         label="Email"
//         type="email"
//         value={formData.email}
//         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//         required
//       />
//       <Input
//         label="Name"
//         value={formData.name}
//         onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//         required
//       />
//       <Input
//         label="Phone"
//         type="tel"
//         value={formData.phone}
//         onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//         required
//       />
//       <Select
//         label="Role"
//         value={formData.role}
//         onChange={(value) => setFormData({ ...formData, role: value })}
//         options={[
//           { value: 'user', label: 'User' },
//           { value: 'doctor', label: 'Doctor' },
//         ]}
//         required
//       />
//             <Select
//         label="Status"
//         value={formData.status}
//         onChange={(value) => setFormData({ ...formData, status: value })}
//         options={[
//           { value: 'active', label: 'Active' },
//           { value: 'inactive', label: 'Inactive' },
//         ]}
//         required
//       />
//       <Button type="submit" fullWidth>
//         {selectedUser ? 'Update User' : 'Add User'}
//       </Button>
//     </form>
//       </Modal>
//     </Layout>
//   );
// };

// export default UsersPage;