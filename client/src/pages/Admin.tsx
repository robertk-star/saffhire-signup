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
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
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
  adminUsers: string | null;
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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function IntakeDetailModal({
  intake,
  onClose,
}: {
  intake: IntakeRow;
  onClose: () => void;
}) {
  const adminUsers = (() => {
    try {
      return intake.adminUsers ? JSON.parse(intake.adminUsers) : [];
    } catch {
      return [];
    }
  })();

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{intake.companyName || "Unnamed Company"}</span>
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
            <Field label="Company Name" value={intake.companyName} />
            <Field label="EIN" value={intake.ein} />
            <Field label="Entity Type" value={intake.businessEntity} />
            <Field label="Owner" value={fullName(intake.ownerFirstName, intake.ownerLastName)} />
            <Field label="Owner Email" value={intake.ownerEmail} />
            <Field label="Owner Phone" value={intake.ownerPhone} />
            <Field label="Owner Title" value={intake.ownerTitle} />
          </Section>

          <Section title="Contact Information">
            <Field label="Contact" value={fullName(intake.contactFirstName, intake.contactLastName)} />
            <Field label="Contact Email" value={intake.contactEmail} />
            <Field label="Contact Phone" value={intake.contactPhone} />
            <Field label="Contact Title" value={intake.contactTitle} />
          </Section>

          <Section title="Business Address">
            <Field label="Street" value={intake.businessStreet} />
            <Field label="City" value={intake.businessCity} />
            <Field label="State" value={intake.businessState} />
            <Field label="ZIP" value={intake.businessZip} />
          </Section>

          <Section title="Billing Address">
            <Field label="Same as Business?" value={intake.billingSameAsBusiness} />
            {intake.billingSameAsBusiness?.toLowerCase() !== "yes" && (
              <>
                <Field label="Street" value={intake.billingStreet} />
                <Field label="City" value={intake.billingCity} />
                <Field label="State" value={intake.billingState} />
                <Field label="ZIP" value={intake.billingZip} />
              </>
            )}
          </Section>

          {adminUsers.length > 0 && (
            <Section title="Admin Users">
              {adminUsers.map((u: { firstName: string; lastName: string; email: string; phone?: string }, i: number) => (
                <div key={i} className="col-span-2 bg-muted/40 rounded-lg p-3 mb-2">
                  <p className="font-medium">
                    {u.firstName} {u.lastName}
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
      return (
        r.companyName?.toLowerCase().includes(q) ||
        r.ownerEmail?.toLowerCase().includes(q) ||
        r.ownerFirstName?.toLowerCase().includes(q) ||
        r.ownerLastName?.toLowerCase().includes(q)
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
            <img
              src="/manus-storage/SaffhireLogoShirtStyle_6539361a.webp"
              alt="SaffHire"
              className="h-8 w-auto object-contain"
            />
            <div className="h-5 w-px bg-border" />
            <span className="text-sm font-semibold text-foreground">Submissions Dashboard</span>
          </div>
          <div className="flex gap-2">
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
                  {filtered.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                        i % 2 === 0 ? "" : "bg-muted/10"
                      }`}
                      onClick={() => setSelectedIntake(row)}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.companyName || (
                          <span className="text-muted-foreground italic">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {fullName(row.ownerFirstName, row.ownerLastName)}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.ownerEmail ? (
                          <a
                            href={`mailto:${row.ownerEmail}`}
                            className="text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.ownerEmail}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {row.ownerPhone || <span className="text-muted-foreground">—</span>}
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
                  ))}
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
