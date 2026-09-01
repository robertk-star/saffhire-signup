import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import SignaturePad from "@/components/SignaturePad";
import type { FormData } from "./AccountSetup";

export function AgreementStep({
  formData,
  errors,
  onChange,
}: {
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: string | boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-3">2026 SaffHire Service Agreement</h3>
        <div className="h-72 overflow-y-auto rounded-md border border-border bg-white p-4 text-sm leading-6">
          <p className="font-semibold mb-2">SaffHire Service Agreement</p>
          <p className="mb-3">This Service Agreement is entered into between SaffHire Background Screening LLC and the undersigned Client. It governs background screening and related services, including FCRA and DPPA compliance.</p>
          <p className="mb-2 font-medium">By signing, Client certifies that:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>It has a legitimate business need and a permissible purpose for consumer reports.</li>
            <li>Reports are for one-time end-user use and will not be sold or transferred except as allowed.</li>
            <li>It will provide required disclosures, obtain written authorization, and follow adverse action rules.</li>
            <li>It will keep compliance records for at least six years or the length of the consumer relationship, whichever is longer.</li>
            <li>It will protect report data, limit access, and notify SaffHire of a data breach within 24 business hours.</li>
          </ul>
          <p className="mb-3">The full agreement also covers fees, confidentiality, indemnification, misuse, termination, Texas law, the Summary of Rights under the FCRA, and the Notice to Users of Consumer Reports.</p>
          <p>After you sign, SaffHire will countersign as Robert Krebsbach, President. Both parties then receive a copy with both signatures.</p>
        </div>
      </Card>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={formData.agreedToServiceAgreement} onCheckedChange={(checked) => onChange("agreedToServiceAgreement", checked === true)} />
        <span className="text-sm">I have read and agree to the SaffHire Service Agreement.</span>
      </label>
      {errors.agreedToServiceAgreement && <p className="text-xs text-red-500">{errors.agreedToServiceAgreement}</p>}

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={formData.acknowledgedFcraRights} onCheckedChange={(checked) => onChange("acknowledgedFcraRights", checked === true)} />
        <span className="text-sm">I acknowledge receipt of the Summary of Rights under the FCRA.</span>
      </label>
      {errors.acknowledgedFcraRights && <p className="text-xs text-red-500">{errors.acknowledgedFcraRights}</p>}

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={formData.acknowledgedUserNotice} onCheckedChange={(checked) => onChange("acknowledgedUserNotice", checked === true)} />
        <span className="text-sm">I acknowledge receipt of the Notice to Users of Consumer Reports.</span>
      </label>
      {errors.acknowledgedUserNotice && <p className="text-xs text-red-500">{errors.acknowledgedUserNotice}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Signer Name *</Label>
          <Input value={formData.signerName} onChange={(e) => onChange("signerName", e.target.value)} />
          {errors.signerName && <p className="text-xs text-red-500 mt-1">{errors.signerName}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Title *</Label>
          <Input value={formData.signerTitle} onChange={(e) => onChange("signerTitle", e.target.value)} />
          {errors.signerTitle && <p className="text-xs text-red-500 mt-1">{errors.signerTitle}</p>}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Client Signature *</Label>
        <SignaturePad value={formData.signatureDataUrl} onChange={(value) => onChange("signatureDataUrl", value)} />
        {errors.signatureDataUrl && <p className="text-xs text-red-500 mt-1">{errors.signatureDataUrl}</p>}
      </div>
    </div>
  );
}
