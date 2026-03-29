import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { PeerHospitalPayload } from './buildDiagnosticPayload';

const SERIAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateReferralSerial(length = 7): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += SERIAL_CHARS[Math.floor(Math.random() * SERIAL_CHARS.length)];
  }
  return s;
}

export interface WebReferralFormValues {
  patientRegNo: string;
  patientName: string;
  sex: string;
  dateOfBirth: string; // yyyy-MM-dd
  age: string;
  examinationFindings: string;
  treatmentAdministered: string;
  diagnosis: string;
  reasonForReferral: string;
}

async function resolveTargetHospitalDocId(
  peer: PeerHospitalPayload
): Promise<{ id: string; displayName: string } | null> {
  const byId = await getDoc(doc(db, 'Hospital', peer.hospital_id));
  if (byId.exists()) {
    const d = byId.data() as Record<string, unknown>;
    const name =
      (typeof d['Hospital Name'] === 'string' && d['Hospital Name']) ||
      (typeof d.name === 'string' && d.name) ||
      peer.name;
    return { id: peer.hospital_id, displayName: String(name) };
  }

  const nm = peer.name.trim();
  if (!nm) return null;

  const q = query(collection(db, 'Hospital'), where('Hospital Name', '==', nm));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, displayName: nm };
}

async function serialExistsAtHospital(hospitalDocId: string, serial: string): Promise<boolean> {
  const d = await getDoc(doc(db, 'Hospital', hospitalDocId, 'Referrals', serial));
  return d.exists();
}

async function generateUniqueSerialForHospital(hospitalDocId: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const serial = generateReferralSerial(7);
    if (!(await serialExistsAtHospital(hospitalDocId, serial))) return serial;
  }
  return `${generateReferralSerial(7)}${Date.now().toString(36).slice(-4)}`;
}

export interface SubmitWebReferralResult {
  serialNumber: string;
  targetHospitalId: string;
  targetHospitalName: string;
}

/** Writes the same document shape as the mhealth app (`ReferralSummaryScreen`). */
export async function submitWebReferral(
  targetPeer: PeerHospitalPayload,
  values: WebReferralFormValues,
  referredByUid: string,
  file?: File | null
): Promise<SubmitWebReferralResult> {
  const resolved = await resolveTargetHospitalDocId(targetPeer);
  if (!resolved) {
    throw new Error(
      'That health facility could not be found in the network. It may have been removed or renamed.',
    );
  }

  const serialNumber = await generateUniqueSerialForHospital(resolved.id);

  let fileUrl = 'No file uploaded';
  if (file && file.size > 0) {
    const storageRef = ref(storage, `referral_files/${serialNumber}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  const referralRef = doc(db, 'Hospital', resolved.id, 'Referrals', serialNumber);
  await setDoc(referralRef, {
    'Serial Number': serialNumber,
    'Patient Reg. No.': values.patientRegNo.trim() || 'N/A',
    Name: values.patientName.trim(),
    Sex: values.sex.trim() || 'N/A',
    'Date of Birth': values.dateOfBirth.trim() || 'Not provided',
    Age: values.age.trim() || 'N/A',
    'Examination Findings': values.examinationFindings.trim(),
    'Treatment Administered': values.treatmentAdministered.trim(),
    Diagnosis: values.diagnosis.trim() || 'N/A',
    'Reason for Referral': values.reasonForReferral.trim(),
    'Uploaded Medical Records': fileUrl,
    'Selected Health Facility': resolved.displayName,
    Timestamp: serverTimestamp(),
    'Referred By': referredByUid,
  });

  return {
    serialNumber,
    targetHospitalId: resolved.id,
    targetHospitalName: resolved.displayName,
  };
}
