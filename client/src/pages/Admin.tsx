import React from "react";
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
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, ExternalLink, Users, Trash2 } from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "In Progress" | "Completed";

type IntakeRow = {
  id: number;
  sessionId: string | null;
  status: "In Progress" | "Completed";
  synced: "true" | "false";
  syncedAt: Date | null;
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

function fullName(first: string | null | undefined, last: string | null | undefined) {
  return [first, last].filter(Boolean).join(" ") || "—";
}

/**
 * Parse conversationLog JSON to extract form data.
 */
function parseConversationLog(logJson: string | null): Record<string, any> {
  if (!logJson) return {};
  try {
    return JSON.parse(logJson);
  } catch {
    return {};
  }
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function IntakeDetailModal({
  intake,
  onClose,
  onDelete,
}: {
  intake: IntakeRow;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const data = parseConversationLog(intake.conversationLog);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Extract admin users from adminUsers array
  const adminUsers = Array.isArray(data.adminUsers) ? data.adminUsers : [];

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

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{data.companyName || "Unnamed Company"}</span>
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
            <Field label="Company Name" value={data.companyName} />
            {data.dba && <Field label="DBA" value={data.dba} />}
            <Field label="EIN" value={data.ein} />
            {data.businessType && <Field label="Business Type" value={data.businessType} />}
            <Field label="Entity Type" value={data.businessEntity} />
            <Field label="Owner" value={data.ownerName || fullName(data.ownerFirstName, data.ownerLastName)} />
            <Field label="Owner Email" value={data.ownerEmail} />
            <Field label="Owner Phone" value={data.ownerPhone} />
            {data.ownerPhoneExt && <Field label="Owner Phone Ext" value={data.ownerPhoneExt} />}
            {data.ownerTitle && <Field label="Owner Title" value={data.ownerTitle} />}
          </Section>

          <Section title="Contact Information">
            <Field label="Contact" value={data.contactName || fullName(data.contactFirstName, data.contactLastName)} />
            <Field label="Contact Email" value={data.contactEmail} />
            {data.contactWorkPhone && <Field label="Contact Work Phone" value={data.contactWorkPhone} />}
            {data.contactWorkPhoneExt && <Field label="Contact Work Phone Ext" value={data.contactWorkPhoneExt} />}
            {data.contactMobilePhone && <Field label="Contact Mobile" value={data.contactMobilePhone} />}
            {data.contactTitle && <Field label="Contact Title" value={data.contactTitle} />}
          </Section>

          <Section title="Business Address">
            <Field label="Street" value={data.businessStreet} />
            {data.businessStreet2 && <Field label="Street 2" value={data.businessStreet2} />}
            <Field label="City" value={data.businessCity} />
            <Field label="State" value={data.businessState} />
            <Field label="ZIP" value={data.businessZip} />
            {data.businessCountry && <Field label="Country" value={data.businessCountry} />}
          </Section>

          <Section title="Billing Address">
            <Field label="Same as Business?" value={data.billingSameAsBusiness === "true" ? "Yes" : "No"} />
            {data.billingSameAsBusiness !== "true" && (
              <>
                <Field label="Street" value={data.billingStreet} />
                {data.billingStreet2 && <Field label="Street 2" value={data.billingStreet2} />}
                <Field label="City" value={data.billingCity} />
                <Field label="State" value={data.billingState} />
                <Field label="ZIP" value={data.billingZip} />
                {data.billingCountry && <Field label="Country" value={data.billingCountry} />}
              </>
            )}
            {data.billingAttention && <Field label="Attention" value={data.billingAttention} />}
          </Section>

          {adminUsers.length > 0 && (
            <Section title="Admin Users">
              {adminUsers.map((admin, idx) => (
                <div key={idx} className="col-span-2 mb-4 p-3 bg-muted rounded">
                  <div className="font-semibold mb-2">Admin {idx + 1}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Field label="Name" value={fullName(admin.firstName, admin.lastName)} />
                    <Field label="Email" value={admin.email} />
                    <Field label="Phone" value={admin.phone} />
                    {admin.jobTitle && <Field label="Job Title" value={admin.jobTitle} />}
                  </div>
                </div>
              ))}
            </Section>
          )}

          <div className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
            <div>Created: {formatDate(intake.createdAt)}</div>
            <div>Last updated: {formatDate(intake.updatedAt)}</div>
          </div>

          {!showDeleteConfirm && (
            <div className="mt-6 flex gap-2 justify-end">
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Record
              </Button>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded">
              <p className="text-sm font-semibold mb-3">Are you sure you want to delete this record? This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(intake.id);
                    onClose();
                  }}
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedIntake, setSelectedIntake] = React.useState<IntakeRow | null>(null);

  const { data: intakesData, isLoading, refetch } = trpc.signup.listIntakes.useQuery({});
  const intakes = (Array.isArray(intakesData) ? intakesData : intakesData?.rows || []) as IntakeRow[];
  const syncMutation = trpc.signup.manualSyncToSheets.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteMutation = trpc.signup.deleteIntake.useMutation({
    onSuccess: () => refetch(),
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>Please log in to access the admin dashboard.</p>
        <Button asChild>
          <a href={getLoginUrl()}>Login</a>
        </Button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  // Filter and search
  const filtered = intakes.filter((intake) => {
    const data = parseConversationLog(intake.conversationLog);
    const matchesStatus = statusFilter === "all" || intake.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (data.companyName && data.companyName.toLowerCase().includes(searchLower)) ||
      (data.ownerName && data.ownerName.toLowerCase().includes(searchLower)) ||
      (data.ownerEmail && data.ownerEmail.toLowerCase().includes(searchLower)) ||
      (data.ein && data.ein.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: intakes.length,
    completed: intakes.filter((i: IntakeRow) => i.status === "Completed").length,
    inProgress: intakes.filter((i: IntakeRow) => i.status === "In Progress").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Submissions Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sync Now
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/users", "_self")}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://www.saffhire.com", "_blank")}
            >
              Back to Website
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Submissions</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Owner</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Last Updated</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Sheets Sync</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  filtered.map((intake: IntakeRow) => {
                    const data = parseConversationLog(intake.conversationLog);
                    return (
                      <tr key={intake.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">{data.companyName || "Unknown"}</td>
                        <td className="px-6 py-4 text-sm">{data.ownerName || "—"}</td>
                        <td className="px-6 py-4 text-sm">{data.ownerEmail || "—"}</td>
                        <td className="px-6 py-4 text-sm">{data.ownerPhone || "—"}</td>
                        <td className="px-6 py-4 text-sm">
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
                        </td>
                        <td className="px-6 py-4 text-sm">{formatDate(intake.updatedAt)}</td>
                        <td className="px-6 py-4 text-sm">
                          {intake.synced === "true" ? (
                            <span className="text-emerald-600 font-medium">Synced</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setSelectedIntake(intake)}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedIntake && (
        <IntakeDetailModal
          intake={selectedIntake}
          onClose={() => setSelectedIntake(null)}
          onDelete={(id) => {
            deleteMutation.mutate({ id });
          }}
        />
      )}
    </div>
  );
}
