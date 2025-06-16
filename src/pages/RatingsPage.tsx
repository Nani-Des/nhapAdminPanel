// import React from 'react';
// import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
// import { useHospital } from '../contexts/HospitalContext';
// import Layout from '../components/layout/Layout';
// import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

// const RatingsPage: React.FC = () => {
//   const { ratings } = useHospital();

//   const averageRating = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;

//   const ratingDistribution = ratings.reduce((acc, curr) => {
//     const rating = Math.floor(curr.rating);
//     acc[rating] = (acc[rating] || 0) + 1;
//     return acc;
//   }, {} as Record<number, number>);

//   return (
//     <Layout>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Hospital Ratings</h1>
//           <p className="mt-1 text-sm text-gray-500">
//             View and analyze patient feedback and ratings
//           </p>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           <Card>
//             <CardHeader>
//               <CardTitle>Overall Rating</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="flex items-center justify-center space-x-2">
//                 <Star className="w-8 h-8 text-yellow-400 fill-current" />
//                 <span className="text-4xl font-bold">
//                   {averageRating.toFixed(1)}
//                 </span>
//               </div>
//               <p className="mt-2 text-center text-sm text-gray-500">
//                 Based on {ratings.length} reviews
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Rating Distribution</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-3">
//                 {[5, 4, 3, 2, 1].map((rating) => {
//                   const count = ratingDistribution[rating] || 0;
//                   const percentage = (count / ratings.length) * 100 || 0;
//                   return (
//                     <div key={rating}>
//                       <div className="flex items-center justify-between text-sm">
//                         <span className="flex items-center">
//                           {rating} <Star className="w-4 h-4 ml-1 text-yellow-400" />
//                         </span>
//                         <span>{percentage.toFixed(1)}%</span>
//                       </div>
//                       <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
//                         <div
//                           className="bg-yellow-400 h-2 rounded-full"
//                           style={{ width: `${percentage}%` }}
//                         />
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Quick Stats</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center text-green-600">
//                     <ThumbsUp className="w-5 h-5 mr-2" />
//                     <span>Positive Reviews</span>
//                   </div>
//                   <span className="font-semibold">
//                     {ratings.filter((r) => r.rating >= 4).length}
//                   </span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center text-red-600">
//                     <ThumbsDown className="w-5 h-5 mr-2" />
//                     <span>Negative Reviews</span>
//                   </div>
//                   <span className="font-semibold">
//                     {ratings.filter((r) => r.rating <= 2).length}
//                   </span>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <div className="bg-white shadow rounded-lg">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h2 className="text-lg font-medium text-gray-900">Recent Reviews</h2>
//           </div>
//           <div className="divide-y divide-gray-200">
//             {ratings.map((rating) => (
//               <div key={rating.id} className="p-6">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center space-x-3">
//                     <div className="flex items-center">
//                       {Array.from({ length: 5 }).map((_, index) => (
//                         <Star
//                           key={index}
//                           className={`w-5 h-5 ${
//                             index < rating.rating
//                               ? 'text-yellow-400 fill-current'
//                               : 'text-gray-300'
//                           }`}
//                         />
//                       ))}
//                     </div>
//                     <span className="font-medium text-gray-900">
//                       {rating.patientName}
//                     </span>
//                   </div>
//                   <span className="text-sm text-gray-500">
//                     {new Date(rating.createdAt).toLocaleDateString()}
//                   </span>
//                 </div>
//                 <p className="mt-2 text-gray-600">{rating.comment}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// };

// export default RatingsPage;