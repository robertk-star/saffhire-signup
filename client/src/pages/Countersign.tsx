import { useMemo, useState } from "react";
import { useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import TypedSignature from "@/components/TypedSignature";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SERVICE_AGREEMENT_SECTIONS, FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS } from "@shared/agreementText";
import { SAFFHIRE_SIGNER_NAME, SAFFHIRE_SIGNER_TITLE, formatCentralTime } from "@shared/const";

function downloadPdf(filename: string, base64: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Countersign() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const token = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);
  const intakeId = Number(params.id);
  const [signature, setSignature] = useState("");
  const [acceptedAt, setAcceptedAt] = useState("");

  const query = trpc.agreement.getForCountersign.useQuery(
    { id: intakeId, token },
    { enabled: Boolean(intakeId && token) },
  );

  const download = trpc.agreement.downloadExecuted.useQuery(
    { id: intakeId, token },
    { enabled: false },
  );

  const countersign = trpc.agreement.countersignByToken.useMutation({
    onSuccess: (result) => {
      toast.success("Agreement executed.");
      if (result.pdfBase64) downloadPdf(result.filename, result.pdfBase64);
    },
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
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Agreement executed</h1>
        <p className="text-muted-foreground">A signed PDF has been emailed to SaffHire and the client. You can also download it here.</p>
        {acceptedAt && <p className="text-sm">SaffHire signature accepted {formatCentralTime(acceptedAt)}</p>}
        <Button
          onClick={async () => {
            const result = await download.refetch();
            if (result.data?.pdfBase64) downloadPdf(result.data.filename, result.data.pdfBase64);
            else toast.error(result.error?.message || "Could not download PDF");
          }}
        >
          Download signed PDF
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Countersign Service Agreement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data.companyName} has signed. Review the documents and the client signature, then accept your typed signature as {SAFFHIRE_SIGNER_NAME}, {SAFFHIRE_SIGNER_TITLE}.
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
        {data.signedAt && (
          <p className="text-xs text-muted-foreground mt-1">Signed {formatCentralTime(data.signedAt)}</p>
        )}
        {data.signatureDataUrl && (
          <img src={data.signatureDataUrl} alt="Client signature" className="h-20 mt-3 border rounded bg-white" />
        )}
      </Card>

      <div>
        <h2 className="font-semibold mb-2">SaffHire signature</h2>
        <p className="text-sm text-muted-foreground mb-2">{SAFFHIRE_SIGNER_NAME}, {SAFFHIRE_SIGNER_TITLE}</p>
        <TypedSignature
          initialName={SAFFHIRE_SIGNER_NAME}
          value={signature}
          acceptedAt={acceptedAt}
          onChange={({ dataUrl, acceptedAt: nextAccepted }) => {
            setSignature(dataUrl);
            setAcceptedAt(nextAccepted);
          }}
        />
      </div>

      <Button
        className="w-full"
        disabled={countersign.isPending}
        onClick={() => {
          if (!signature || !acceptedAt) {
            toast.error("Type your name and accept the cursive signature first.");
            return;
          }
          countersign.mutate({
            id: intakeId,
            token,
            signatureDataUrl: signature,
            signatureAcceptedAt: acceptedAt,
            signatureMethod: "typed_cursive",
          });
        }}
      >
        {countersign.isPending ? "Executing..." : "Countersign as Robert Krebsbach, President"}
      </Button>
    </div>
  );
}
