import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import TypedSignature from "@/components/TypedSignature";
import { AgreementDocumentScroll, SERVICE_AGREEMENT_ACKNOWLEDGEMENTS } from "@/components/AgreementDocuments";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatCentralTime } from "@shared/const";

const TOKEN_RE = /^[a-f0-9]{64}$/;

export default function SignAgreement() {
  const params = useParams<{ token: string }>();
  const token = params.token || "";
  const tokenLooksValid = TOKEN_RE.test(token);
  const [agreed, setAgreed] = useState(false);
  const [fcra, setFcra] = useState(false);
  const [notice, setNotice] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [acceptedAt, setAcceptedAt] = useState("");
  const [typedName, setTypedName] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [done, setDone] = useState(false);

  const query = trpc.agreement.getForClientSign.useQuery(
    { token },
    { enabled: tokenLooksValid, retry: false, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!query.data || query.data.state !== "open" || seeded) return;
    if (query.data.kind === "agreement_only") {
      setCompanyName(query.data.companyName || "");
      setSignerEmail(query.data.signerEmail || "");
    }
    setSeeded(true);
  }, [query.data, seeded]);

  const sign = trpc.agreement.clientSign.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => toast.error(err.message),
  });

  if (!tokenLooksValid || query.error) {
    return <div className="max-w-xl mx-auto p-8">This signing link is invalid.</div>;
  }
  if (query.isLoading || !query.data) {
    return <div className="max-w-xl mx-auto p-8">Loading agreement...</div>;
  }
  if (query.data.state === "used") {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-3">Agreement already signed</h1>
        <p className="text-muted-foreground">
          This signing link has already been used. A signed agreement cannot be changed from this link.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Agreement signed</h1>
        <p className="text-muted-foreground">
          SaffHire has been emailed a link to open this agreement with your accepted signature already on it. After Robert Krebsbach, President, countersigns, both parties will receive the executed PDF.
        </p>
        {acceptedAt && <p className="text-sm mt-3">Signature accepted {formatCentralTime(acceptedAt)}</p>}
      </div>
    );
  }

  const agreementOnly = query.data.kind === "agreement_only";
  const shownCompany = agreementOnly ? companyName : query.data.companyName;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Agreement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {agreementOnly
            ? "Review the full documents below, acknowledge all three, and sign."
            : `Your application for ${shownCompany || "your company"} has been submitted. Review the full documents below, acknowledge all three, and sign.`}
        </p>
      </div>

      <Card className="p-6">
        <AgreementDocumentScroll />
      </Card>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
        <span className="text-sm">{SERVICE_AGREEMENT_ACKNOWLEDGEMENTS[0]}</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={fcra} onCheckedChange={(v) => setFcra(v === true)} />
        <span className="text-sm">{SERVICE_AGREEMENT_ACKNOWLEDGEMENTS[1]}</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={notice} onCheckedChange={(v) => setNotice(v === true)} />
        <span className="text-sm">{SERVICE_AGREEMENT_ACKNOWLEDGEMENTS[2]}</span>
      </label>

      {agreementOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="legal-company-name" className="mb-2 block">Legal company name *</Label>
            <Input id="legal-company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="signer-email" className="mb-2 block">Signer email *</Label>
            <Input id="signer-email" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="signer-name" className="mb-2 block">Signer Name *</Label>
          <Input id="signer-name" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="signer-title" className="mb-2 block">Title *</Label>
          <Input id="signer-title" value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Type your name to create a signature *</Label>
        <TypedSignature
          initialName={signerName}
          value={signature}
          acceptedAt={acceptedAt}
          onChange={({ dataUrl, typedName: nextName, acceptedAt: nextAccepted }) => {
            setSignature(dataUrl);
            setTypedName(nextName);
            setAcceptedAt(nextAccepted);
            if (nextName && !signerName) setSignerName(nextName);
          }}
        />
      </div>

      <Button
        className="w-full"
        disabled={sign.isPending}
        onClick={() => {
          if (!agreed || !fcra || !notice) {
            toast.error("Acknowledge all three documents before signing.");
            return;
          }
          if (agreementOnly && !companyName.trim()) {
            toast.error("Legal company name is required.");
            return;
          }
          if (agreementOnly && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerEmail.trim())) {
            toast.error("A valid signer email is required.");
            return;
          }
          if (!signerName.trim() || !signerTitle.trim() || !signature || !acceptedAt) {
            toast.error("Name, title, and accepted typed signature are required.");
            return;
          }
          sign.mutate({
            token,
            signerName: signerName.trim(),
            signerTitle: signerTitle.trim(),
            signatureDataUrl: signature,
            typedName: typedName || signerName.trim(),
            signatureAcceptedAt: acceptedAt,
            signatureMethod: "typed_cursive",
            agreedToServiceAgreement: true,
            acknowledgedFcraRights: true,
            acknowledgedUserNotice: true,
            companyName: agreementOnly ? companyName.trim() : undefined,
            signerEmail: agreementOnly ? signerEmail.trim() : undefined,
          });
        }}
      >
        {sign.isPending ? "Submitting signature..." : "Sign Agreement"}
      </Button>
    </div>
  );
}
