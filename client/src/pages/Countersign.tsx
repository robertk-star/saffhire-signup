import { useMemo, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SignaturePad from "@/components/SignaturePad";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SERVICE_AGREEMENT_SECTIONS, FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS } from "@shared/agreementText";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE } from "@shared/const";

export default function Countersign() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);
  const intakeId = Number(params.id);
  const [signature, setSignature] = useState("");

  const query = trpc.agreement.getForCountersign.useQuery(
    { id: intakeId, token },
    { enabled: Boolean(intakeId && token) },
  );

  const countersign = trpc.agreement.countersignByToken.useMutation({
    onSuccess: () => toast.success("Agreement executed. Both parties will receive the PDF."),
    onError: (err) => toast.error(err.message),
  });

  if (!intakeId || !token) {
    return <div className="max-w-xl mx-auto p-8">This countersign link is missing information.</div>;
  }
  if (query.isLoading) {
    return <div className="max-w-xl mx-auto p-8">Loading agreement...</div>;
  }
  if (query.error || !query.data) {
    return <div className="max-w-xl mx-auto p-8">This countersign link is invalid or already used.</div>;
  }

  const data = query.data;
  if (data.status === "fully_executed" || countersign.isSuccess) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-3">Agreement executed</h1>
        <p className="text-muted-foreground">Both parties have been emailed the executed PDF.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Countersign Service Agreement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.companyName} has signed. Review the documents and the client signature, then sign as {SAFFHIRE_SIGNER_NAME}, {SAFFHIRE_SIGNER_TITLE}.
        </p>
      </div>

      <Card className="p-6">
        <div className="h-80 overflow-y-auto space-y-5 text-sm leading-6 pr-2">
          {SERVICE_AGREEMENT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="font-semibold mb-1">{section.title}</h2>
              <p>{section.body}</p>
            </div>
          ))}
          <div>
            <h2 className="font-semibold mb-1">Summary of Rights under the FCRA</h2>
            <p>{FCRA_SUMMARY_OF_RIGHTS}</p>
          </div>
          <div>
            <h2 className="font-semibold mb-1">Notice to Users of Consumer Reports</h2>
            <p>{NOTICE_TO_USERS}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Client signature already on file</h2>
        <p className="text-sm">{data.signerName}, {data.signerTitle}</p>
        {data.signatureDataUrl && (
          <img src={data.signatureDataUrl} alt="Client signature" className="h-20 mt-3 border rounded bg-white" />
        )}
      </Card>

      <div>
        <h2 className="font-semibold mb-2">SaffHire signature</h2>
        <p className="text-sm text-muted-foreground mb-2">{SAFFHIRE_SIGNER_NAME}, {SAFFHIRE_SIGNER_TITLE}</p>
        <SignaturePad value={signature} onChange={setSignature} />
      </div>

      <Button
        className="w-full"
        disabled={countersign.isPending}
        onClick={() => {
          if (!signature) {
            toast.error("Your signature is required.");
            return;
          }
          countersign.mutate({ id: intakeId, token, signatureDataUrl: signature });
        }}
      >
        {countersign.isPending ? "Executing..." : "Countersign as Robert Krebsbach, President"}
      </Button>
    </div>
  );
}
