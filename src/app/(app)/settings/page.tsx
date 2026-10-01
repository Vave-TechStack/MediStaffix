"use client";

/**
 * Workspace settings.
 *
 * Tabs cover the company profile, statutory configuration that drives payroll and
 * invoicing, operational defaults, the audit trail and a demonstration data reset.
 * Changes are validated on the server before they are persisted.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  FileText,
  Percent,
  RotateCcw,
  Save,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { cn, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  ErrorState,
  FormField,
  Input,
  Label,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  Switch,
  TableSkeleton,
  TableWrap,
  TBody,
  TD,
  TH,
  THead,
  Textarea,
  TR,
} from "@/components/ui";

interface StatutoryConfig {
  jurisdictionLabel: string;
  currency: string;
  currencySymbol: string;
  professionalTax: { enabled: boolean; amountPerMonth: number; note: string };
  providentFund: { enabled: boolean; percent: number; wageCeiling: number; note: string };
  esi: { enabled: boolean; percent: number; wageCeiling: number; note: string };
  tds: { enabled: boolean; note: string };
  invoiceTax: { percent: number; label: string; note: string };
  serviceCharge: { percent: number; label: string; note: string };
  disclaimer: string;
}

interface Settings {
  companyName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  gstin: string;
  statutory: StatutoryConfig;
  defaultPaymentTerms: string;
  defaultInvoiceDueDays: number;
  standardShiftHours: number;
  overtimeRateMultiplier: number;
  leavePolicy: Record<string, number>;
  documentExpiryAlertDays: number;
  contractExpiryAlertDays: number;
  demoMode: boolean;
  dataRetainedFrom: string;
}

interface AuditRow extends Record<string, unknown> {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actor: string;
  summary: string;
  at: string;
}

const TABS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "statutory", label: "Statutory", icon: Percent },
  { key: "operations", label: "Operations", icon: SettingsIcon },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "audit", label: "Audit log", icon: ScrollText },
  { key: "security", label: "Security & data", icon: ShieldCheck },
] as const;

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("company");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ settings: Settings }>("/api/settings");
      setSettings(res.settings);
      setDraft(res.settings);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tab !== "audit" || audit) return;
    api
      .get<{ rows: AuditRow[] }>("/api/audit", { pageSize: 50 })
      .then((res) => setAudit(res.rows))
      .catch(() => setAudit([]));
  }, [tab, audit]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setErrors((e) => {
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  const setStatutory = <K extends keyof StatutoryConfig>(key: K, value: StatutoryConfig[K]) =>
    setDraft((d) => (d ? { ...d, statutory: { ...d.statutory, [key]: value } } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await api.patch<{ settings: Settings }>("/api/settings", draft);
      setSettings(res.settings);
      setDraft(res.settings);
      toast.success("Workspace settings updated.");
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors ?? {});
        toast.error(e.message);
      } else {
        toast.error("Could not save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      const res = await api.action<{ message?: string }>("demo.reset");
      toast.success(res.message ?? "Demonstration data regenerated.");
      setResetOpen(false);
      setAudit(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  };

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;
  if (loading || !draft) {
    return (
      <div className="space-y-5">
        <PageHeader title="Settings" description="Loading workspace configuration…" />
        <TableSkeleton rows={8} cols={3} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Company profile, statutory configuration and operational defaults for this MediStaffix workspace."
        actions={
          <>
            {dirty ? <Badge tone="warning">Unsaved changes</Badge> : null}
            <Button variant="outline" size="sm" disabled={!dirty} onClick={() => setDraft(settings)}>
              Discard
            </Button>
            <Button size="sm" loading={saving} disabled={!dirty} onClick={save}>
              <Save className="h-3.5 w-3.5" /> Save changes
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ring-focus transition-colors",
              tab === t.key ? "bg-brand-500/10 text-brand-600 dark:text-brand-300" : "text-muted hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            )}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "company" ? (
        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
            <CardDescription>Appears on generated documents, invoices and the portal footer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Company name" error={errors.companyName}>
              <Input value={draft.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </FormField>
            <FormField label="Tagline" error={errors.tagline}>
              <Input value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
            </FormField>
            <FormField label="Support email" error={errors.supportEmail}>
              <Input type="email" value={draft.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
            </FormField>
            <FormField label="Support phone" error={errors.supportPhone}>
              <Input value={draft.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} />
            </FormField>
            <FormField label="Registered address" error={errors.registeredAddress} span={2}>
              <Textarea rows={2} value={draft.registeredAddress} onChange={(e) => set("registeredAddress", e.target.value)} />
            </FormField>
            <FormField label="GSTIN" error={errors.gstin} help="Printed on every generated invoice.">
              <Input value={draft.gstin} onChange={(e) => set("gstin", e.target.value)} />
            </FormField>
            <FormField label="Data retained from" error={errors.dataRetainedFrom}>
              <Input type="date" value={draft.dataRetainedFrom} onChange={(e) => set("dataRetainedFrom", e.target.value)} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      {tab === "statutory" ? (
        <div className="space-y-4">
          <Notice tone="warning">
            These values drive payroll deductions and invoice tax computed by the payroll and billing engines. Changes apply to the next run —
            historical payroll runs and issued invoices keep the values they were computed with.
          </Notice>

          <Card>
            <CardHeader>
              <CardTitle>Jurisdiction</CardTitle>
              <CardDescription>{draft.statutory.disclaimer}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <FormField label="Jurisdiction" error={errors["statutory.jurisdictionLabel"]}>
                <Input value={draft.statutory.jurisdictionLabel} onChange={(e) => setStatutory("jurisdictionLabel", e.target.value)} />
              </FormField>
              <FormField label="Currency code">
                <Input value={draft.statutory.currency} onChange={(e) => setStatutory("currency", e.target.value)} />
              </FormField>
              <FormField label="Currency symbol">
                <Input value={draft.statutory.currencySymbol} onChange={(e) => setStatutory("currencySymbol", e.target.value)} />
              </FormField>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Professional tax
                  <Switch checked={draft.statutory.professionalTax.enabled} onCheckedChange={(v) => setStatutory("professionalTax", { ...draft.statutory.professionalTax, enabled: v })} />
                </CardTitle>
                <CardDescription>{draft.statutory.professionalTax.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField label="Amount per month" error={errors["statutory.professionalTax.amountPerMonth"]}>
                  <Input
                    type="number"
                    value={draft.statutory.professionalTax.amountPerMonth}
                    onChange={(e) => setStatutory("professionalTax", { ...draft.statutory.professionalTax, amountPerMonth: Number(e.target.value) })}
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Provident fund
                  <Switch checked={draft.statutory.providentFund.enabled} onCheckedChange={(v) => setStatutory("providentFund", { ...draft.statutory.providentFund, enabled: v })} />
                </CardTitle>
                <CardDescription>{draft.statutory.providentFund.note}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <FormField label="Employee percent" error={errors["statutory.providentFund.percent"]}>
                  <Input
                    type="number"
                    step="0.01"
                    value={draft.statutory.providentFund.percent}
                    onChange={(e) => setStatutory("providentFund", { ...draft.statutory.providentFund, percent: Number(e.target.value) })}
                  />
                </FormField>
                <FormField label="Wage ceiling" error={errors["statutory.providentFund.wageCeiling"]}>
                  <Input
                    type="number"
                    value={draft.statutory.providentFund.wageCeiling}
                    onChange={(e) => setStatutory("providentFund", { ...draft.statutory.providentFund, wageCeiling: Number(e.target.value) })}
                  />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  ESI
                  <Switch checked={draft.statutory.esi.enabled} onCheckedChange={(v) => setStatutory("esi", { ...draft.statutory.esi, enabled: v })} />
                </CardTitle>
                <CardDescription>{draft.statutory.esi.note}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <FormField label="Employer percent" error={errors["statutory.esi.percent"]}>
                  <Input type="number" step="0.01" value={draft.statutory.esi.percent} onChange={(e) => setStatutory("esi", { ...draft.statutory.esi, percent: Number(e.target.value) })} />
                </FormField>
                <FormField label="Wage ceiling" error={errors["statutory.esi.wageCeiling"]}>
                  <Input type="number" value={draft.statutory.esi.wageCeiling} onChange={(e) => setStatutory("esi", { ...draft.statutory.esi, wageCeiling: Number(e.target.value) })} />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  TDS
                  <Switch checked={draft.statutory.tds.enabled} onCheckedChange={(v) => setStatutory("tds", { ...draft.statutory.tds, enabled: v })} />
                </CardTitle>
                <CardDescription>{draft.statutory.tds.note}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice tax — {draft.statutory.invoiceTax.label}</CardTitle>
                <CardDescription>{draft.statutory.invoiceTax.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField label="Percent" error={errors["statutory.invoiceTax.percent"]}>
                  <Input type="number" step="0.01" value={draft.statutory.invoiceTax.percent} onChange={(e) => setStatutory("invoiceTax", { ...draft.statutory.invoiceTax, percent: Number(e.target.value) })} />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service charge — {draft.statutory.serviceCharge.label}</CardTitle>
                <CardDescription>{draft.statutory.serviceCharge.note}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField label="Percent" error={errors["statutory.serviceCharge.percent"]}>
                  <Input type="number" step="0.01" value={draft.statutory.serviceCharge.percent} onChange={(e) => setStatutory("serviceCharge", { ...draft.statutory.serviceCharge, percent: Number(e.target.value) })} />
                </FormField>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "operations" ? (
        <Card>
          <CardHeader>
            <CardTitle>Operational defaults</CardTitle>
            <CardDescription>Applied whenever a new record is created without an explicit value.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Default payment terms">
              <Select
                options={["Advance", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"].map((v) => ({ value: v, label: v }))}
                value={draft.defaultPaymentTerms}
                onChange={(e) => set("defaultPaymentTerms", e.target.value)}
              />
            </FormField>
            <FormField label="Invoice due days" error={errors.defaultInvoiceDueDays}>
              <Input type="number" value={draft.defaultInvoiceDueDays} onChange={(e) => set("defaultInvoiceDueDays", Number(e.target.value))} />
            </FormField>
            <FormField label="Standard shift hours" error={errors.standardShiftHours}>
              <Input type="number" value={draft.standardShiftHours} onChange={(e) => set("standardShiftHours", Number(e.target.value))} />
            </FormField>
            <FormField label="Overtime multiplier" error={errors.overtimeRateMultiplier} help="Applied to the hourly rate derived from monthly cost.">
              <Input type="number" step="0.25" value={draft.overtimeRateMultiplier} onChange={(e) => set("overtimeRateMultiplier", Number(e.target.value))} />
            </FormField>
            <FormField label="Document expiry alert (days)" error={errors.documentExpiryAlertDays}>
              <Input type="number" value={draft.documentExpiryAlertDays} onChange={(e) => set("documentExpiryAlertDays", Number(e.target.value))} />
            </FormField>
            <FormField label="Contract expiry alert (days)" error={errors.contractExpiryAlertDays}>
              <Input type="number" value={draft.contractExpiryAlertDays} onChange={(e) => set("contractExpiryAlertDays", Number(e.target.value))} />
            </FormField>
          </CardContent>
        </Card>
      ) : null}

      {tab === "documents" ? (
        <Card>
          <CardHeader>
            <CardTitle>Leave policy</CardTitle>
            <CardDescription>Days granted per year for each leave type, used when balances are created on onboarding.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(draft.leavePolicy ?? {}).map(([type, days]) => (
              <FormField key={type} label={`${type} days per year`}>
                <Input
                  type="number"
                  value={days}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, leavePolicy: { ...d.leavePolicy, [type]: Number(e.target.value) } } : d))
                  }
                />
              </FormField>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
            <CardDescription>Every mutation recorded against a record, with the actor and the before/after values.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {audit === null ? (
              <TableSkeleton rows={10} cols={5} />
            ) : audit.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-muted">No audit entries are visible for your role.</p>
            ) : (
              <TableWrap className="max-h-[640px] overflow-y-auto">
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>When</TH>
                    <TH>Actor</TH>
                    <TH>Action</TH>
                    <TH>Entity</TH>
                    <TH>Summary</TH>
                  </TR>
                </THead>
                <TBody>
                  {audit.map((a) => (
                    <TR key={a.id}>
                      <TD className="whitespace-nowrap">{formatDateTime(a.at)}</TD>
                      <TD>{a.actor}</TD>
                      <TD>
                        <StatusBadge value={a.action} />
                      </TD>
                      <TD>
                        {a.entity} <span className="text-[11.5px] text-muted">{a.entityId}</span>
                      </TD>
                      <TD className="text-[12.5px]">{a.summary}</TD>
                    </TR>
                  ))}
                </TBody>
              </TableWrap>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "security" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Demonstration mode</CardTitle>
              <CardDescription>
                While enabled, the dataset can be regenerated on demand. Every record in this workspace is fictional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="demoMode">Allow dataset reset</Label>
                <Switch id="demoMode" checked={draft.demoMode} onCheckedChange={(v) => set("demoMode", v)} />
              </div>
              <Notice tone="info">
                Resetting regenerates hospitals, employees, deployments, payroll history, invoices and audit entries from the deterministic seed.
                Anything you have created in this session is discarded.
              </Notice>
              <Button variant="destructive" size="sm" disabled={!draft.demoMode} onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset demonstration data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Authentication &amp; access</CardTitle>
              <CardDescription>How this workspace protects access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-[13px]">
              {[
                "Sessions are JWT cookies, HTTP-only and same-site, so credentials never reach client JavaScript.",
                "Every API route re-checks the role against the required permission — hiding a button is never the authorisation.",
                "Portal roles are additionally scoped: a hospital client only sees records for their own hospital, and a doctor only sees their own.",
                "Mutations are rate limited per resource and per action, and every write records an audit entry.",
              ].map((line) => (
                <p key={line} className="flex gap-2 text-[13px]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
                  {line}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset the demonstration dataset?"
        description="Every record created in this workspace will be discarded and the seeded data regenerated. This cannot be undone."
        confirmLabel="Reset data"
        destructive
        busy={resetting}
        onConfirm={resetDemo}
      />
    </div>
  );
}
