import { Card } from "@/components/ui/card";
import type { FormData } from "./AccountSetup";

function Item({ label, value }: { label: string; value?: string | boolean | null }) {
  const display = value === true ? "Yes" : value === false ? "No" : (value && String(value).trim() ? String(value) : "-");
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{display}</p>
    </div>
  );
}

function addressLine(street: string, street2: string, city: string, state: string, zip: string, country: string) {
  return [street, street2, [city, state, zip].filter(Boolean).join(", "), country].filter((part) => part && part.trim()).join("\n") || "-";
}

export function ReviewScreen({ formData }: { formData: FormData }) {
  const billing = formData.billingSameAsBusiness
    ? "Same as business address"
    : addressLine(formData.billingStreet, formData.billingStreet2, formData.billingCity, formData.billingState, formData.billingZip, formData.billingCountry);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Client Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Item label="Company Name" value={formData.companyName} />
          <Item label="DBA" value={formData.dba} />
          <Item label="EIN" value={formData.ein} />
          <Item label="Business Type" value={formData.businessType} />
          <Item label="Business Entity" value={formData.businessEntity} />
          <Item label="Owner Name" value={formData.ownerName} />
          <Item label="Owner Phone" value={[formData.ownerPhone, formData.ownerPhoneExt].filter(Boolean).join(" ext ")} />
          <Item label="Owner Email" value={formData.ownerEmail} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Item label="Contact Name" value={formData.contactName} />
          <Item label="Contact Email" value={formData.contactEmail} />
          <Item label="Work Phone" value={[formData.contactWorkPhone, formData.contactWorkPhoneExt].filter(Boolean).join(" ext ")} />
          <Item label="Mobile Phone" value={formData.contactMobilePhone} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Business Address</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Item label="Street" value={formData.businessStreet} />
          <Item label="Address Line 2" value={formData.businessStreet2} />
          <Item label="City" value={formData.businessCity} />
          <Item label="State" value={formData.businessState} />
          <Item label="ZIP" value={formData.businessZip} />
          <Item label="Country" value={formData.businessCountry} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Billing Address</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Item label="Same as Business Address" value={formData.billingSameAsBusiness} />
          <Item label="Attention" value={formData.billingAttention} />
          {!formData.billingSameAsBusiness && (
            <>
              <Item label="Street" value={formData.billingStreet} />
              <Item label="Address Line 2" value={formData.billingStreet2} />
              <Item label="City" value={formData.billingCity} />
              <Item label="State" value={formData.billingState} />
              <Item label="ZIP" value={formData.billingZip} />
              <Item label="Country" value={formData.billingCountry} />
            </>
          )}
          {formData.billingSameAsBusiness && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Address</p>
              <p className="font-medium whitespace-pre-line">{billing}</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Admin Users</h3>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <Item label="Primary Admin" value={`${formData.admin1FirstName} ${formData.admin1LastName}`.trim()} />
            <Item label="Job Title" value={formData.admin1JobTitle} />
            <Item label="Email" value={formData.admin1Email} />
            <Item label="Mobile" value={formData.admin1Mobile} />
          </div>
          {formData.admin2FirstName && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <Item label="User 2" value={`${formData.admin2FirstName} ${formData.admin2LastName}`.trim()} />
              <Item label="Access" value={formData.admin2Status} />
              <Item label="Job Title" value={formData.admin2JobTitle} />
              <Item label="Email" value={formData.admin2Email} />
              <Item label="Mobile" value={formData.admin2Mobile} />
            </div>
          )}
          {formData.admin3FirstName && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <Item label="User 3" value={`${formData.admin3FirstName} ${formData.admin3LastName}`.trim()} />
              <Item label="Access" value={formData.admin3Status} />
              <Item label="Job Title" value={formData.admin3JobTitle} />
              <Item label="Email" value={formData.admin3Email} />
              <Item label="Mobile" value={formData.admin3Mobile} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
