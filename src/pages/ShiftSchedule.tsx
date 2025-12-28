import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Calendar, Printer } from "lucide-react";
import { useHospital } from "../contexts/HospitalContext";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import ShiftTable from "../components/ui/ShiftTable";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  getDoc,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { Schedule, Users } from "../types";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { debounce } from "lodash";

interface ShiftTiming {
  Morning: { Start: string; End: string };
  Afternoon: { Start: string; End: string };
  Evening: { Start: string; End: string };
}

export enum ShiftCode {
  WholeDay = "WD",
  MorningShift = "MS",
  AfternoonShift = "AS",
  NightShift = "NS",
  Off = "OF",
  Holiday = "HO",
  Leave = "LV",
  NotAvailable = "N/A",
}

export enum ShiftType {
  WholeDay = 1,
  MorningEvening = 2,
  MorningAfternoonEvening = 3,
}

const shiftConfig: Record<
  ShiftCode,
  { color: string; tooltip: (timings: ShiftTiming | null) => string }
> = {
  [ShiftCode.WholeDay]: {
    color: "bg-teal-500",
    tooltip: () => "Whole Day",
  },
  [ShiftCode.MorningShift]: {
    color: "bg-blue-600",
    tooltip: (timings) =>
      timings
        ? `Morning Shift (${timings.Morning.Start} - ${timings.Morning.End})`
        : "Morning Shift",
  },
  [ShiftCode.AfternoonShift]: {
    color: "bg-orange-600",
    tooltip: (timings) =>
      timings
        ? `Afternoon Shift (${timings.Afternoon.Start} - ${timings.Afternoon.End})`
        : "Afternoon Shift",
  },
  [ShiftCode.NightShift]: {
    color: "bg-purple-600",
    tooltip: (timings) =>
      timings
        ? `Night Shift (${timings.Evening.Start} - ${timings.Evening.End})`
        : "Night Shift",
  },
  [ShiftCode.Off]: {
    color: "bg-gray-500",
    tooltip: () => "Day Off",
  },
  [ShiftCode.Holiday]: {
    color: "bg-red-500",
    tooltip: () => "Holiday",
  },
  [ShiftCode.Leave]: {
    color: "bg-yellow-600",
    tooltip: () => "Leave",
  },
  [ShiftCode.NotAvailable]: {
    color: "bg-gray-800",
    tooltip: () => "Not available (before shift start date)",
  },
};

// Custom hook for shift schedule logic
const useShiftSchedule = (
  users: Users[],
  selectedMonth: Date,
  hospitalId: string
) => {
  const [userSchedules, setUserSchedules] = useState<
    Record<string, Schedule | null>
  >({});
  const [doctorShifts, setDoctorShifts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});

  const handleError = useCallback((error: unknown, message: string) => {
    console.error(message, error);
    toast.error(message);
  }, []);

  const generateShiftSchedule = async (
    activeDays: number,
    offDays: number,
    shiftSwitch: number,
    shiftType: number,
    shiftStart: Date,
    userId: string
  ): Promise<Record<string, string>> => {
    const daysInMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    ).getDate();
    const schedule: Record<string, string> = {};

    // Fetch custom shifts
    const customShiftsQuery = query(
      collection(db, "Users", userId, "CustomShifts"),
      where(
        "Date",
        ">=",
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      ),
      where(
        "Date",
        "<",
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
      )
    );
    const customShiftsSnapshot = await getDocs(customShiftsQuery);
    const customShiftMap: Record<string, string> = {};
    customShiftsSnapshot.forEach((doc) => {
      const date = doc.data().Date.toDate();
      customShiftMap[date.getDate().toString()] =
        doc.data().Shift || ShiftCode.WholeDay;
    });

    // Fetch leaves
    const leavesQuery = query(
      collection(db, "Users", userId, "Leaves"),
      where(
        "StartDate",
        "<=",
        new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          daysInMonth
        )
      ),
      where(
        "EndDate",
        ">=",
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      )
    );
    const leavesSnapshot = await getDocs(leavesQuery);
    const leaveDays: Date[] = [];
    leavesSnapshot.forEach((doc) => {
      const start = doc.data().StartDate.toDate();
      const end = doc.data().EndDate.toDate();
      for (
        let day = new Date(start);
        day <= end;
        day.setDate(day.getDate() + 1)
      ) {
        if (
          day.getMonth() === selectedMonth.getMonth() &&
          day.getFullYear() === selectedMonth.getFullYear()
        ) {
          leaveDays.push(new Date(day));
        }
      }
    });

    const cycleLength = activeDays + offDays;

    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth(),
        i
      );
      const dayStr = i.toString();

      if (day < new Date(shiftStart.setHours(0, 0, 0, 0))) {
        schedule[dayStr] = ShiftCode.NotAvailable;
        continue;
      }

      if (customShiftMap[dayStr]) {
        schedule[dayStr] = customShiftMap[dayStr];
        continue;
      }

      if (
        leaveDays.some(
          (d) => d.getDate() === i && d.getMonth() === selectedMonth.getMonth()
        )
      ) {
        schedule[dayStr] = ShiftCode.Leave;
        continue;
      }

      const daysSinceStart = Math.floor(
        (day.getTime() - shiftStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceStart < 0) {
        schedule[dayStr] = ShiftCode.WholeDay;
        continue;
      }

      const cycleIndex = daysSinceStart % cycleLength;
      if (cycleIndex >= activeDays) {
        schedule[dayStr] = ShiftCode.Off;
        continue;
      }

      const fullCycles = Math.floor(daysSinceStart / cycleLength);
      const activeDayIndex = fullCycles * activeDays + cycleIndex;

      switch (shiftType) {
        case ShiftType.WholeDay:
          schedule[dayStr] = ShiftCode.WholeDay;
          break;
        case ShiftType.MorningEvening:
          const block2 = Math.floor(activeDayIndex / shiftSwitch);
          schedule[dayStr] =
            block2 % 2 === 0 ? ShiftCode.MorningShift : ShiftCode.NightShift;
          break;
        case ShiftType.MorningAfternoonEvening:
          const block3 = Math.floor(activeDayIndex / shiftSwitch);
          const modBlock = block3 % 3;
          schedule[dayStr] =
            modBlock === 0
              ? ShiftCode.MorningShift
              : modBlock === 1
              ? ShiftCode.AfternoonShift
              : ShiftCode.NightShift;
          break;
        default:
          schedule[dayStr] = ShiftCode.WholeDay;
      }
    }
    return schedule;
  };

  const detectConflicts = useCallback(
    (shifts: Record<string, Record<string, string>>) => {
      const daysInMonth = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() + 1,
        0
      ).getDate();
      const conflictDays: string[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = i.toString();
        const activeDoctors = users.reduce((count, user) => {
          const shift = shifts[user.id]?.[dayStr] || "";
          return shift !== ShiftCode.Off &&
            shift !== ShiftCode.Holiday &&
            shift !== ShiftCode.Leave
            ? count + 1
            : count;
        }, 0);
        if (activeDoctors === 0) {
          conflictDays.push(dayStr);
        }
      }
      setConflicts(conflictDays);
    },
    [users, selectedMonth]
  );

  const fetchDoctorSchedules = useCallback(async () => {
    const newDoctorShifts: Record<string, Record<string, string>> = {};
    for (const user of users) {
      setLoadingUsers((prev) => ({ ...prev, [user.id]: true }));
      try {
        const scheduleSnapshot = await getDocs(
          collection(db, "Users", user.id, "Schedule")
        );
        const schedule = scheduleSnapshot.empty
          ? null
          : (scheduleSnapshot.docs[0].data() as Schedule);

        if (!userSchedules[user.id] && schedule) {
          setUserSchedules((prev) => ({ ...prev, [user.id]: schedule }));
        }

        if (schedule) {
          const shifts = await generateShiftSchedule(
            schedule["Active Days"] || 5,
            schedule["Off Days"] || 2,
            schedule["Shift Switch"] || 5,
            schedule.Shift || ShiftType.WholeDay,
            schedule["Shift Start"]
              ? schedule["Shift Start"].toDate()
              : new Date(),
            user.id
          );
          newDoctorShifts[user.id] = shifts;
        } else {
          const defaultSchedule = {
            Shift: ShiftType.WholeDay,
            "Active Days": 5,
            "Off Days": 2,
            "Shift Switch": 5,
            "Shift Start": Timestamp.fromDate(new Date()),
          };
          await setDoc(
            doc(collection(db, "Users", user.id, "Schedule")),
            defaultSchedule
          );
          const shifts = await generateShiftSchedule(
            5,
            2,
            5,
            ShiftType.WholeDay,
            new Date(),
            user.id
          );
          newDoctorShifts[user.id] = shifts;
          setUserSchedules((prev) => ({ ...prev, [user.id]: defaultSchedule }));
        }
      } catch (e) {
        handleError(e, `Error generating schedule for ${user.id}`);
        newDoctorShifts[user.id] = {};
      } finally {
        setLoadingUsers((prev) => ({ ...prev, [user.id]: false }));
      }
    }
    setDoctorShifts(newDoctorShifts);
    detectConflicts(newDoctorShifts);
  }, [users, selectedMonth, handleError, detectConflicts]);

  useEffect(() => {
    if (!hospitalId || users.length === 0) {
      handleError(null, "No hospital or users found.");
      return;
    }

    const initialSchedules: Record<string, Schedule | null> = {};
    users.forEach((user) => {
      initialSchedules[user.id] = null;
      setLoadingUsers((prev) => ({ ...prev, [user.id]: true }));
    });
    setUserSchedules(initialSchedules);

    const unsubs: (() => void)[] = [];
    users.forEach((user) => {
      const scheduleRef = collection(db, "Users", user.id, "Schedule");
      const unsubSchedule = onSnapshot(
        scheduleRef,
        async (snapshot) => {
          const updated = { ...userSchedules };
          if (snapshot.empty) {
            const defaultSchedule: Schedule = {
              Shift: ShiftType.WholeDay,
              "Active Days": 5,
              "Off Days": 2,
              "Shift Switch": 5,
              "Shift Start": Timestamp.fromDate(new Date()),
            };
            try {
              await setDoc(doc(scheduleRef), defaultSchedule);
              updated[user.id] = defaultSchedule;
              setUserSchedules(updated);
              await fetchDoctorSchedules();
            } catch (e) {
              handleError(e, `Error setting default schedule for ${user.id}`);
            }
          } else {
            updated[user.id] = snapshot.docs[0].data() as Schedule;
            setUserSchedules(updated);
            await fetchDoctorSchedules();
          }
        },
        (error) => {
          handleError(error, `Error fetching schedule for ${user.id}`);
        }
      );
      unsubs.push(unsubSchedule);

      const customShiftsQuery = query(
        collection(db, "Users", user.id, "CustomShifts"),
        where(
          "Date",
          ">=",
          new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
        ),
        where(
          "Date",
          "<",
          new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
        )
      );
      const unsubCustom = onSnapshot(
        customShiftsQuery,
        () => {
          fetchDoctorSchedules();
        },
        (error) => {
          handleError(error, `Error fetching custom shifts for ${user.id}`);
        }
      );
      unsubs.push(unsubCustom);

      const leavesQuery = query(
        collection(db, "Users", user.id, "Leaves"),
        where(
          "StartDate",
          "<=",
          new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
        ),
        where(
          "EndDate",
          ">=",
          new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
        )
      );
      const unsubLeaves = onSnapshot(
        leavesQuery,
        () => {
          fetchDoctorSchedules();
        },
        (error) => {
          handleError(error, `Error fetching leaves for ${user.id}`);
        }
      );
      unsubs.push(unsubLeaves);
    });

    return () => unsubs.forEach((unsub) => unsub());
  }, [users, selectedMonth, hospitalId, handleError]);

  return {
    userSchedules,
    doctorShifts,
    conflicts,
    loadingUsers,
    fetchDoctorSchedules,
    handleError,
  };
};

const ShiftSchedule: React.FC = () => {
  const { users, departments, hospital } = useHospital();
  const { currentAdmin } = useAuth();
  const hospitalId = users?.[0]?.["Hospital ID"] || "default_hospital";
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [shiftTimings, setShiftTimings] = useState<ShiftTiming | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedCells, setSelectedCells] = useState<
    { userId: string; day: string }[]
  >([]);
  const [selectedShift, setSelectedShift] = useState<ShiftCode>(
    ShiftCode.MorningShift
  );
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [hospitalName, setHospitalName] = useState<string>("Default Hospital");
  const {
    userSchedules,
    doctorShifts,
    conflicts,
    loadingUsers,
    fetchDoctorSchedules,
    handleError,
  } = useShiftSchedule(users || [], selectedMonth, hospitalId);
  const [selectedDoctorsForPrint, setSelectedDoctorsForPrint] = useState<
    string[]
  >([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const debouncedSetSearchTerm = useMemo(
    () =>
      debounce((value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }, 300),
    []
  );

  useEffect(() => {
    if (!users || !departments) {
      handleError(null, "Hospital context data is missing.");
      setLoading(false);
      return;
    }

    const validateShiftTimings = (timings: ShiftTiming | null): ShiftTiming => {
      if (!timings) {
        toast("Using default shift timings.", { icon: "⚠️" });
        return {
          Morning: { Start: "08:00", End: "14:00" },
          Afternoon: { Start: "14:00", End: "20:00" },
          Evening: { Start: "20:00", End: "08:00" },
        };
      }
      return timings;
    };

    const fetchHospitalData = async () => {
      try {
        const hospitalDoc = await getDoc(doc(db, "Hospitals", hospitalId));
        if (hospitalDoc.exists()) {
          setShiftTimings(
            validateShiftTimings(hospitalDoc.data()["Shift Timings"])
          );
          setHospitalName(hospitalDoc.data()["Name"] || "Default Hospital");
        } else {
          setShiftTimings(validateShiftTimings(null));
        }
      } catch (e) {
        handleError(e, "Failed to fetch hospital data.");
      } finally {
        setLoading(false);
      }
    };

    const holidayUnsub = onSnapshot(
      collection(db, "Holidays"),
      (snapshot) => {
        setHolidays(snapshot.docs.map((doc) => doc.data().Date.toDate()));
      },
      (error) => {
        handleError(error, "Error fetching holidays");
      }
    );

    fetchHospitalData();

    return () => holidayUnsub();
  }, [hospitalId, handleError, users, departments]);

  const filteredUsers = useMemo(() => {
    if (!users || !departments) return [];
    return users
      .filter(
        (user) =>
          `${user.Fname} ${user.Lname}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          departments
            .find((d) => d.id === user["Department ID"])
            ?.["Department Name"]?.toLowerCase()
            ?.includes(searchTerm.toLowerCase())
      )
      .filter(
        (user) =>
          !selectedDepartmentId ||
          user["Department ID"] === selectedDepartmentId
      );
  }, [users, departments, searchTerm, selectedDepartmentId]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage, itemsPerPage]);

  const days = useMemo(() => {
    const daysInMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    ).getDate();
    const days: { day: string; date: string }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          i
        ).getDay()
      ];
      days.push({ day: weekday, date: i.toString() });
    }
    return days;
  }, [selectedMonth]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getPageNumbers = () => {
    const maxPagesToShow = 3;
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const toggleCellSelection = (userId: string, day: string) => {
    setSelectedCells((prev) => {
      const cell = { userId, day };
      return prev.some((c) => c.userId === userId && c.day === day)
        ? prev.filter((c) => c.userId !== userId || c.day !== day)
        : [...prev, cell];
    });
  };

  const markLeaveDay = async () => {
    if (selectedCells.length === 0) return;

    const batch = writeBatch(db);
    try {
      for (const cell of selectedCells) {
        const leaveDate = new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          parseInt(cell.day)
        );
        const leaveRef = collection(db, "Users", cell.userId, "Leaves");
        batch.set(doc(leaveRef), {
          StartDate: Timestamp.fromDate(leaveDate),
          EndDate: Timestamp.fromDate(leaveDate),
          Type: "Manual",
        });
      }
      await batch.commit();
      toast.success("Leave days marked successfully!");
      setIsLeaveModalOpen(false);
      setSelectedCells([]);
      fetchDoctorSchedules();
    } catch (e) {
      handleError(e, "Failed to mark leave days.");
    }
  };

  const updateShift = async () => {
    if (selectedCells.length === 0) return;

    const batch = writeBatch(db);
    try {
      for (const cell of selectedCells) {
        const shiftDate = new Date(
          selectedMonth.getFullYear(),
          selectedMonth.getMonth(),
          parseInt(cell.day)
        );
        const customShiftsQuery = query(
          collection(db, "Users", cell.userId, "CustomShifts"),
          where("Date", "==", shiftDate)
        );
        const existingShifts = await getDocs(customShiftsQuery);

        if (existingShifts.empty) {
          const shiftRef = collection(db, "Users", cell.userId, "CustomShifts");
          batch.set(doc(shiftRef), {
            Date: Timestamp.fromDate(shiftDate),
            Shift: selectedShift,
          });
        } else {
          const docId = existingShifts.docs[0].id;
          batch.update(doc(db, "Users", cell.userId, "CustomShifts", docId), {
            Shift: selectedShift,
          });
        }
      }
      await batch.commit();
      toast.success("Shifts updated successfully!");
      setIsShiftModalOpen(false);
      setSelectedCells([]);
      fetchDoctorSchedules();
    } catch (e) {
      handleError(e, "Failed to update shifts.");
    }
  };

  const handleCellClick = async (user: Users, day: string) => {
    const currentShift = doctorShifts[user.id]?.[day] || ShiftCode.WholeDay;
    setSelectedShift(currentShift);

    if (
      [ShiftCode.Off, ShiftCode.Holiday, ShiftCode.NotAvailable].includes(
        currentShift
      )
    ) {
      toast.error(`Cannot edit this day (${currentShift})`);
      return;
    }

    if (isMultiSelectMode) {
      toggleCellSelection(user.id, day);
    } else {
      setSelectedCells([{ userId: user.id, day }]);
      setIsShiftModalOpen(true);
      setIsLeaveModalOpen(false);
    }
  };

  const getShiftColor = (shift: string): string =>
    shiftConfig[shift as ShiftCode]?.color || "bg-gray-300";

  const getShiftTooltip = (shift: string): string =>
    shiftConfig[shift as ShiftCode]?.tooltip(shiftTimings) || shift;
  const handlePrint = () => {
    const printElement = document.getElementById("print-schedule");
    if (!printElement) {
      toast.error("Print schedule element not found");
      return;
    }

    try {
      // Create a new window for printing with modern styling
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow popups to print the schedule");
        return;
      }

      const hospitalName = hospital?.['Hospital Name'] || 'Hospital';
      const monthName = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
      const departmentName = selectedDepartmentId 
        ? departments.find(d => d.id === selectedDepartmentId)?.['Department Name'] || ''
        : 'All Departments';
      const printDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Get filtered users for printing
      const usersToPrint = filteredUsers.filter(
        (user) =>
          selectedDoctorsForPrint.length === 0 ||
          selectedDoctorsForPrint.includes(user.id)
      );

      // Generate modern print HTML
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Shift Schedule - ${monthName}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 9pt;
              color: #1f2937;
              background: white;
              line-height: 1.4;
            }
            
            .print-container {
              width: 100%;
              max-width: 100%;
            }
            
            .print-header {
              background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
              color: #000000;
              padding: 20px 25px;
              border-radius: 8px 8px 0 0;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border: 2px solid #0d9488;
            }
            
            .print-header h1 {
              font-size: 24pt;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
              color: #000000;
            }
            
            .print-header h2 {
              font-size: 16pt;
              font-weight: 500;
              margin-bottom: 4px;
              color: #000000;
            }
            
            .print-header .meta-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 12px;
              font-size: 10pt;
              color: #000000;
            }
            
            .print-legend {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            
            .print-legend h3 {
              font-size: 11pt;
              font-weight: 600;
              color: #0d9488;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .print-legend-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 10px;
            }
            
            .print-legend-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 6px 10px;
              background: white;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            
            .print-legend-color {
              width: 20px;
              height: 20px;
              border-radius: 4px;
              border: 2px solid rgba(0,0,0,0.1);
              flex-shrink: 0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            
            .print-legend-item span:last-child {
              font-size: 9pt;
              font-weight: 500;
              color: #000000;
            }
            
            .print-table-wrapper {
              overflow: visible;
              border-radius: 8px;
              border: 2px solid #e2e8f0;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              page-break-inside: auto;
            }
            
            .print-table thead {
              background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
              color: #000000;
              border-bottom: 2px solid #0d9488;
            }
            
            .print-table th {
              padding: 12px 8px;
              text-align: center;
              font-weight: 600;
              font-size: 9pt;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-right: 1px solid #0d9488;
              position: sticky;
              top: 0;
              z-index: 10;
              color: #000000;
            }
            
            .print-table th:first-child {
              text-align: left;
              padding-left: 15px;
              min-width: 180px;
              background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
              color: #000000;
            }
            
            .print-table th:last-child {
              border-right: none;
            }
            
            .print-table tbody tr {
              page-break-inside: avoid;
              page-break-after: auto;
              border-bottom: 1px solid #e2e8f0;
              transition: background-color 0.2s;
            }
            
            .print-table tbody tr:nth-child(even) {
              background: #f8fafc;
            }
            
            .print-table tbody tr:hover {
              background: #f1f5f9;
            }
            
            .print-table td {
              padding: 10px 8px;
              text-align: center;
              font-size: 9pt;
              border-right: 1px solid #e2e8f0;
              vertical-align: middle;
            }
            
            .print-table td:first-child {
              text-align: left;
              padding-left: 15px;
              font-weight: 600;
              color: #1e293b;
              background: white;
              position: sticky;
              left: 0;
              z-index: 5;
              border-right: 2px solid #cbd5e1;
            }
            
            .print-table td:last-child {
              border-right: none;
            }
            
            .physician-name {
              font-weight: 600;
              color: #0f766e;
              margin-bottom: 2px;
            }
            
            .physician-designation {
              font-size: 8pt;
              color: #000000;
              font-style: italic;
            }
            
            .shift-cell {
              font-weight: 600;
              color: #000000;
              border-radius: 4px;
              padding: 6px 4px;
              min-width: 35px;
              display: inline-block;
              border: 1px solid rgba(0,0,0,0.2);
            }
            
            .print-footer {
              margin-top: 25px;
              padding-top: 15px;
              border-top: 2px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 8pt;
              color: #000000;
              page-break-inside: avoid;
            }
            
            .print-footer .page-info {
              font-weight: 500;
              color: #000000;
            }
            
            .print-footer .generated-info {
              font-style: italic;
              color: #000000;
            }
            
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .print-table thead {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .print-header {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              .shift-cell {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              @page {
                margin: 15mm 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div class="print-header">
              <h1>${hospitalName}</h1>
              <h2>Physician Shift Schedule - ${monthName}</h2>
              ${departmentName !== 'All Departments' ? `<div style="margin-top: 8px; font-size: 11pt; opacity: 0.95;">Department: ${departmentName}</div>` : ''}
              <div class="meta-info">
                <span>Generated: ${printDate}</span>
                <span>Total Physicians: ${usersToPrint.length}</span>
              </div>
            </div>
            
            <div class="print-legend">
              <h3>Shift Legend</h3>
              <div class="print-legend-grid">
                ${Object.entries(shiftConfig).map(([code, { color, tooltip }]) => `
                  <div class="print-legend-item">
                    <span class="print-legend-color" style="background-color: ${color}"></span>
                    <span>${code}: ${tooltip(shiftTimings).split('(')[0].trim()}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="print-table-wrapper">
              <table class="print-table">
                <thead>
                  <tr>
                    <th>Physician</th>
                    ${days.map((day) => `
                      <th>
                        <div style="font-weight: 700; margin-bottom: 2px;">${day.day}</div>
                        <div style="font-size: 8pt; opacity: 0.9;">${day.date}</div>
                      </th>
                    `).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${usersToPrint.map((user) => `
                    <tr>
                      <td>
                        <div class="physician-name">${user.Title} ${user.Fname} ${user.Lname}</div>
                        <div class="physician-designation">${user.Designation || 'N/A'}</div>
                      </td>
                      ${days.map((day) => {
                        const shift = doctorShifts[user.id]?.[day.date] || ShiftCode.NotAvailable;
                        const shiftColor = getShiftColor(shift);
                        return `
                          <td>
                            <span class="shift-cell" style="background-color: ${shiftColor}">
                              ${shift}
                            </span>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="print-footer">
              <div class="generated-info">This is an official hospital document. Generated by ${currentAdmin?.name || 'Admin'}</div>
              <div class="page-info">Page <span class="page-number"></span></div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              // Update page numbers
              const totalPages = Math.ceil(document.querySelectorAll('.print-table tbody tr').length / 20);
              document.querySelectorAll('.page-number').forEach(el => {
                el.textContent = '1';
              });
              
              // Trigger print after a short delay
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 250);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      toast.success('Opening print preview...');
    } catch (error) {
      console.error('Error generating print:', error);
      toast.error('Failed to generate print. Please try again.');
    }
  };

  return (
    <Layout>
      <style>
        {`
    @media print {
      @page {
        size: portrait;
        margin: 5mm;
      }
      
      body * {
        visibility: hidden;
        counter-reset: page;
      }
      
      #print-schedule, #print-schedule * {
        visibility: visible;
      }
      
      #print-schedule {
        position: relative;
        width: 100%;
        padding: 0;
        background: white;
        font-family: Arial, sans-serif;
        font-size: 8pt;
      }
      
      /* Fixed header for each printed page */
      .print-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 5px 10px;
        border-bottom: 1px solid #ddd;
        z-index: 100;
      }
      
      /* Fixed footer for each printed page */
      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 5px 10px;
        border-top: 1px solid #ddd;
        font-size: 7pt;
        z-index: 100;
      }

  .print-footer .pageNumber:after {
    content: counter(page);
  }
  .print-footer .totalPages:after {
    content: counter(pages);
  }

    @page {
    counter-increment: page;
    margin: 10mm;
  }

      
      /* Main content area */
      .print-content {
        margin-top: 30px; /* Space for header */
        margin-bottom: 20px; /* Space for footer */
      }
      
      /* Table styling with page break controls */
      .print-table {
        width: 100%;
        border-collapse: collapse;
        page-break-inside: auto;
      }
      
      .print-table tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      .print-table th, 
      .print-table td {
        border: 1px solid #ddd;
        padding: 3px 5px;
        text-align: center;
        font-size: 7pt;
      }
      
      .print-table th {
        background-color: #f0f9ff;
        position: sticky;
        top: 30px; /* Below header */
        z-index: 10;
      }
      
      .print-table td:first-child {
        text-align: left;
        position: sticky;
        left: 0;
        background-color: white;
        z-index: 5;
      }
      
      /* Column sizing */
      .print-table .physician-col {
        width: 120px;
        min-width: 120px;
        max-width: 120px;
      }
      
      .print-table .day-col {
        width: 25px;
        min-width: 25px;
        max-width: 25px;
      }
      
      /* Legend styling */
      .print-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 10px;
        font-size: 7pt;
        page-break-after: avoid;
      }
      
      .print-legend-item {
        display: inline-flex;
        align-items: center;
        margin-right: 8px;
      }
      
      .print-legend-color {
        width: 10px;
        height: 10px;
        margin-right: 4px;
        border: 1px solid #ccc;
      }
      
      /* Force page break before each new section if needed */
      .page-break {
        page-break-before: always;
      }
    }
  `}
      </style>

      <div className="space-y-6 p-6 rounded-lg text-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-teal-900">Shift Calendar</h1>
            <p className="mt-2 text-base text-teal-900">
              View daily shift schedules for physicians
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <DatePicker
              selected={selectedMonth}
              onChange={(date: Date) => setSelectedMonth(date)}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              className="bg-teal-100 border-teal-200 text-teal-900 rounded-xl p-2 z-50"
              wrapperClassName="flex items-center"
              renderCustomHeader={({ date, changeYear, changeMonth }) => (
                <div className="flex justify-center gap-2">
                  <select
                    value={date.getFullYear()}
                    onChange={({ target: { value } }) =>
                      changeYear(Number(value))
                    }
                    className="border-teal-500 rounded p-1"
                  >
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map(
                      (year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      )
                    )}
                  </select>
                  <select
                    value={date.getMonth()}
                    onChange={({ target: { value } }) =>
                      changeMonth(Number(value))
                    }
                    className="border-teal-500 rounded p-1"
                  >
                    {[
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                    ].map((month, i) => (
                      <option key={month} value={i}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
            {/* Add this near the department filter */}
            <div className="flex items-center gap-4 no-print">
              <Button
                onClick={() => {
                  if (selectedDoctorsForPrint.length === 0) {
                    setSelectedDoctorsForPrint(filteredUsers.map((u) => u.id));
                  } else {
                    setSelectedDoctorsForPrint([]);
                  }
                }}
                className="bg-teal-500 text-gray-900 hover:bg-teal-400 px-3 py-1.5 rounded-xl"
              >
                {selectedDoctorsForPrint.length === 0
                  ? "Select All"
                  : "Clear Selection"}
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-teal-500 text-gray-900 hover:bg-teal-400 px-4 py-2 rounded-xl flex items-center"
                disabled={
                  selectedDoctorsForPrint.length === 0 &&
                  selectedDepartmentId === null
                }
              >
                <Printer className="w-5 h-5 mr-2" />
                Print Schedule
              </Button>
            </div>
          </div>
        </div>
        {conflicts.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded-xl no-print">
            Warning: No physicians available on days {conflicts.join(", ")}
          </div>
        )}
        <div className="sticky top-0 z-10 py-4 flex flex-col sm:flex-row gap-4 no-print">
          <Input
            placeholder="Search by physician name or department..."
            onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            className="max-w-md bg-teal-100 border-teal-200 text-teal-900 placeholder-teal-600"
          />
          <select
            value={selectedDepartmentId || ""}
            onChange={(e) => {
              setSelectedDepartmentId(e.target.value || null);
              setCurrentPage(1);
            }}
            className="border border-teal-500 rounded-xl p-2 text-teal-700 focus:ring-teal-500 focus:border-teal-400"
          >
            <option value="">All Departments</option>
            {departments?.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept["Department Name"]}
              </option>
            ))}
          </select>
          <Button
            onClick={() => setIsMultiSelectMode((prev) => !prev)}
            className={`px-4 py-2 rounded-xl ${
              isMultiSelectMode
                ? "bg-teal-600 text-white"
                : "bg-teal-500 text-gray-900"
            } hover:bg-teal-400`}
          >
            {isMultiSelectMode ? "Disable Multi-Select" : "Enable Multi-Select"}
          </Button>
        </div>
        {isMultiSelectMode && selectedCells.length > 0 && (
          <div className="flex gap-4 bg-gray-700 p-4 rounded-xl no-print">
            <Button
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-teal-400 text-gray-900 hover:bg-teal-300"
            >
              Mark Selected as Leave
            </Button>
            <Button
              onClick={() => setIsShiftModalOpen(true)}
              className="bg-teal-400 text-gray-900 hover:bg-teal-300"
            >
              Change Selected Shifts
            </Button>
            <Button
              onClick={() => setSelectedCells([])}
              className="bg-gray-400 text-gray-900 hover:bg-gray-300"
            >
              Clear Selection
            </Button>
          </div>
        )}
        <div className="mb-4 no-print">
          <h2 className="text-lg font-bold text-teal-800">Legend</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            {Object.entries(shiftConfig).map(([code, { color, tooltip }]) => (
              <Tippy
                key={code}
                content={tooltip(shiftTimings)}
                placement="bottom"
              >
                <div className="flex cursor-pointer">
                  <div
                    className={`w-4 h-4 ${color} rounded-md mr-2 border`}
                  ></div>
                  <div>
                    <div className="text-xs font-semibold text-teal-900">
                      {code}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tooltip(null).split("(")[0].trim()}
                    </div>
                  </div>
                </div>
              </Tippy>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 no-print">
            <Spinner />
            <span className="text-teal-500 mt-2">Loading schedules...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 no-print">
            <p className="text-gray-400 text-lg">No physicians found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto no-print">
            <ShiftTable className="min-w-[1200px]">
              <ShiftTable.Header>
                <ShiftTable.Row className="bg-gray-800">
                  <ShiftTable.Head className="text-white font-semibold">
                    Physician
                  </ShiftTable.Head>
                  {days.map((day) => (
                    <ShiftTable.Head
                      key={day.date}
                      className="text-teal-400 font-semibold text-center"
                    >
                      <div
                        className={`font-semibold ${
                          day.day === "Sun" || conflicts.includes(day.date)
                            ? "text-red-400"
                            : "text-white"
                        }`}
                      >
                        {day.day}
                      </div>
                      <div
                        className={`mt-1 text-sm ${
                          conflicts.includes(day.date)
                            ? "bg-red-900 ring-2 ring-red-500"
                            : "bg-teal-700"
                        } rounded-full px-3 py-1 text-white`}
                      >
                        {day.date}
                        {conflicts.includes(day.date) && (
                          <span className="ml-1 text-xs">⚠️</span>
                        )}
                      </div>
                    </ShiftTable.Head>
                  ))}
                </ShiftTable.Row>
              </ShiftTable.Header>
              <ShiftTable.Body>
                {paginatedUsers.map((user, index) => (
                  <ShiftTable.Row
                    key={user.id}
                    className={`hover:bg-gray-600 transition-colors ${
                      index % 2 === 0 ? "bg-gray-800" : "bg-gray-700"
                    }`}
                  >
                    {loadingUsers[user.id] ? (
                      <ShiftTable.Cell colSpan={days.length + 1}>
                        <Spinner />
                      </ShiftTable.Cell>
                    ) : (
                      <>
                        <ShiftTable.Cell className="font-semibold text-white">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedDoctorsForPrint.includes(
                                user.id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDoctorsForPrint([
                                    ...selectedDoctorsForPrint,
                                    user.id,
                                  ]);
                                } else {
                                  setSelectedDoctorsForPrint(
                                    selectedDoctorsForPrint.filter(
                                      (id) => id !== user.id
                                    )
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            {user["User Pic"] ? (
                              <img
                                src={user["User Pic"]?.toString()}
                                alt={`${user.Fname} ${user.Lname}`}
                                className="h-12 w-12 rounded-full object-cover shadow-sm"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 flex items-center justify-center text-sm font-semibold text-gray-800 shadow-sm">
                                {user.Fname?.[0] || "P"}
                              </div>
                            )}
                            <div>
                              <span>
                                {user.Title} {user.Fname} {user.Lname}
                              </span>
                              <span className="text-xs text-gray-400 block">
                                (Shift Type:{" "}
                                {userSchedules[user.id]?.Shift ===
                                ShiftType.WholeDay
                                  ? "Whole Day"
                                  : userSchedules[user.id]?.Shift ===
                                    ShiftType.MorningEvening
                                  ? "Morning/Evening"
                                  : "Morning/Afternoon/Evening"}
                                )
                              </span>
                            </div>
                          </div>
                        </ShiftTable.Cell>
                        {days.map((day) => (
                          <Tippy
                            key={day.date}
                            content={getShiftTooltip(
                              doctorShifts[user.id]?.[day.date] ||
                                ShiftCode.NotAvailable
                            )}
                            placement="top"
                          >
                            <ShiftTable.Cell
                              role="button"
                              tabIndex={0}
                              aria-label={`Shift for ${user.Fname} ${user.Lname} on ${day.date}`}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                handleCellClick(user, day.date)
                              }
                              className={`text-center text-sm ${getShiftColor(
                                doctorShifts[user.id]?.[day.date] ||
                                  ShiftCode.NotAvailable
                              )} text-white font-semibold cursor-pointer hover:opacity-80 ${
                                selectedCells.some(
                                  (c) =>
                                    c.userId === user.id && c.day === day.date
                                )
                                  ? "ring-2 ring-teal-400"
                                  : ""
                              }`}
                              onClick={() => handleCellClick(user, day.date)}
                            >
                              {doctorShifts[user.id]?.[day.date] ||
                                ShiftCode.NotAvailable}
                            </ShiftTable.Cell>
                          </Tippy>
                        ))}
                      </>
                    )}
                  </ShiftTable.Row>
                ))}
              </ShiftTable.Body>
            </ShiftTable>
          </div>
        )}
        {/* Print-friendly schedule */}
        // Update your print section
        <div id="print-schedule" className="hidden">
          {/* <div className="print-header">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-sm font-bold">{hospitalName}</h2>
        <p className="text-xs">
          {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          {selectedDepartmentId && departments && (
            <span> • {departments.find(d => d.id === selectedDepartmentId)?.['Department Name']}</span>
          )}
        </p>
      </div>
      <div className="text-xs">
        Printed: {new Date().toLocaleDateString()}
      </div>
    </div>
  </div> */}

          <div className="print-content">
            <div className="print-legend">
              <h3 className="text-xs font-semibold mr-2">Legend:</h3>
              {Object.entries(shiftConfig).map(([code, { color, tooltip }]) => (
                <div key={code} className="print-legend-item">
                  <span className={`print-legend-color ${color}`}></span>
                  <span>
                    {code}: {tooltip(shiftTimings).split("(")[0].trim()}
                  </span>
                </div>
              ))}
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th className="physician-col">Physician</th>
                  {days.map((day) => (
                    <th key={day.date} className="day-col">
                      <div>{day.day}</div>
                      <div>{day.date}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers
                  .filter(
                    (user) =>
                      selectedDoctorsForPrint.length === 0 ||
                      selectedDoctorsForPrint.includes(user.id)
                  )
                  .map((user, index) => (
                    <tr key={user.id}>
                      <td className="physician-col">
                        <div className="font-medium">
                          {user.Fname} {user.Lname}
                        </div>
                        <div className="text-xs text-gray-600">
                          ({user.Designation})
                        </div>
                      </td>
                      {days.map((day) => (
                        <td
                          key={day.date}
                          className={`${getShiftColor(
                            doctorShifts[user.id]?.[day.date] ||
                              ShiftCode.NotAvailable
                          )} text-white`}
                        >
                          {doctorShifts[user.id]?.[day.date] ||
                            ShiftCode.NotAvailable}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* <div className="print-footer">
    <div className="flex justify-between items-center">
      <div className="text-xs">Official Hospital Document</div>
      <div className="text-xs">
        Page <span className="pageNumber"></span> of <span className="totalPages"></span>
      </div>
    </div>
  </div> */}
        </div>
        {filteredUsers.length > itemsPerPage && (
          <div className="flex justify-between items-center mt-4 px-4 pb-4 no-print">
            <p className="text-sm text-white">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-teal-500 text-gray-900 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-5 py-1.5 rounded-xl ${
                    currentPage === page
                      ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg"
                      : "bg-gray-400 text-gray-100 hover:bg-gray-600"
                  }`}
                >
                  {page}
                </button>
              ))}
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-teal-500 text-gray-900 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </div>
        )}
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => {
            setIsLeaveModalOpen(false);
            setSelectedCells([]);
          }}
          title="Mark Leave Days"
          size="md"
          className="no-print"
        >
          <div className="space-y-4">
            <p className="text-teal-400 text-sm">
              Mark {selectedCells.length} selected day(s) as leave for
              respective physicians?
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setIsLeaveModalOpen(false);
                  setSelectedCells([]);
                }}
                className="bg-gray-400 text-gray-900 hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={markLeaveDay}
                className="bg-teal-400 text-gray-900 hover:bg-teal-300"
                disabled={Object.values(loadingUsers).some((v) => v)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isShiftModalOpen}
          onClose={() => {
            setIsShiftModalOpen(false);
            setSelectedCells([]);
          }}
          title="Change Shifts"
          size="md"
          className="no-print"
        >
          <div className="space-y-4">
            <p className="text-teal-400 text-sm">
              Change shift for {selectedCells.length} selected day(s) for
              respective physicians
            </p>
            <div className="flex flex-col space-y-2">
              <label className="text-white">Select Shift:</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as ShiftCode)}
                className="border border-teal-500 rounded-xl p-2 text-teal-700 focus:ring-teal-500 focus:border-teal-400"
              >
                <option value={ShiftCode.WholeDay}>Whole Day</option>
                <option value={ShiftCode.MorningShift}>Morning Shift</option>
                <option value={ShiftCode.AfternoonShift}>
                  Afternoon Shift
                </option>
                <option value={ShiftCode.NightShift}>Night Shift</option>
                <option value={ShiftCode.Leave}>Leave</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setIsShiftModalOpen(false);
                  setSelectedCells([]);
                }}
                className="bg-gray-400 text-gray-900 hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={updateShift}
                className="bg-teal-400 text-gray-900 hover:bg-teal-300"
                disabled={Object.values(loadingUsers).some((v) => v)}
              >
                Update Shifts
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ShiftSchedule;
