import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import TypedSignature from "@/components/TypedSignature";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SERVICE_AGREEMENT_SECTIONS, FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS } from "@shared/agreementText";
import { formatCentralTime } from "@shared/const";

export default function ClientAgreement({
  intakeId,
  companyName,
}: {
  intakeId: number;
  companyName: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const [fcra, setFcra] = useState(false);
  const [notice, setNotice] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signature, setSignature] = useState("");
  const [acceptedAt, setAcceptedAt] = useState("");
  const [typedName, setTypedName] = useState("");
  const [done, setDone] = useState(false);

  const sign = trpc.agreement.clientSign.useMutation({
    onSuccess: () => setDone(true),
    onError: (err) => toast.error(err.message),
  });

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Service Agreement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your application for {companyName || "your company"} has been submitted. Review the full documents below, acknowledge all three, and sign.
        </p>
      </div>

      <Card className="p-6">
        <div className="h-[28rem] overflow-y-auto space-y-5 text-sm leading-6 pr-2">
          {SERVICE_AGREEMENT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-semibold mb-1">{section.title}</h2>
              <p className="whitespace-pre-wrap">{section.body}</p>
            </div>
          ))}
          <div>
            <h2 className="font-semibold mb-1">Summary of Rights under the FCRA</h2>
            <p className="whitespace-pre-wrap">{FCRA_SUMMARY_OF_RIGHTS}</p>
          </div>
          <div>
            <h2 className="font-semibold mb-1">Notice to Users of Consumer Reports</h2>
            <p className="whitespace-pre-wrap">{NOTICE_TO_USERS}</p>
          </div>
        </div>
      </Card>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
        <span className="text-sm">I have read and agree to the SaffHire Service Agreement.</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={fcra} onCheckedChange={(v) => setFcra(v === true)} />
        <span className="text-sm">I acknowledge receipt of the Summary of Rights under the FCRA.</span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={notice} onCheckedChange={(v) => setNotice(v === true)} />
        <span className="text-sm">I acknowledge receipt of the Notice to Users of Consumer Reports.</span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="mb-2 block">Signer Name *</Label>
          <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-2 block">Title *</Label>
          <Input value={signerTitle} onChange={(e) => setSignerTitle(e.target.value)} />
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
          if (!signerName.trim() || !signerTitle.trim() || !signature || !acceptedAt) {
            toast.error("Name, title, and accepted typed signature are required.");
            return;
          }
          sign.mutate({
            intakeId,
            signerName: signerName.trim(),
            signerTitle: signerTitle.trim(),
            signatureDataUrl: signature,
            typedName: typedName || signerName.trim(),
            signatureAcceptedAt: acceptedAt,
            signatureMethod: "typed_cursive",
            agreedToServiceAgreement: true,
            acknowledgedFcraRights: true,
            acknowledgedUserNotice: true,
          });
        }}
      >
        {sign.isPending ? "Submitting signature..." : "Sign Agreement"}
      </Button>
    </div>
  );
}
