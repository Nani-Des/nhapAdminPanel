import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export type ReferralContextPayload = Record<string, unknown> | null;

export interface CurrentHospitalPayload {
  hospital_id: string;
  name: string;
  city?: string;
  region?: string;
  location?: string;
  lat?: number;
  lng?: number;
  departments: { id: string; name: string }[];
  services: { name: string; days?: string[]; time?: string; description?: string }[];
  equipment: { name: string; category: string; quantity: number; notes?: string }[];
  physicians: {
    designation?: string;
    title?: string;
    department_id?: string;
    name?: string;
  }[];
}

export interface PeerHospitalPayload {
  hospital_id: string;
  name: string;
  city?: string;
  region?: string;
  location?: string;
  lat?: number;
  lng?: number;
  services: { name: string; description?: string }[];
  equipment: { name: string; category: string; quantity: number }[];
  physicians: { designation?: string; title?: string; name?: string }[];
  /** Set when services/equipment/physicians could not be fully loaded (rules, offline, etc.). */
  data_quality_note?: string;
}

function hospitalDisplayName(data: Record<string, unknown>): string {
  const n = data['Hospital Name'] ?? data.name;
  return typeof n === 'string' ? n : '';
}

/** Services + equipment from Hospital/{id} subcollections (matches admin panel). */
export async function fetchHospitalServicesAndEquipment(hospitalId: string): Promise<{
  services: CurrentHospitalPayload['services'];
  equipment: CurrentHospitalPayload['equipment'];
}> {
  const [servicesSnap, equipSnap] = await Promise.all([
    getDocs(collection(db, 'Hospital', hospitalId, 'Services')),
    getDocs(collection(db, 'Hospital', hospitalId, 'Equipment')),
  ]);

  const services = servicesSnap.docs.map((d) => {
    const x = d.data();
    return {
      name: String(x['Service Name'] ?? ''),
      days: Array.isArray(x.Days) ? x.Days.map(String) : undefined,
      time: x.Time != null ? String(x.Time) : undefined,
      description: x.Description != null ? String(x.Description) : undefined,
    };
  });

  const equipment = equipSnap.docs.map((d) => {
    const x = d.data();
    return {
      name: String(x.name ?? ''),
      category: String(x.category ?? ''),
      quantity: typeof x.quantity === 'number' ? x.quantity : Number(x.quantity) || 1,
      notes: x.notes != null ? String(x.notes) : undefined,
    };
  });

  return { services, equipment };
}

export async function fetchReferralBySerial(
  hospitalId: string,
  serial: string
): Promise<ReferralContextPayload> {
  const trimmed = serial.trim();
  if (!trimmed) return null;

  const q = query(
    collection(db, 'Hospital', hospitalId, 'Referrals'),
    where('Serial Number', '==', trimmed)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const x = snap.docs[0].data();
  return {
    referral_document_id: snap.docs[0].id,
    'Serial Number': x['Serial Number'],
    Name: x.Name,
    Age: x.Age,
    Sex: x.Sex,
    'Date of Birth': x['Date of Birth'],
    'Patient Reg. No.': x['Patient Reg. No.'],
    'Reason for Referral': x['Reason for Referral'],
    Diagnosis: x.Diagnosis,
    'Examination Findings': x['Examination Findings'],
    'Treatment Administered': x['Treatment Administered'],
    'Referred By': x['Referred By'],
    'Selected Health Facility': x['Selected Health Facility'],
    Status: x.Status,
    'Uploaded Medical Records': x['Uploaded Medical Records'],
    Timestamp: x.Timestamp,
  };
}

async function fetchPhysiciansForHospital(hospitalId: string): Promise<CurrentHospitalPayload['physicians']> {
  try {
    const q = query(
      collection(db, 'Users'),
      where('Hospital ID', '==', hospitalId),
      where('Role', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const u = d.data();
      const fname = u.Fname != null ? String(u.Fname) : '';
      const lname = u.Lname != null ? String(u.Lname) : '';
      const name = [fname, lname].filter(Boolean).join(' ').trim() || undefined;
      return {
        name,
        designation: u.Designation != null ? String(u.Designation) : undefined,
        title: u.Title != null ? String(u.Title) : undefined,
        department_id:
          u['Department ID'] != null
            ? String(u['Department ID'])
            : u.DepartmentID != null
              ? String(u.DepartmentID)
              : undefined,
      };
    });
  } catch {
    return [];
  }
}

/** Other hospitals: metadata + services, equipment, active staff (for referral matching on the API side). */
export async function fetchPeerHospitalsPayload(
  currentHospitalId: string
): Promise<PeerHospitalPayload[]> {
  let root;
  try {
    root = await getDocs(collection(db, 'Hospital'));
  } catch (e) {
    console.error('fetchPeerHospitalsPayload: could not list Hospital', e);
    return [];
  }

  const others = root.docs.filter((d) => d.id !== currentHospitalId);
  const out: PeerHospitalPayload[] = [];

  for (const hDoc of others) {
    const hid = hDoc.id;
    const data = hDoc.data() as Record<string, unknown>;
    const baseName = hospitalDisplayName(data) || hid;
    const base = {
      hospital_id: hid,
      name: baseName,
      city: data.City != null ? String(data.City) : undefined,
      region: data.Region != null ? String(data.Region) : undefined,
      location: data.Location != null ? String(data.Location) : undefined,
      lat: typeof data.Lat === 'number' ? data.Lat : undefined,
      lng: typeof data.Lng === 'number' ? data.Lng : undefined,
    };

    try {
      const { services, equipment } = await fetchHospitalServicesAndEquipment(hid);
      const physicians = await fetchPhysiciansForHospital(hid);

      out.push({
        ...base,
        services: services.map((s) => ({ name: s.name, description: s.description })),
        equipment: equipment.map((e) => ({
          name: e.name,
          category: e.category,
          quantity: e.quantity,
        })),
        physicians,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.warn(`Peer hospital ${hid} partial load:`, e);
      out.push({
        ...base,
        services: [],
        equipment: [],
        physicians: [],
        data_quality_note: `Partial data only (could not load subcollections or staff: ${msg})`,
      });
    }
  }

  return out;
}

export async function buildCurrentHospitalPayload(
  hospitalId: string,
  departmentIds: string[]
): Promise<CurrentHospitalPayload> {
  const hospSnap = await getDoc(doc(db, 'Hospital', hospitalId));
  const h = hospSnap.exists() ? (hospSnap.data() as Record<string, unknown>) : {};

  const departments: { id: string; name: string }[] = [];
  for (const id of departmentIds.slice(0, 30)) {
    const dSnap = await getDoc(doc(db, 'Department', id));
    if (dSnap.exists()) {
      const dd = dSnap.data() as Record<string, unknown>;
      departments.push({
        id,
        name: String(dd['Department Name'] ?? id),
      });
    }
  }

  const { services, equipment } = await fetchHospitalServicesAndEquipment(hospitalId);
  const physicians = await fetchPhysiciansForHospital(hospitalId);

  return {
    hospital_id: hospitalId,
    name: hospitalDisplayName(h) || hospitalId,
    city: h.City != null ? String(h.City) : undefined,
    region: h.Region != null ? String(h.Region) : undefined,
    location: h.Location != null ? String(h.Location) : undefined,
    lat: typeof h.Lat === 'number' ? h.Lat : undefined,
    lng: typeof h.Lng === 'number' ? h.Lng : undefined,
    departments,
    services,
    equipment,
    physicians,
  };
}

export interface DiagnosticRequestBody {
  presenting_note: string;
  /** Present only when the doctor loaded a referral by serial number. */
  referral_context?: ReferralContextPayload;
  current_hospital: CurrentHospitalPayload;
  peer_hospitals: PeerHospitalPayload[];
  requested_at: string;
  client: string;
}
