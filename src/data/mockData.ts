import { 
  Admin, 
  Department, 
  Doctor, 
  Hospital, 
  MedicalRecord, 
  Metrics, 
  Notification, 
  Rating, 
  Referral, 
  Service, 
  User 
} from "../types";

// Mock hospitals
export const hospitals: Hospital[] = [
  {
    id: "hosp-1",
    name: "Central Hospital",
    address: "123 Main Street, Downtown",
    phone: "(555) 123-4567",
    email: "info@centralhospital.com"
  },
  {
    id: "hosp-2",
    name: "Mercy Medical Center",
    address: "456 Park Avenue, Uptown",
    phone: "(555) 987-6543",
    email: "contact@mercymedical.com"
  }
];

// Mock admins
export const admins: Admin[] = [
  {
    id: "admin-1",
    name: "Dr. John Smith",
    pin: "123456",
    hospitalId: "hosp-1",
    email: "john.smith@centralhospital.com",
    phone: "(555) 111-2222",
    lastLogin: "2023-05-15T08:30:00Z"
  },
  {
    id: "admin-2",
    name: "Dr. Sarah Johnson",
    pin: "654321",
    hospitalId: "hosp-2",
    email: "sarah.johnson@mercymedical.com",
    phone: "(555) 333-4444",
    lastLogin: "2023-05-14T09:15:00Z"
  }
];

// Mock departments
export const departments: Department[] = [
  {
    id: "dept-1",
    name: "Cardiology",
    hospitalId: "hosp-1",
    contactPhone: "(555) 111-2233",
    contactEmail: "cardiology@centralhospital.com",
    createdAt: "2022-01-15T10:00:00Z"
  },
  {
    id: "dept-2",
    name: "Neurology",
    hospitalId: "hosp-1",
    contactPhone: "(555) 111-2244",
    contactEmail: "neurology@centralhospital.com",
    createdAt: "2022-01-16T11:00:00Z"
  },
  {
    id: "dept-3",
    name: "Pediatrics",
    hospitalId: "hosp-2",
    contactPhone: "(555) 333-5566",
    contactEmail: "pediatrics@mercymedical.com",
    createdAt: "2022-01-15T10:30:00Z"
  },
  {
    id: "dept-4",
    name: "Orthopedics",
    hospitalId: "hosp-2",
    contactPhone: "(555) 333-5577",
    contactEmail: "orthopedics@mercymedical.com",
    createdAt: "2022-01-16T11:30:00Z"
  }
];

// Mock doctors
export const doctors: Doctor[] = [
  {
    id: "doc-1",
    name: "Dr. Michael Brown",
    hospitalId: "hosp-1",
    departmentId: "dept-1",
    email: "michael.brown@centralhospital.com",
    phone: "(555) 111-3333",
    title: "Cardiologist",
    experience: 10,
    region: "Downtown",
    status: "active",
    schedule: {
      activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      offDays: ["Saturday", "Sunday"],
      shifts: [
        { day: "Monday", startTime: "08:00", endTime: "16:00" },
        { day: "Tuesday", startTime: "08:00", endTime: "16:00" },
        { day: "Wednesday", startTime: "08:00", endTime: "16:00" },
        { day: "Thursday", startTime: "08:00", endTime: "16:00" },
        { day: "Friday", startTime: "08:00", endTime: "16:00" }
      ],
      shiftStartDate: "2023-01-01",
      shiftSwitchTimes: ["08:00", "16:00"]
    }
  },
  {
    id: "doc-2",
    name: "Dr. Jennifer Davis",
    hospitalId: "hosp-1",
    departmentId: "dept-2",
    email: "jennifer.davis@centralhospital.com",
    phone: "(555) 111-4444",
    title: "Neurologist",
    experience: 8,
    region: "Downtown",
    status: "active",
    schedule: {
      activeDays: ["Monday", "Tuesday", "Thursday", "Friday"],
      offDays: ["Wednesday", "Saturday", "Sunday"],
      shifts: [
        { day: "Monday", startTime: "09:00", endTime: "17:00" },
        { day: "Tuesday", startTime: "09:00", endTime: "17:00" },
        { day: "Thursday", startTime: "09:00", endTime: "17:00" },
        { day: "Friday", startTime: "09:00", endTime: "17:00" }
      ],
      shiftStartDate: "2023-01-01",
      shiftSwitchTimes: ["09:00", "17:00"]
    }
  },
  {
    id: "doc-3",
    name: "Dr. Robert Wilson",
    hospitalId: "hosp-2",
    departmentId: "dept-3",
    email: "robert.wilson@mercymedical.com",
    phone: "(555) 333-6666",
    title: "Pediatrician",
    experience: 12,
    region: "Uptown",
    status: "active",
    schedule: {
      activeDays: ["Monday", "Wednesday", "Friday"],
      offDays: ["Tuesday", "Thursday", "Saturday", "Sunday"],
      shifts: [
        { day: "Monday", startTime: "08:00", endTime: "16:00" },
        { day: "Wednesday", startTime: "08:00", endTime: "16:00" },
        { day: "Friday", startTime: "08:00", endTime: "16:00" }
      ],
      shiftStartDate: "2023-01-01",
      shiftSwitchTimes: ["08:00", "16:00"]
    }
  },
  {
    id: "doc-4",
    name: "Dr. Lisa Martinez",
    hospitalId: "hosp-2",
    departmentId: "dept-4",
    email: "lisa.martinez@mercymedical.com",
    phone: "(555) 333-7777",
    title: "Orthopedic Surgeon",
    experience: 15,
    region: "Uptown",
    status: "active",
    schedule: {
      activeDays: ["Tuesday", "Thursday", "Saturday"],
      offDays: ["Monday", "Wednesday", "Friday", "Sunday"],
      shifts: [
        { day: "Tuesday", startTime: "10:00", endTime: "18:00" },
        { day: "Thursday", startTime: "10:00", endTime: "18:00" },
        { day: "Saturday", startTime: "10:00", endTime: "14:00" }
      ],
      shiftStartDate: "2023-01-01",
      shiftSwitchTimes: ["10:00", "18:00"]
    }
  }
];

// Mock users
export const users: User[] = [
  {
    id: "user-1",
    name: "Jane Smith",
    hospitalId: "hosp-1",
    email: "jane.smith@centralhospital.com",
    phone: "(555) 111-5555",
    role: "user",
    status: "active",
    createdAt: "2022-03-10T14:00:00Z"
  },
  {
    id: "user-2",
    name: "Tom Johnson",
    hospitalId: "hosp-1",
    email: "tom.johnson@centralhospital.com",
    phone: "(555) 111-6666",
    role: "user",
    status: "active",
    createdAt: "2022-03-11T15:00:00Z"
  },
  {
    id: "user-3",
    name: "Emily Wilson",
    hospitalId: "hosp-2",
    email: "emily.wilson@mercymedical.com",
    phone: "(555) 333-8888",
    role: "user",
    status: "active",
    createdAt: "2022-03-10T14:30:00Z"
  },
  {
    id: "user-4",
    name: "Mark Thompson",
    hospitalId: "hosp-2",
    email: "mark.thompson@mercymedical.com",
    phone: "(555) 333-9999",
    role: "user",
    status: "inactive",
    createdAt: "2022-03-11T15:30:00Z"
  }
];

// Mock medical records
export const medicalRecords: MedicalRecord[] = [
  {
    id: "rec-1",
    patientName: "Alice Johnson",
    hospitalId: "hosp-1",
    diagnosis: "Hypertension",
    treatmentHistory: [
      "Prescribed Lisinopril 10mg daily",
      "Follow-up appointment scheduled for next month",
      "Recommended lifestyle changes including diet and exercise"
    ],
    assignedDoctorId: "doc-1",
    createdAt: "2023-04-10T10:00:00Z",
    updatedAt: "2023-04-10T10:30:00Z"
  },
  {
    id: "rec-2",
    patientName: "Bob Williams",
    hospitalId: "hosp-1",
    diagnosis: "Migraine",
    treatmentHistory: [
      "Prescribed Sumatriptan for acute attacks",
      "Recommended stress management techniques",
      "Scheduled for neurological evaluation"
    ],
    assignedDoctorId: "doc-2",
    createdAt: "2023-04-11T11:00:00Z",
    updatedAt: "2023-04-11T11:45:00Z"
  },
  {
    id: "rec-3",
    patientName: "Charlie Brown",
    hospitalId: "hosp-2",
    diagnosis: "Ear infection",
    treatmentHistory: [
      "Prescribed Amoxicillin for 10 days",
      "Recommended pain relievers as needed",
      "Follow-up in one week"
    ],
    assignedDoctorId: "doc-3",
    createdAt: "2023-04-10T10:30:00Z",
    updatedAt: "2023-04-10T11:00:00Z"
  },
  {
    id: "rec-4",
    patientName: "Diana Miller",
    hospitalId: "hosp-2",
    diagnosis: "Fractured wrist",
    treatmentHistory: [
      "Cast applied",
      "Prescribed pain medication",
      "Physical therapy to begin in 6 weeks"
    ],
    assignedDoctorId: "doc-4",
    createdAt: "2023-04-11T11:30:00Z",
    updatedAt: "2023-04-11T12:15:00Z"
  }
];

// Mock services
export const services: Service[] = [
  {
    id: "serv-1",
    name: "Heart Check-up",
    hospitalId: "hosp-1",
    daysAvailable: ["Monday", "Wednesday", "Friday"],
    timeSlots: ["09:00", "11:00", "14:00", "16:00"],
    forumPost: {
      id: "post-1",
      title: "New Heart Check-up Service Available",
      content: "We are pleased to announce our new comprehensive heart check-up service. Our expert cardiologists will provide a thorough examination and guidance.",
      createdAt: "2023-03-01T10:00:00Z"
    }
  },
  {
    id: "serv-2",
    name: "Neurological Consultation",
    hospitalId: "hosp-1",
    daysAvailable: ["Tuesday", "Thursday"],
    timeSlots: ["10:00", "13:00", "15:00"]
  },
  {
    id: "serv-3",
    name: "Pediatric Vaccination",
    hospitalId: "hosp-2",
    daysAvailable: ["Monday", "Wednesday", "Friday"],
    timeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00"],
    forumPost: {
      id: "post-2",
      title: "Vaccination Schedule for Children",
      content: "We have updated our vaccination schedule for children. Please check the new schedule and make an appointment for your child's vaccination.",
      createdAt: "2023-03-02T11:00:00Z"
    }
  },
  {
    id: "serv-4",
    name: "Orthopedic Consultation",
    hospitalId: "hosp-2",
    daysAvailable: ["Tuesday", "Thursday", "Saturday"],
    timeSlots: ["10:00", "12:00", "16:00"]
  }
];

// Mock ratings
export const ratings: Rating[] = [
  {
    id: "rate-1",
    hospitalId: "hosp-1",
    rating: 4.5,
    comment: "Excellent care and attention from Dr. Brown",
    patientName: "Alice Johnson",
    createdAt: "2023-05-01T09:00:00Z"
  },
  {
    id: "rate-2",
    hospitalId: "hosp-1",
    rating: 4.0,
    comment: "Good service but long waiting time",
    patientName: "Bob Williams",
    createdAt: "2023-05-02T10:00:00Z"
  },
  {
    id: "rate-3",
    hospitalId: "hosp-2",
    rating: 4.8,
    comment: "Dr. Wilson was fantastic with my child",
    patientName: "Charlie Brown",
    createdAt: "2023-05-01T09:30:00Z"
  },
  {
    id: "rate-4",
    hospitalId: "hosp-2",
    rating: 3.5,
    comment: "Good treatment but the facility needs improvement",
    patientName: "Diana Miller",
    createdAt: "2023-05-02T10:30:00Z"
  }
];

// Mock referrals
export const referrals: Referral[] = [
  {
    id: "ref-1",
    hospitalId: "hosp-1",
    patientName: "Edward Green",
    patientNumber: "(555) 222-1111",
    reason: "Specialized cardiac treatment",
    referringDoctor: "Dr. Johnson",
    referringHospital: "Community Clinic",
    treatmentGiven: "Initial assessment completed",
    status: "accepted",
    createdAt: "2023-04-20T08:00:00Z"
  },
  {
    id: "ref-2",
    hospitalId: "hosp-1",
    patientName: "Fiona White",
    patientNumber: "(555) 222-2222",
    reason: "Neurological evaluation",
    referringDoctor: "Dr. Thompson",
    referringHospital: "Downtown Medical",
    treatmentGiven: "Pending",
    status: "pending",
    createdAt: "2023-04-21T09:00:00Z"
  },
  {
    id: "ref-3",
    hospitalId: "hosp-2",
    patientName: "George Black",
    patientNumber: "(555) 444-1111",
    reason: "Pediatric specialist consultation",
    referringDoctor: "Dr. Davis",
    referringHospital: "Family Practice Center",
    treatmentGiven: "Initial consultation completed",
    status: "accepted",
    createdAt: "2023-04-20T08:30:00Z"
  },
  {
    id: "ref-4",
    hospitalId: "hosp-2",
    patientName: "Hannah Gray",
    patientNumber: "(555) 444-2222",
    reason: "Orthopedic surgery evaluation",
    referringDoctor: "Dr. Martin",
    referringHospital: "Sports Medicine Clinic",
    treatmentGiven: "Declined due to lack of availability",
    status: "declined",
    createdAt: "2023-04-21T09:30:00Z"
  }
];

// Mock notifications
export const notifications: Notification[] = [
  {
    id: "notif-1",
    hospitalId: "hosp-1",
    title: "New Referral",
    message: "You have received a new patient referral from Community Clinic",
    type: "info",
    read: false,
    createdAt: "2023-05-14T08:00:00Z"
  },
  {
    id: "notif-2",
    hospitalId: "hosp-1",
    title: "System Maintenance",
    message: "The system will be under maintenance tonight from 2:00 AM to 4:00 AM",
    type: "warning",
    read: true,
    createdAt: "2023-05-13T10:00:00Z"
  },
  {
    id: "notif-3",
    hospitalId: "hosp-2",
    title: "New Rating",
    message: "Your hospital has received a new 4.8-star rating",
    type: "success",
    read: false,
    createdAt: "2023-05-14T08:30:00Z"
  },
  {
    id: "notif-4",
    hospitalId: "hosp-2",
    title: "Staff Meeting",
    message: "Reminder: Staff meeting tomorrow at 9:00 AM in Conference Room A",
    type: "info",
    read: true,
    createdAt: "2023-05-13T10:30:00Z"
  }
];

// Mock metrics
export const metrics: Record<string, Metrics> = {
  "hosp-1": {
    totalMedicalRecords: 250,
    totalDepartments: 8,
    totalUsers: 45,
    totalDoctors: 20
  },
  "hosp-2": {
    totalMedicalRecords: 180,
    totalDepartments: 6,
    totalUsers: 35,
    totalDoctors: 15
  }
};