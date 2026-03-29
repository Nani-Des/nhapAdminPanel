import React, { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Paperclip, Send } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { PeerHospitalPayload } from "../../services/buildDiagnosticPayload";
import { submitWebReferral } from "../../services/referralSubmission";
import { toast } from "react-hot-toast";

function ageFromDob(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  const t = new Date();
  let age = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
  return String(Math.max(0, age));
}

export interface ReferralWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected destination (from a referral action button). User can still pick another facility. */
  initialTarget: PeerHospitalPayload | null;
  /** Full peer list for the network (same as diagnostic payload). */
  peerOptions: PeerHospitalPayload[];
  /** Suggested text for "Reason for referral" (e.g. clinical note or AI summary). */
  defaultReason?: string;
  referredByUid: string;
}

const ReferralWorkflowModal: React.FC<ReferralWorkflowModalProps> = ({
  isOpen,
  onClose,
  initialTarget,
  peerOptions,
  defaultReason = "",
  referredByUid,
}) => {
  const sortedPeers = useMemo(
    () =>
      [...peerOptions].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [peerOptions],
  );

  const [selectedId, setSelectedId] = useState<string>("");
  const [patientRegNo, setPatientRegNo] = useState("");
  const [patientName, setPatientName] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [ageDisplay, setAgeDisplay] = useState("");
  const [examinationFindings, setExaminationFindings] = useState("");
  const [treatmentAdministered, setTreatmentAdministered] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [reasonForReferral, setReasonForReferral] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const id = initialTarget?.hospital_id ?? sortedPeers[0]?.hospital_id ?? "";
    setSelectedId(id);
    setReasonForReferral(defaultReason.trim());
    setPatientRegNo("");
    setPatientName("");
    setSex("");
    setDateOfBirth("");
    setAgeDisplay("");
    setExaminationFindings("");
    setTreatmentAdministered("");
    setDiagnosis("");
    setFile(null);
  }, [isOpen, initialTarget, defaultReason, sortedPeers]);

  useEffect(() => {
    if (dateOfBirth) setAgeDisplay(ageFromDob(dateOfBirth));
    else setAgeDisplay("");
  }, [dateOfBirth]);

  const selectedPeer = useMemo(() => {
    return sortedPeers.find((p) => p.hospital_id === selectedId) ?? null;
  }, [sortedPeers, selectedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeer) {
      toast.error("Choose the receiving health facility.");
      return;
    }
    if (!patientName.trim()) {
      toast.error("Patient name is required.");
      return;
    }
    if (!sex) {
      toast.error("Select sex.");
      return;
    }
    if (!dateOfBirth) {
      toast.error("Date of birth is required.");
      return;
    }
    if (!reasonForReferral.trim()) {
      toast.error("Reason for referral is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitWebReferral(
        selectedPeer,
        {
          patientRegNo,
          patientName: patientName.trim(),
          sex,
          dateOfBirth,
          age: ageDisplay,
          examinationFindings,
          treatmentAdministered,
          diagnosis,
          reasonForReferral: reasonForReferral.trim(),
        },
        referredByUid,
        file,
      );
      toast.success(
        `Referral sent to ${result.targetHospitalName}. Serial: ${result.serialNumber}`,
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Could not send referral.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title="Send referral"
      size="xl"
      showCloseButton={!submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[min(78vh,720px)] overflow-y-auto pr-1">
        <div>
          <label
            htmlFor="referral-destination"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Receiving facility
          </label>
          <div className="flex items-start gap-2 rounded-xl border border-gray-200 bg-teal-50/40 p-3">
            <Building2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
            <select
              id="referral-destination"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={submitting || sortedPeers.length === 0}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            >
              {sortedPeers.length === 0 ? (
                <option value="">No other facilities in network</option>
              ) : (
                sortedPeers.map((p) => (
                  <option key={p.hospital_id} value={p.hospital_id}>
                    {p.name}
                    {p.city ? ` — ${p.city}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Patient registration no. (optional)"
            value={patientRegNo}
            onChange={(e) => setPatientRegNo(e.target.value)}
            disabled={submitting}
            placeholder="Hospital MRN / reg"
          />
          <Input
            label="Patient name"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Sex</span>
          <div className="flex flex-wrap gap-4">
            {(["Male", "Female", "Other"] as const).map((s) => (
              <label key={s} className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="radio"
                  name="sex"
                  value={s}
                  checked={sex === s}
                  onChange={() => setSex(s)}
                  disabled={submitting}
                  className="text-teal-600 focus:ring-teal-500"
                />
                {s}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            id="dob-ref"
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={submitting}
            required
          />
          <Input
            label="Age (from DOB)"
            value={ageDisplay}
            readOnly
            disabled
            className="bg-gray-50"
          />
        </div>

        <div>
          <label
            htmlFor="exam-findings"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Examination findings (optional)
          </label>
          <textarea
            id="exam-findings"
            rows={3}
            value={examinationFindings}
            onChange={(e) => setExaminationFindings(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="treatment"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Treatment administered (optional)
          </label>
          <textarea
            id="treatment"
            rows={3}
            value={treatmentAdministered}
            onChange={(e) => setTreatmentAdministered(e.target.value)}
            disabled={submitting}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        </div>

        <Input
          label="Diagnosis (optional)"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          disabled={submitting}
        />

        <div>
          <label
            htmlFor="reason-ref"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Reason for referral
          </label>
          <textarea
            id="reason-ref"
            rows={3}
            value={reasonForReferral}
            onChange={(e) => setReasonForReferral(e.target.value)}
            disabled={submitting}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            placeholder="Clinical reason for transfer or specialist care"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Attachments (optional)
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-100">
            <Paperclip className="w-4 h-4" />
            <span>{file ? file.name : "PDF or image — same as mobile app"}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedPeer}
            icon={
              submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )
            }
          >
            {submitting ? "Sending…" : "Confirm & send referral"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReferralWorkflowModal;
