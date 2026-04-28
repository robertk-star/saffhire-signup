import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Users } from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "In Progress" | "Completed";

type IntakeRow = {
  id: number;
  sessionId: string | null;
  status: "In Progress" | "Completed";
  synced: "true" | "false";
  syncedAt: Date | null;
  companyName: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerTitle: string | null;
  ein: string | null;
  businessEntity: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactTitle: string | null;
  businessStreet: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZip: string | null;
  billingSameAsBusiness: string | null;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  admin1FirstName: string | null;
  admin1LastName: string | null;
  admin1Email: string | null;
  admin1Mobile: string | null;
  admin2FirstName: string | null;
  admin2LastName: string | null;
  admin2Email: string | null;
  admin2Mobile: string | null;
  admin3FirstName: string | null;
  admin3LastName: string | null;
  admin3Email: string | null;
  admin3Mobile: string | null;
  conversationLog: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fullName(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "—";
}

/**
 * Parse conversationLog JSON to extract form data.
 * Falls back to individual columns if JSON is missing/invalid.
 */
function parseConversationLog(logJson: string | null): Record<string, any> {
  if (!logJson) return {};
  try {
    return JSON.parse(logJson);
  } catch {
    return {};
  }
}

/**
 * Get a field value with fallback chain:
 * 1. Try conversationLog JSON first (since columns are now NULL in DB)
 * 2. Try individual column as fallback
 * 3. Return null
 */
function getFieldValue(
  intake: IntakeRow,
  columnValue: string | null | undefined,
  jsonKey: string
): string | null {
  // Always try JSON first since that's where the data is stored now
  const parsed = parseConversationLog(intake.conversationLog);
  const jsonValue = parsed[jsonKey];
  if (jsonValue) return jsonValue;
  
  // Fallback to individual column if JSON doesn't have it
  if (columnValue) return columnValue;
  
  return null;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function IntakeDetailModal({
  intake,
  onClose,
}: {
  intake: IntakeRow;
  onClose: () => void;
}) {
  const parsed = parseConversationLog(intake.conversationLog);

  // Extract admin users with fallback to individual columns
  const adminUsers = [
    {
      firstName: getFieldValue(intake, intake.admin1FirstName, "admin1FirstName"),
      lastName: getFieldValue(intake, intake.admin1LastName, "admin1LastName"),
      email: getFieldValue(intake, intake.admin1Email, "admin1Email"),
      phone: getFieldValue(intake, intake.admin1Mobile, "admin1Mobile"),
    },
    {
      firstName: getFieldValue(intake, intake.admin2FirstName, "admin2FirstName"),
      lastName: getFieldValue(intake, intake.admin2LastName, "admin2LastName"),
      email: getFieldValue(intake, intake.admin2Email, "admin2Email"),
      phone: getFieldValue(intake, intake.admin2Mobile, "admin2Mobile"),
    },
    {
      firstName: getFieldValue(intake, intake.admin3FirstName, "admin3FirstName"),
      lastName: getFieldValue(intake, intake.admin3LastName, "admin3LastName"),
      email: getFieldValue(intake, intake.admin3Email, "admin3Email"),
      phone: getFieldValue(intake, intake.admin3Mobile, "admin3Mobile"),
    },
  ].filter((u) => u.firstName || u.lastName || u.email);

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 border-b border-border pb-1">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string | null }) => (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </>
  );

  // Extract all fields with fallback to JSON
  const companyName = getFieldValue(intake, intake.companyName, "companyName");
  const ein = getFieldValue(intake, intake.ein, "ein");
  const businessEntity = getFieldValue(intake, intake.businessEntity, "businessEntity");
  const ownerFirstName = getFieldValue(intake, intake.ownerFirstName, "ownerFirstName");
  const ownerLastName = getFieldValue(intake, intake.ownerLastName, "ownerLastName");
  const ownerEmail = getFieldValue(intake, intake.ownerEmail, "ownerEmail");
  const ownerPhone = getFieldValue(intake, intake.ownerPhone, "ownerPhone");
  const ownerTitle = getFieldValue(intake, intake.ownerTitle, "ownerTitle");
  const contactFirstName = getFieldValue(intake, intake.contactFirstName, "contactFirstName");
  const contactLastName = getFieldValue(intake, intake.contactLastName, "contactLastName");
  const contactEmail = getFieldValue(intake, intake.contactEmail, "contactEmail");
  const contactPhone = getFieldValue(intake, intake.contactPhone, "contactPhone");
  const contactTitle = getFieldValue(intake, intake.contactTitle, "contactTitle");
  const businessStreet = getFieldValue(intake, intake.businessStreet, "businessStreet");
  const businessCity = getFieldValue(intake, intake.businessCity, "businessCity");
  const businessState = getFieldValue(intake, intake.businessState, "businessState");
  const businessZip = getFieldValue(intake, intake.businessZip, "businessZip");
  const billingSameAsBusiness = getFieldValue(intake, intake.billingSameAsBusiness, "billingSameAsBusiness");
  const billingStreet = getFieldValue(intake, intake.billingStreet, "billingStreet");
  const billingCity = getFieldValue(intake, intake.billingCity, "billingCity");
  const billingState = getFieldValue(intake, intake.billingState, "billingState");
  const billingZip = getFieldValue(intake, intake.billingZip, "billingZip");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{companyName || "Unnamed Company"}</span>
            <Badge
              variant={intake.status === "Completed" ? "default" : "secondary"}
              className={
                intake.status === "Completed"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-800 border-amber-200"
              }
            >
              {intake.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <Section title="Client Information">
            <Field label="Company Name" value={companyName} />
            <Field label="EIN" value={ein} />
            <Field label="Entity Type" value={businessEntity} />
            <Field label="Owner" value={fullName(ownerFirstName, ownerLastName)} />
            <Field label="Owner Email" value={ownerEmail} />
            <Field label="Owner Phone" value={ownerPhone} />
            <Field label="Owner Title" value={ownerTitle} />
          </Section>

          <Section title="Contact Information">
            <Field label="Contact" value={fullName(contactFirstName, contactLastName)} />
            <Field label="Contact Email" value={contactEmail} />
            <Field label="Contact Phone" value={contactPhone} />
            <Field label="Contact Title" value={contactTitle} />
          </Section>

          <Section title="Business Address">
            <Field label="Street" value={businessStreet} />
            <Field label="City" value={businessCity} />
            <Field label="State" value={businessState} />
            <Field label="ZIP" value={businessZip} />
          </Section>

          <Section title="Billing Address">
            <Field label="Same as Business?" value={billingSameAsBusiness} />
            {billingSameAsBusiness?.toLowerCase() !== "yes" && billingSameAsBusiness?.toLowerCase() !== "true" ? (
              <>
                <Field label="Street" value={billingStreet} />
                <Field label="City" value={billingCity} />
                <Field label="State" value={billingState} />
                <Field label="ZIP" value={billingZip} />
              </>
            ) : null}
          </Section>

          {adminUsers.length > 0 && (
            <Section title="Admin Users">
              {adminUsers.map((u, i) => (
                <div key={i} className="col-span-2 bg-muted/40 rounded-lg p-3 mb-2">
                  <p className="font-medium">
                    {fullName(u.firstName, u.lastName)}
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {u.email} {u.phone ? `· ${u.phone}` : ""}
                  </p>
                </div>
              ))}
            </Section>
          )}

          <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border flex justify-between">
            <span>Created: {formatDate(intake.createdAt)}</span>
            <span>Last updated: {formatDate(intake.updatedAt)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function Admin() {
  const { user, loading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedIntake, setSelectedIntake] = useState<IntakeRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch, isFetching } = trpc.signup.listIntakes.useQuery(
    { status: statusFilter, limit: 200, offset: 0 },
    { refetchInterval: 30_000 } // auto-refresh every 30 s
  );

  const manualSync = trpc.signup.manualSyncToSheets.useMutation({
    onSuccess: () => {
      setIsSyncing(false);
      refetch();
    },
    onError: () => {
      setIsSyncing(false);
    },
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    await manualSync.mutateAsync();
  };

  // Gate: must be logged in as admin/owner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground text-sm">You must be signed in to view this page.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Sign in</a>
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Access denied — admin only.</p>
      </div>
    );
  }

  // Filter by search term
  const rows: IntakeRow[] = (data?.rows ?? []) as IntakeRow[];
  const filtered = rows
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      
      // Search in columns first, then in JSON
      const companyName = getFieldValue(r, r.companyName, "companyName");
      const ownerEmail = getFieldValue(r, r.ownerEmail, "ownerEmail");
      const ownerFirstName = getFieldValue(r, r.ownerFirstName, "ownerFirstName");
      const ownerLastName = getFieldValue(r, r.ownerLastName, "ownerLastName");
      
      return (
        companyName?.toLowerCase().includes(q) ||
        ownerEmail?.toLowerCase().includes(q) ||
        ownerFirstName?.toLowerCase().includes(q) ||
        ownerLastName?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      return sortDir === "desc" ? tb - ta : ta - tb;
    });

  const completedCount = rows.filter((r) => r.status === "Completed").length;
  const partialCount = rows.filter((r) => r.status === "In Progress").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="https://www.saffhire.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img
                src="/manus-storage/SaffhireLogoShirtStyle_6539361a.webp"
                alt="SaffHire"
                className="h-8 w-auto object-contain"
              />
            </a>
            <div className="h-5 w-px bg-border" />
            <span className="text-sm font-semibold text-foreground">Submissions Dashboard</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-2 text-muted-foreground"
            >
              <a href="/users">
                <Users className="w-4 h-4" />
                Users
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 text-muted-foreground"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Submissions", value: rows.length, color: "text-foreground" },
            { label: "Completed", value: completedCount, color: "text-emerald-600" },
            { label: "In Progress (Partial)", value: partialCount, color: "text-amber-600" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border rounded-xl p-5"
            >
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {s.label}
              </p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, name, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-sm">No submissions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Owner
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    >
                      <span className="flex items-center gap-1">
                        Last Updated
                        {sortDir === "desc" ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronUp className="w-3 h-3" />
                        )}
                      </span>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Sheets Sync
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const companyName = getFieldValue(row, row.companyName, "companyName");
                    const ownerFirstName = getFieldValue(row, row.ownerFirstName, "ownerFirstName");
                    const ownerLastName = getFieldValue(row, row.ownerLastName, "ownerLastName");
                    const ownerEmail = getFieldValue(row, row.ownerEmail, "ownerEmail");
                    const ownerPhone = getFieldValue(row, row.ownerPhone, "ownerPhone");

                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                          i % 2 === 0 ? "" : "bg-muted/10"
                        }`}
                        onClick={() => setSelectedIntake(row)}
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {companyName || (
                            <span className="text-muted-foreground italic">Unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {fullName(ownerFirstName, ownerLastName)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {ownerEmail ? (
                            <a
                              href={`mailto:${ownerEmail}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ownerEmail}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {ownerPhone || <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              row.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {formatDate(row.updatedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {row.synced === "true" ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Synced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIntake(row);
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Showing {filtered.length} of {rows.length} submissions · Auto-refreshes every 30 s
        </p>
      </main>

      {selectedIntake && (
        <IntakeDetailModal
          intake={selectedIntake}
          onClose={() => setSelectedIntake(null)}
        />
      )}
    </div>
  );
}
