export type UserRole =
  | "super_admin"
  | "school_owner"
  | "headmaster"
  | "accountant"
  | "teacher"
  | "parent";

export type SyncStatus = "synced" | "pending" | "offline";

export type GenderType = "male" | "female";

export type SchoolLevel =
  | "daycare"
  | "nursery"
  | "kg"
  | "primary"
  | "jhs";

export type StudentStatus = "active" | "inactive" | "graduated" | "transferred" | "withdrawn";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type TermType = "term1" | "term2" | "term3";

export interface Profile {
  id: string;
  school_id: string | null;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface School {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  motto: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  level: SchoolLevel[];
  admission_prefix: string;
  current_academic_year_id: string | null;
  is_active: boolean;
  subscription_status: "trial" | "active" | "suspended" | "expired";
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Term {
  id: string;
  school_id: string;
  academic_year_id: string;
  term: TermType;
  name: string;
  start_date: string;
  end_date: string;
  reopening_date: string | null;
  is_current: boolean;
  created_at: string;
}

export interface ClassRoom {
  id: string;
  school_id: string;
  name: string;
  level: SchoolLevel;
  arm: string | null;
  class_teacher_id: string | null;
  capacity: number | null;
  created_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  level: SchoolLevel[];
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string | null;
  gender: GenderType;
  photo_url: string | null;
  class_id: string | null;
  status: StudentStatus;
  admission_date: string;
  previous_school: string | null;
  medical_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Parent {
  id: string;
  school_id: string;
  student_id: string;
  relationship: string;
  full_name: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  address: string | null;
  is_primary: boolean;
  user_id: string | null;
  created_at: string;
}

export interface FeeType {
  id: string;
  school_id: string;
  name: string;
  amount: number;
  term_id: string | null;
  level: SchoolLevel[] | null;
  is_mandatory: boolean;
  created_at: string;
}

export interface FeePayment {
  id: string;
  school_id: string;
  student_id: string;
  fee_type_id: string;
  term_id: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  payment_status: PaymentStatus;
  paid_at: string | null;
  receipt_number: string | null;
  payment_method: "cash" | "momo" | "bank" | "other" | null;
  recorded_by: string | null;
  notes: string | null;
  offline_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string;
  date: string;
  term_id: string;
  status: AttendanceStatus;
  recorded_by: string;
  notes: string | null;
  offline_id: string | null;
  created_at: string;
}

export interface ExamScore {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  term_id: string;
  class_score: number | null;
  exam_score: number | null;
  total: number | null;
  grade: string | null;
  position: number | null;
  remark: string | null;
  offline_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      schools: { Row: School; Insert: Partial<School>; Update: Partial<School> };
      academic_years: { Row: AcademicYear; Insert: Partial<AcademicYear>; Update: Partial<AcademicYear> };
      terms: { Row: Term; Insert: Partial<Term>; Update: Partial<Term> };
      classrooms: { Row: ClassRoom; Insert: Partial<ClassRoom>; Update: Partial<ClassRoom> };
      subjects: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      students: { Row: Student; Insert: Partial<Student>; Update: Partial<Student> };
      parents: { Row: Parent; Insert: Partial<Parent>; Update: Partial<Parent> };
      fee_types: { Row: FeeType; Insert: Partial<FeeType>; Update: Partial<FeeType> };
      fee_payments: { Row: FeePayment; Insert: Partial<FeePayment>; Update: Partial<FeePayment> };
      attendance_records: { Row: AttendanceRecord; Insert: Partial<AttendanceRecord>; Update: Partial<AttendanceRecord> };
      exam_scores: { Row: ExamScore; Insert: Partial<ExamScore>; Update: Partial<ExamScore> };
    };
  };
}
