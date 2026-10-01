"use client";

import { ResourcePage } from "@/components/resource/resource-page";

export default function PayslipsPage() {
  return (
    <ResourcePage
      resource="payslips"
      title="Payslips"
      description="Generated payslips with net amounts payable, retained as statutory records."
      defaultSort="period"
      exportName="payslips"
    />
  );
}
