import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl, toAbsoluteAppUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function AccessGate({ user }: { user: { role: string } | null }) {
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
  return null;
}

function LinkResult({ url }: { url: string }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm">
        Copy this link and email it to the client yourself. SaffHire does not email the link.
      </p>
      <Input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied.");
          } catch {
            toast.error("Select the link and copy it manually.");
          }
        }}
      >
        Copy link
      </Button>
    </div>
  );
}

export default function AgreementLinkAdmin() {
  const { user, loading } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [createdUrl, setCreatedUrl] = useState("");
  const [intakeId, setIntakeId] = useState("");
  const [issuedUrl, setIssuedUrl] = useState("");

  const createLink = trpc.agreement.createSigningLink.useMutation({
    onSuccess: (result) => {
      setCreatedUrl(toAbsoluteAppUrl(result.url));
      toast.success("Signing link created. It has not been emailed.");
    },
    onError: (err) => toast.error(err.message),
  });

  const issueLink = trpc.agreement.issueSigningLink.useMutation({
    onSuccess: (result) => {
      setIssuedUrl(toAbsoluteAppUrl(result.url));
      toast.success("Signing link ready. It has not been emailed.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (loading) {
    return <div className="max-w-xl mx-auto p-8">Loading...</div>;
  }
  const gate = AccessGate({ user });
  if (gate) return gate;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Agreement signing link</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Create a link for a client who will sign the 2026 Service Agreement without completing a credentialing application.
            </p>
          </div>
          <Button variant="outline" onClick={() => window.open("/admin", "_self")}>
            Back to submissions
          </Button>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">New agreement-only link</h2>
          <p className="text-sm text-muted-foreground">
            Company name and signer email are optional. If you enter them, they are shown on the signing page for the client to confirm. This form does not send email.
          </p>
          <div>
            <Label htmlFor="agreement-company-name" className="mb-2 block">Legal company name</Label>
            <Input id="agreement-company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="agreement-signer-email" className="mb-2 block">Signer email</Label>
            <Input id="agreement-signer-email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
          </div>
          <Button
            disabled={createLink.isPending}
            onClick={() => {
              setCreatedUrl("");
              createLink.mutate({
                companyName: companyName.trim(),
                signerEmail: signerEmail.trim(),
              });
            }}
          >
            {createLink.isPending ? "Creating..." : "Create signing link"}
          </Button>
          {createdUrl && <LinkResult url={createdUrl} />}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Link for an application already submitted</h2>
          <p className="text-sm text-muted-foreground">
            Use the submission id when a credentialing application is already saved and the client still needs to sign. This does not send email.
          </p>
          <div>
            <Label htmlFor="existing-intake-id" className="mb-2 block">Submission id</Label>
            <Input id="existing-intake-id" value={intakeId} onChange={(e) => setIntakeId(e.target.value)} inputMode="numeric" />
          </div>
          <Button
            variant="outline"
            disabled={issueLink.isPending}
            onClick={() => {
              const id = Number(intakeId);
              if (!Number.isInteger(id) || id < 1) {
                toast.error("Enter the submission id.");
                return;
              }
              setIssuedUrl("");
              issueLink.mutate({ intakeId: id });
            }}
          >
            {issueLink.isPending ? "Creating..." : "Create signing link"}
          </Button>
          {issuedUrl && <LinkResult url={issuedUrl} />}
        </Card>
      </div>
    </div>
  );
}
