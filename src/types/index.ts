import { Timestamp } from "firebase/firestore";

export interface Hospital {
  id: string;
  "Hospital ID": string;
  "Hospital Name": string; 
  ["Hospital Department"]:[]
  Location: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface Admin {
  id: string;
  name: string;
  pin: string;
  hospitalId: string;
  email: string;
  phone: string;
  lastLogin: string;
  isAdmin: boolean
}

export interface Department {
  id: string;
  ["Department ID"]: string;
  ["Department Name"]: string;
}

export interface Users {
  id: string;
  ["User ID"]:string;
  Fname: string;
  Lname: string;
  ["Department ID"]: string;
  ["Hospital ID"]: string;
  Title: string;
  Email: string;
  Designation: string;
  ["Mobile Number"]: string;
  Role: boolean
  Status: boolean;
  CreatedAt: Timestamp;
  // Schedule: Schedule;
  Region: string;
  'User Pic': String ;
  Permissions?: string[] | { [key: string]: boolean };
}

export interface Schedule {
  ["Active Days"]: number;
  ["Off Days"]: number;
  ["Shift"]: number;
  ["Shift Start"]: Timestamp;
  ["Shift Switch"]: number;
}


export interface MedicalRecord {
  id: string;
  patientName: string;
  hospitalId: string;
  diagnosis: string;
  treatmentHistory: string[];
  assignedDoctorId: string;
  createdAt: string;
  updatedAt: string;
  fileUrl: string; // <- this should be in your record
  fileType: 'pdf' | 'image'; // optional but useful
}

export interface Service {
  id?: string;
  "Service Name": string;
  Days: string[];
  Time: string;
   'Post ID': string;
    Description: string;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}


export interface Referral {
  id: string;
  'Serial Number'?: string;
  'Name'?: string;
  'Age'?: string;
  'Date of Birth'?: string;
  'Sex'?: string;
  'Reason for Referral'?: string;
  'Diagnosis'?: string;
  'Treatment Administered'?: string;
  'Referred By'?: string;
  'Uploaded Medical Records'?: string;
  // add any other properties you access in your code
  }

export interface Notification {
  id: string;
  hospitalId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
}


export interface Metrics {
  totalMedicalRecords: number;
  totalDepartments: number;
  totalUsers: number;
  totalDoctors: number;
}