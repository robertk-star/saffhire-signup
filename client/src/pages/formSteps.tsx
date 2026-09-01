import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { FormData } from "./AccountSetup";

interface FormStepProps {
  step: number;
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: string | boolean) => void;
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function FormStep({ step, formData, errors, onChange }: FormStepProps) {
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company Name *" error={errors.companyName}>
            <Input value={formData.companyName} onChange={(e) => onChange("companyName", e.target.value)} placeholder="Legal business name" />
          </FormField>
          <FormField label="DBA" error={errors.dba}>
            <Input value={formData.dba} onChange={(e) => onChange("dba", e.target.value)} placeholder="Doing Business As" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="EIN (Tax ID) *" error={errors.ein}>
            <Input value={formData.ein} onChange={(e) => onChange("ein", e.target.value)} placeholder="XX-XXXXXXX" />
          </FormField>
          <FormField label="Business Type *" error={errors.businessType}>
            <Input value={formData.businessType} onChange={(e) => onChange("businessType", e.target.value)} placeholder="e.g., Staffing, Consulting" />
          </FormField>
        </div>
        <FormField label="Owner Name *" error={errors.ownerName}>
          <Input value={formData.ownerName} onChange={(e) => onChange("ownerName", e.target.value)} />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Owner Phone *" error={errors.ownerPhone}>
            <Input value={formData.ownerPhone} onChange={(e) => onChange("ownerPhone", e.target.value)} />
          </FormField>
          <FormField label="Ext" error="">
            <Input value={formData.ownerPhoneExt} onChange={(e) => onChange("ownerPhoneExt", e.target.value)} />
          </FormField>
          <FormField label="Owner Email *" error={errors.ownerEmail}>
            <Input value={formData.ownerEmail} onChange={(e) => onChange("ownerEmail", e.target.value)} type="email" />
          </FormField>
        </div>
        <FormField label="Business Entity *" error={errors.businessEntity}>
          <div className="space-y-2">
            {["LLC", "Inc", "Private Corp", "Partnership", "Sole Proprietor"].map((entity) => (
              <label key={entity} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={formData.businessEntity === entity} onCheckedChange={() => onChange("businessEntity", entity)} />
                <span className="text-sm">{entity}</span>
              </label>
            ))}
          </div>
        </FormField>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">If different from owner</p>
        <FormField label="Contact Name *" error={errors.contactName}>
          <Input value={formData.contactName} onChange={(e) => onChange("contactName", e.target.value)} />
        </FormField>
        <FormField label="Contact Email *" error={errors.contactEmail}>
          <Input value={formData.contactEmail} onChange={(e) => onChange("contactEmail", e.target.value)} type="email" />
        </FormField>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Work Phone *" error={errors.contactWorkPhone}>
            <Input value={formData.contactWorkPhone} onChange={(e) => onChange("contactWorkPhone", e.target.value)} />
          </FormField>
          <FormField label="Ext" error="">
            <Input value={formData.contactWorkPhoneExt} onChange={(e) => onChange("contactWorkPhoneExt", e.target.value)} />
          </FormField>
          <FormField label="Mobile Phone *" error={errors.contactMobilePhone}>
            <Input value={formData.contactMobilePhone} onChange={(e) => onChange("contactMobilePhone", e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Used for 2 factor login.</p>
          </FormField>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Street Address *" error={errors.businessStreet}>
            <Input value={formData.businessStreet} onChange={(e) => onChange("businessStreet", e.target.value)} />
          </FormField>
          <FormField label="Address Line 2" error="">
            <Input value={formData.businessStreet2} onChange={(e) => onChange("businessStreet2", e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="City *" error={errors.businessCity}>
            <Input value={formData.businessCity} onChange={(e) => onChange("businessCity", e.target.value)} />
          </FormField>
          <FormField label="State *" error={errors.businessState}>
            <Input value={formData.businessState} onChange={(e) => onChange("businessState", e.target.value)} />
          </FormField>
          <FormField label="ZIP *" error={errors.businessZip}>
            <Input value={formData.businessZip} onChange={(e) => onChange("businessZip", e.target.value)} />
          </FormField>
        </div>
        <FormField label="Country" error="">
          <Input value={formData.businessCountry} onChange={(e) => onChange("businessCountry", e.target.value)} />
        </FormField>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={formData.billingSameAsBusiness} onCheckedChange={(checked) => onChange("billingSameAsBusiness", checked as boolean)} />
          <span className="text-sm font-medium">Same as Business Address</span>
        </label>
        {!formData.billingSameAsBusiness && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Street Address *" error={errors.billingStreet}>
                <Input value={formData.billingStreet} onChange={(e) => onChange("billingStreet", e.target.value)} />
              </FormField>
              <FormField label="Address Line 2" error="">
                <Input value={formData.billingStreet2} onChange={(e) => onChange("billingStreet2", e.target.value)} />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="City *" error={errors.billingCity}>
                <Input value={formData.billingCity} onChange={(e) => onChange("billingCity", e.target.value)} />
              </FormField>
              <FormField label="State *" error={errors.billingState}>
                <Input value={formData.billingState} onChange={(e) => onChange("billingState", e.target.value)} />
              </FormField>
              <FormField label="ZIP *" error={errors.billingZip}>
                <Input value={formData.billingZip} onChange={(e) => onChange("billingZip", e.target.value)} />
              </FormField>
            </div>
            <FormField label="Country" error="">
              <Input value={formData.billingCountry} onChange={(e) => onChange("billingCountry", e.target.value)} />
            </FormField>
          </>
        )}
        <FormField label="Attention" error="">
          <Input value={formData.billingAttention} onChange={(e) => onChange("billingAttention", e.target.value)} placeholder="Contact name or department" />
        </FormField>
      </div>
    );
  }

  if (step === 4) {
    const totalUsers = [formData.admin1FirstName, formData.admin2FirstName, formData.admin3FirstName].filter((v) => v.trim()).length;
    const renderAdminUser = (userNum: number) => (
      <Card key={userNum} className="p-6">
        <h3 className="font-semibold mb-4">
          {userNum === 1 ? "Primary Admin User" : `Additional User ${userNum}`}
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="First Name *" error={errors[`admin${userNum}FirstName`]}>
            <Input value={formData[`admin${userNum}FirstName` as keyof FormData] as string} onChange={(e) => onChange(`admin${userNum}FirstName` as keyof FormData, e.target.value)} />
          </FormField>
          <FormField label="Last Name *" error={errors[`admin${userNum}LastName`]}>
            <Input value={formData[`admin${userNum}LastName` as keyof FormData] as string} onChange={(e) => onChange(`admin${userNum}LastName` as keyof FormData, e.target.value)} />
          </FormField>
        </div>
        <FormField label="Job Title" error="">
          <Input value={formData[`admin${userNum}JobTitle` as keyof FormData] as string} onChange={(e) => onChange(`admin${userNum}JobTitle` as keyof FormData, e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4 my-4">
          <FormField label="Mobile Number *" error={errors[`admin${userNum}Mobile`]}>
            <Input value={formData[`admin${userNum}Mobile` as keyof FormData] as string} onChange={(e) => onChange(`admin${userNum}Mobile` as keyof FormData, e.target.value)} placeholder="Used for 2FA" />
          </FormField>
          <FormField label="Email *" error={errors[`admin${userNum}Email`]}>
            <Input value={formData[`admin${userNum}Email` as keyof FormData] as string} onChange={(e) => onChange(`admin${userNum}Email` as keyof FormData, e.target.value)} type="email" />
          </FormField>
        </div>
      </Card>
    );
    return (
      <div className="space-y-6">
        {renderAdminUser(1)}
        {totalUsers === 1 && (
          <Card className="p-6 bg-accent/50 border-2 border-dashed">
            <h3 className="font-semibold mb-4">Add another user?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin2Status", "pending")}>Yes, Add User 2</Button>
              <Button variant="outline" onClick={() => onChange("admin2Status", "skipped")}>No, Skip</Button>
            </div>
          </Card>
        )}
        {formData.admin2Status === "pending" && (
          <Card className="p-6 border-2 border-primary">
            <h3 className="font-semibold mb-4">What access level for User 2?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin2Status", "Admin")}>Admin Access</Button>
              <Button variant="outline" onClick={() => onChange("admin2Status", "General")}>General Access</Button>
            </div>
          </Card>
        )}
        {(formData.admin2Status === "Admin" || formData.admin2Status === "General") && renderAdminUser(2)}
        {totalUsers === 2 && formData.admin2Status !== "skipped" && (
          <Card className="p-6 bg-accent/50 border-2 border-dashed">
            <h3 className="font-semibold mb-4">Add a third user?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin3Status", "pending")}>Yes, Add User 3</Button>
              <Button variant="outline" onClick={() => onChange("admin3Status", "skipped")}>No, Done</Button>
            </div>
          </Card>
        )}
        {formData.admin3Status === "pending" && (
          <Card className="p-6 border-2 border-primary">
            <h3 className="font-semibold mb-4">What access level for User 3?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin3Status", "Admin")}>Admin Access</Button>
              <Button variant="outline" onClick={() => onChange("admin3Status", "General")}>General Access</Button>
            </div>
          </Card>
        )}
        {(formData.admin3Status === "Admin" || formData.admin3Status === "General") && renderAdminUser(3)}
      </div>
    );
  }

  return null;
}

export function ReviewScreen({ formData }: { formData: FormData }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Client Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Company Name</p><p className="font-medium">{formData.companyName}</p></div>
          <div><p className="text-muted-foreground">Owner Name</p><p className="font-medium">{formData.ownerName}</p></div>
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Name</p><p className="font-medium">{formData.contactName || "-"}</p></div>
          <div><p className="text-muted-foreground">Mobile Phone</p><p className="font-medium">{formData.contactMobilePhone || "-"}</p></div>
        </div>
      </Card>
    </div>
  );
}
