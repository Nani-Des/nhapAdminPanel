/**
 * Suggested equipment catalog for hospital register (admin can add custom items too).
 */
export interface EquipmentCatalogCategory {
  category: string;
  items: string[];
}

export const EQUIPMENT_CATALOG: EquipmentCatalogCategory[] = [
  {
    category: 'Diagnostic & Imaging Equipment',
    items: [
      'X-Ray Machine',
      'Ultrasound Machine',
      'CT Scanner (Computed Tomography)',
      'MRI Machine (Magnetic Resonance Imaging)',
      'Mammography Machine',
      'Fluoroscopy Machine',
      'DEXA Scan (Bone Density)',
      'Endoscope / Colonoscope',
      'Bronchoscope',
      'ECG / EKG Machine (Electrocardiogram)',
      'Echocardiogram Machine',
      'EEG Machine (Electroencephalogram)',
      'Doppler Machine',
    ],
  },
  {
    category: 'Laboratory Equipment',
    items: [
      'Full Blood Count (FBC/CBC) Analyzer',
      'Blood Chemistry Analyzer (LFT, RFT, Electrolytes)',
      'Blood Gas Analyzer',
      'Coagulation Analyzer (PT/INR)',
      'Microbiology Culture Lab',
      'Histopathology / Biopsy Lab',
      'Blood Bank & Cross-matching',
      'Urinalysis Machine',
      'HIV / Rapid Diagnostic Test Kits',
      'Malaria RDT / Microscopy',
      'Pregnancy Test Kits',
      'Thyroid Function Test (TFT) capability',
      'HbA1c Analyzer (Diabetes monitoring)',
      'Troponin Rapid Test (Cardiac marker)',
    ],
  },
  {
    category: 'Critical Care & Life Support',
    items: [
      'ICU Beds (number)',
      'Ventilators / Mechanical Ventilators',
      'CPAP / BiPAP Machines',
      'Defibrillator / AED',
      'Cardiac Monitor',
      'Pulse Oximeters',
      'Infusion Pumps / Syringe Drivers',
      'Suction Machine',
      'Oxygen Supply (Cylinders vs Piped)',
      'Oxygen Concentrators',
      'Nebulizer',
      'Neonatal Incubator',
      'Phototherapy Unit (Jaundice treatment)',
    ],
  },
  {
    category: 'Surgical & Theatre Equipment',
    items: [
      'Operating Theatre (number of theatres)',
      'Anaesthesia Machine',
      'Surgical Lights & Tables',
      'Laparoscopic Surgery Equipment',
      'Cautery / Electrosurgical Unit',
      'Orthopaedic Surgical Set',
      'C-Arm Fluoroscopy (for surgery guidance)',
      'Sterilization / Autoclave Unit',
      'Blood Transfusion capability',
    ],
  },
  {
    category: 'Maternity & Reproductive Health',
    items: [
      'Delivery Beds / Labour Ward',
      'CTG Machine (Cardiotocograph — fetal monitoring)',
      'Vacuum Extractor / Forceps',
      'Incubator (Neonatal)',
      'Phototherapy Unit',
      'PMTCT Services (HIV prevention mother-to-child)',
    ],
  },
  {
    category: 'Pharmacy & Treatment Capability',
    items: [
      'Pharmacy (on-site / 24hr)',
      'IV Fluid availability',
      'Emergency Drug Stock (Adrenaline, Atropine, etc.)',
      'Chemotherapy Administration capability',
      'Dialysis Machine (Haemodialysis)',
      'Physiotherapy Equipment',
    ],
  },
];
