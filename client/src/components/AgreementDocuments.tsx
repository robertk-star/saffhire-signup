import { FCRA_SUMMARY_OF_RIGHTS, NOTICE_TO_USERS, SERVICE_AGREEMENT_SECTIONS } from "@shared/agreementText";

export const SERVICE_AGREEMENT_ACKNOWLEDGEMENTS = [
  "I have read and agree to the SaffHire Service Agreement.",
  "I acknowledge receipt of the Summary of Rights under the FCRA.",
  "I acknowledge receipt of the Notice to Users of Consumer Reports.",
] as const;

export function AgreementDocumentScroll() {
  return (
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
  );
}
