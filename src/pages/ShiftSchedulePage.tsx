// import React, { useEffect, useState } from 'react';
// import { Edit } from 'lucide-react';
// import { useHospital } from '../contexts/HospitalContext';
// import Layout from '../components/layout/Layout';
// import Table from '../components/ui/Table';
// import Input from '../components/ui/Input';
// import Button from '../components/ui/Button';
// import Modal from '../components/ui/Modal';
// import Spinner from '../components/ui/Spinner';
// import { addDoc, collection, doc, getDocs, query, setDoc, Timestamp, onSnapshot } from 'firebase/firestore';
// import { db } from '../firebase';
// import { Schedule } from '../types';
//
// const ShiftSchedulePage: React.FC = () => {
//   const { users, departments } = useHospital();
//   const [userSchedules, setUserSchedules] = useState<Record<string, Schedule | null>>({});
//   const [searchTerm, setSearchTerm] = useState('');
//   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [shiftError, setShiftError] = useState<string>('');
//
//   const [scheduleData, setScheduleData] = useState<Schedule>({
//     'Active Days': 0,
//     'Off Days': 0,
//     Shift: 1,
//     'Shift Start': Timestamp.fromDate(new Date()),
//     'Shift Switch': 0,
//   });
//
//   // Pagination state
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 6;
//
//   // Initialize schedules for all users
//   useEffect(() => {
//     if (users.length === 0) {
//       setLoading(false);
//       return;
//     }
//
//     setLoading(true);
//     const initialSchedules: Record<string, Schedule | null> = {};
//     users.forEach((user) => {
//       initialSchedules[user.id] = null; // Initialize with null for users without schedules
//     });
//     setUserSchedules(initialSchedules);
//
//     const unsubs: (() => void)[] = [];
//     users.forEach((user) => {
//       const scheduleCollectionRef = collection(db, 'Users', user.id, 'Schedule');
//       const unsub = onSnapshot(
//         scheduleCollectionRef,
//         (snapshot) => {
//           setUserSchedules((prevSchedules) => {
//             const updatedSchedules = { ...prevSchedules };
//             if (!snapshot.empty) {
//               const docData = snapshot.docs[0].data() as Schedule;
//               updatedSchedules[user.id] = docData;
//             } else {
//               updatedSchedules[user.id] = null; // No schedule exists
//             }
//             console.log(`Updated schedule for user ${user.id}:`, updatedSchedules[user.id]);
//             return updatedSchedules;
//           });
//         },
//         (error) => {
//           console.error(`Error fetching schedule for user ${user.id}:`, error);
//         }
//       );
//       unsubs.push(unsub);
//     });
//
//     setLoading(false);
//     return () => unsubs.forEach((unsub) => unsub());
//   }, [users]);
//
//   const filteredUsers = users.filter(
//     (user) =>
//       `${user.Fname} ${user.Lname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       departments
//         .find((d) => d.id === user['Department ID'])
//         ?.['Department Name'].toLowerCase()
//         .includes(searchTerm.toLowerCase())
//   );
//
//   // Pagination logic
//   const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
//   const paginatedUsers = filteredUsers.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );
//
//   // Generate page numbers for pagination
//   const getPageNumbers = () => {
//     const maxPagesToShow = 5;
//     const pages: number[] = [];
//     const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
//     const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
//
//     for (let i = startPage; i <= endPage; i++) {
//       pages.push(i);
//     }
//     return pages;
//   };
//
//   const updateUserSchedule = async (userId: string, scheduleData: Schedule) => {
//     try {
//       const scheduleCollectionRef = collection(db, 'Users', userId, 'Schedule');
//       const q = query(scheduleCollectionRef);
//       const querySnapshot = await getDocs(q);
//
//       if (querySnapshot.empty) {
//         await addDoc(scheduleCollectionRef, scheduleData);
//       } else {
//         const scheduleDoc = querySnapshot.docs[0];
//         const scheduleDocRef = doc(db, 'Users', userId, 'Schedule', scheduleDoc.id);
//         await setDoc(scheduleDocRef, scheduleData);
//       }
//       console.log(`Schedule updated for user ${userId}:`, scheduleData);
//     } catch (error) {
//       console.error('Error updating schedule:', error);
//     }
//   };
//
//   const validateShifts = (shifts: number): boolean => {
//     if (shifts < 1 || shifts > 3) {
//       setShiftError('Total Shifts must be between 1 and 3.');
//       return false;
//     }
//     setShiftError('');
//     return true;
//   };
//
//   const handleScheduleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const user = users.find((u) => u.id === selectedUser);
//     if (!user || !validateShifts(scheduleData.Shift)) return;
//
//     await updateUserSchedule(user.id, scheduleData);
//     setIsEditModalOpen(false);
//     setSelectedUser(null);
//     setShiftError('');
//   };
//
//   return (
//     <Layout>
//       <div className="space-y-6 bg-teal-50 p-6 rounded-lg">
//         {/* Header */}
//         <div className="flex justify-between items-center">
//           <div>
//             <h1 className="text-3xl font-bold text-teal-900">Shift Schedule</h1>
//             <p className="mt-2 text-base text-teal-700">Manage doctor shift schedules and rotations</p>
//           </div>
//         </div>
//
//         {/* Search Bar */}
//         <div className="sticky top-0 z-10 bg-teal-50 py-4">
//           <Input
//             placeholder="Search by doctor name or department..."
//             value={searchTerm}
//             onChange={(e) => {
//               setSearchTerm(e.target.value);
//               setCurrentPage(1);
//             }}
//             className="max-w-md bg-teal-100 border-teal-200 text-teal-900 placeholder-teal-600 focus:ring-teal-500 focus:border-teal-500"
//           />
//         </div>
//
//         {/* Loading State */}
//         {loading ? (
//           <div className="flex flex-col justify-center items-center py-10">
//             <Spinner />
//             <span className="text-teal-600 mt-2">Loading schedules...</span>
//           </div>
//         ) : filteredUsers.length === 0 ? (
//           <div className="text-center py-10">
//             <p className="text-teal-600 text-lg">No doctors found.</p>
//           </div>
//         ) : (
//           <div className="bg-teal-100 shadow-lg rounded-lg overflow-hidden">
//             <Table>
//               <Table.Header>
//                 <Table.Row className="bg-teal-200">
//                   <Table.Head className="text-teal-900 font-semibold">Doctor Name</Table.Head>
//                   <Table.Head className="text-teal-900 font-semibold">Department</Table.Head>
//                   <Table.Head className="text-teal-900 font-semibold">Shift</Table.Head>
//                   <Table.Head className="text-teal-900 font-semibold">Working Days</Table.Head>
//                   <Table.Head className="text-teal-900 font-semibold">Off Days</Table.Head>
//                   <Table.Head className="text-teal-900 font-semibold">Actions</Table.Head>
//                 </Table.Row>
//               </Table.Header>
//               <Table.Body>
//                 {paginatedUsers.map((user, index) => (
//                   <Table.Row
//                     key={user.id}
//                     className={`hover:bg-teal-200 transition-colors ${
//                       index % 2 === 0 ? 'bg-teal-50' : 'bg-teal-100'
//                     }`}
//                   >
//                     <Table.Cell className="font-medium text-teal-900">
//                       <div className="flex items-center space-x-3">
//                         {user['User Pic'] ? (
//                           <img
//                             src={user['User Pic']?.toString()}
//                             alt={`${user.Fname} ${user.Lname}`}
//                             className="h-8 w-8 rounded-full object-cover shadow-sm"
//                           />
//                         ) : (
//                           <div className="h-8 w-8 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
//                             {user.Fname?.charAt(0) || '?'}
//                           </div>
//                         )}
//                         <span>{user.Fname} {user.Lname}</span>
//                       </div>
//                     </Table.Cell>
//                     <Table.Cell className="text-teal-700">
//                       {departments.find((d) => d.id === user['Department ID'])?.['Department Name'] || 'Not Assigned'}
//                     </Table.Cell>
//                     <Table.Cell className="text-teal-700">{userSchedules[user.id]?.Shift || '-'}</Table.Cell>
//                     <Table.Cell className="text-teal-700">{userSchedules[user.id]?.['Active Days'] || '-'}</Table.Cell>
//                     <Table.Cell className="text-teal-700">{userSchedules[user.id]?.['Off Days'] || '-'}</Table.Cell>
//                     <Table.Cell>
//                       <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                           setSelectedUser(user.id);
//                           setScheduleData({
//                             Shift: userSchedules[user.id]?.Shift || 1,
//                             'Active Days': userSchedules[user.id]?.['Active Days'] || 0,
//                             'Off Days': userSchedules[user.id]?.['Off Days'] || 0,
//                             'Shift Start': userSchedules[user.id]?.['Shift Start'] || Timestamp.fromDate(new Date()),
//                             'Shift Switch': userSchedules[user.id]?.['Shift Switch'] || 0,
//                           });
//                           setIsEditModalOpen(true);
//                         }}
//                         className="border-teal-200 text-teal-700 hover:bg-teal-300"
//                       >
//                         <Edit className="w-4 h-4 mr-1" />
//                         Edit
//                       </Button>
//                     </Table.Cell>
//                   </Table.Row>
//                 ))}
//               </Table.Body>
//             </Table>
//
//             {/* Pagination Controls */}
//             {filteredUsers.length > itemsPerPage && (
//               <div className="flex justify-between items-center mt-4 px-4 pb-4">
//                 <p className="text-sm text-teal-600">
//                   Page {currentPage} of {totalPages}
//                 </p>
//                 <div className="flex space-x-1">
//                   <Button
//                     onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//                     disabled={currentPage === 1}
//                     className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Prev
//                   </Button>
//                   {getPageNumbers().map((page) => (
//                     <Button
//                       key={page}
//                       onClick={() => setCurrentPage(page)}
//                       className={`px-3 py-1 rounded ${
//                         currentPage === page
//                           ? 'bg-teal-700 text-white'
//                           : 'bg-teal-200 text-teal-900 hover:bg-teal-300'
//                       }`}
//                     >
//                       {page}
//                     </Button>
//                   ))}
//                   <Button
//                     onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//                     disabled={currentPage === totalPages}
//                     className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Next
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//
//         {/* Edit Schedule Modal */}
//         <Modal
//           isOpen={isEditModalOpen}
//           onClose={() => {
//             setIsEditModalOpen(false);
//             setSelectedUser(null);
//             setShiftError('');
//           }}
//           title="Edit Shift Schedule"
//           size="lg"
//         >
//           <form onSubmit={handleScheduleSubmit} className="space-y-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Input
//                   type="number"
//                   label="Working Days"
//                   min={1}
//                   max={7}
//                   value={scheduleData['Active Days']}
//                   onChange={(e) =>
//                     setScheduleData({ ...scheduleData, 'Active Days': parseInt(e.target.value) || 0 })
//                   }
//                   required
//                   className="bg-teal-50 border-teal-200 text-teal-900"
//                 />
//                 <p className="text-xs text-teal-600 mt-1">Number of days the doctor works per week (1-7).</p>
//               </div>
//               <div>
//                 <Input
//                   type="number"
//                   label="Off Days"
//                   min={0}
//                   max={7}
//                   value={scheduleData['Off Days']}
//                   onChange={(e) => setScheduleData({ ...scheduleData, 'Off Days': parseInt(e.target.value) || 0 })}
//                   required
//                   className="bg-teal-50 border-teal-200 text-teal-900"
//                 />
//                 <p className="text-xs text-teal-600 mt-1">Number of days off per week (0-7).</p>
//               </div>
//             </div>
//
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Input
//                   type="number"
//                   label="Total Shifts"
//                   min={1}
//                   max={3}
//                   value={scheduleData.Shift}
//                   onChange={(e) => {
//                     const value = parseInt(e.target.value) || 0;
//                     const clampedValue = Math.max(1, Math.min(3, value));
//                     setScheduleData({ ...scheduleData, Shift: clampedValue });
//                     validateShifts(clampedValue);
//                   }}
//                   required
//                   className={`bg-teal-50 border-teal-200 text-teal-900 ${shiftError ? 'border-red-500' : ''}`}
//                 />
//                 <p className="text-xs text-teal-600 mt-1">Number of shifts per day (1-3).</p>
//                 {shiftError && <p className="text-xs text-red-500 mt-1">{shiftError}</p>}
//               </div>
//               <div>
//                 <Input
//                   type="number"
//                   label="Shift Switch Frequency (days)"
//                   min={1}
//                   value={scheduleData['Shift Switch']}
//                   onChange={(e) =>
//                     setScheduleData({ ...scheduleData, 'Shift Switch': parseInt(e.target.value) || 0 })
//                   }
//                   required
//                   className="bg-teal-50 border-teal-200 text-teal-900"
//                 />
//                 <p className="text-xs text-teal-600 mt-1">Days between shift rotations (e.g., 7 for weekly).</p>
//               </div>
//             </div>
//
//             <Input
//               type="date"
//               label="Shift Start Date"
//               value={scheduleData['Shift Start'].toDate().toISOString().split('T')[0]}
//               onChange={(e) =>
//                 setScheduleData({
//                   ...scheduleData,
//                   'Shift Start': Timestamp.fromDate(new Date(e.target.value)),
//                 })
//               }
//               required
//               className="bg-teal-50 border-teal-200 text-teal-900"
//             />
//
//             <div className="flex justify-end space-x-3">
//               <Button
//                 type="button"
//                 onClick={() => {
//                   setIsEditModalOpen(false);
//                   setSelectedUser(null);
//                   setShiftError('');
//                 }}
//                 className="bg-teal-200 text-teal-900 hover:bg-teal-300"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 type="submit"
//                 className="bg-teal-600 hover:bg-teal-700 text-white"
//                 disabled={
//                   !scheduleData['Active Days'] ||
//                   !scheduleData['Off Days'] ||
//                   !scheduleData.Shift ||
//                   scheduleData.Shift > 3 ||
//                   scheduleData.Shift < 1 ||
//                   !scheduleData['Shift Switch'] ||
//                   !!shiftError
//                 }
//               >
//                 Save Schedule
//               </Button>
//             </div>
//           </form>
//         </Modal>
//       </div>
//     </Layout>
//   );
// };
//
// export default ShiftSchedulePage;