export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: "Info" | "Success" | "Warning" | "Critical";
  link: string;
  createdAt: string;
  unread: boolean;
  audience: ("Super Admin" | "Business Admin" | "HR Manager" | "Recruiter" | "Payroll Manager" | "Finance Manager" | "Operations Manager" | "Hospital Client" | "Doctor")[] | "All";
}
