import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { nanoid } from "nanoid";

const STEPS = [
  { id: 0, title: "Client Information", label: "Client Info" },
  { id: 1, title: "Contact Information", label: "Contact Info" },
  { id: 2, title: "Business Address", label: "Business Address" },
  { id: 3, title: "Billing Address", label: "Billing Address" },
  { id: 4, title: "Admin Users", label: "Admin Users" },
  { id: 5, title: "Signature", label: "Signature" },
];

interface FormData {
  // Client Info
  companyName: string;
  companyLogoUrl: string;
  dba: string;
  ein: string;
  businessType: string;
  ownerName: string;
  ownerPhone: string;
  ownerPhoneExt: string;
  ownerEmail: string;
  businessEntity: string;

  // Contact Info
  contactName: string;
  contactEmail: string;
  contactWorkPhone: string;
  contactWorkPhoneExt: string;
  contactMobilePhone: string;

  // Business Address
  businessStreet: string;
  businessStreet2: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessCountry: string;

  // Billing Address
  billingSameAsBusiness: boolean;
  billingStreet: string;
  billingStreet2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  billingAttention: string;

  // Admin Users
  admin1FirstName: string;
  admin1LastName: string;
  admin1JobTitle: string;
  admin1Mobile: string;
  admin1Email: string;

  admin2FirstName: string;
  admin2LastName: string;
  admin2JobTitle: string;
  admin2Mobile: string;
  admin2Email: string;
  admin2Status: string;

  admin3FirstName: string;
  admin3LastName: string;
  admin3JobTitle: string;
  admin3Mobile: string;
  admin3Email: string;
  admin3Status: string;

  // Signature
  authorizedSignature: string;
  signatureDate: string;
  signatureName: string;
  signatureTitle: string;
}

const initialFormData: FormData = {
  companyName: "",
  companyLogoUrl: "",
  dba: "",
  ein: "",
  businessType: "",
  ownerName: "",
  ownerPhone: "",
  ownerPhoneExt: "",
  ownerEmail: "",
  businessEntity: "",
  contactName: "",
  contactEmail: "",
  contactWorkPhone: "",
  contactWorkPhoneExt: "",
  contactMobilePhone: "",
  businessStreet: "",
  businessStreet2: "",
  businessCity: "",
  businessState: "",
  businessZip: "",
  businessCountry: "",
  billingSameAsBusiness: true,
  billingStreet: "",
  billingStreet2: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  billingCountry: "",
  billingAttention: "",
  admin1FirstName: "",
  admin1LastName: "",
  admin1JobTitle: "",
  admin1Mobile: "",
  admin1Email: "",
  admin2FirstName: "",
  admin2LastName: "",
  admin2JobTitle: "",
  admin2Mobile: "",
  admin2Email: "",
  admin2Status: "",
  admin3FirstName: "",
  admin3LastName: "",
  admin3JobTitle: "",
  admin3Mobile: "",
  admin3Email: "",
  admin3Status: "",
  authorizedSignature: "",
  signatureDate: "",
  signatureName: "",
  signatureTitle: "",
};

export default function AccountSetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [sessionId] = useState(() => nanoid());
  const [showReview, setShowReview] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submitIntake = trpc.signup.submitIntake.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      toast.success("Submission successful!");
    },
    onError: (err) => {
      toast.error(`Submission failed: ${err.message}`);
    },
  });

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      // Client Info validation
      if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
      if (!formData.ein.trim()) newErrors.ein = "EIN is required";
      if (!formData.businessType.trim()) newErrors.businessType = "Business type is required";
      if (!formData.ownerName.trim()) newErrors.ownerName = "Owner name is required";
      if (!formData.ownerPhone.trim()) newErrors.ownerPhone = "Owner phone is required";
      if (!formData.ownerEmail.trim()) newErrors.ownerEmail = "Owner email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail))
        newErrors.ownerEmail = "Invalid email format";
    } else if (step === 1) {
      // Contact Info validation
      if (!formData.contactName.trim()) newErrors.contactName = "Contact name is required";
      if (!formData.contactEmail.trim()) newErrors.contactEmail = "Contact email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail))
        newErrors.contactEmail = "Invalid email format";
      if (!formData.contactWorkPhone.trim()) newErrors.contactWorkPhone = "Work phone is required";
    } else if (step === 2) {
      // Business Address validation
      if (!formData.businessStreet.trim()) newErrors.businessStreet = "Street address is required";
      if (!formData.businessCity.trim()) newErrors.businessCity = "City is required";
      if (!formData.businessState.trim()) newErrors.businessState = "State is required";
      if (!formData.businessZip.trim()) newErrors.businessZip = "ZIP code is required";
    } else if (step === 3) {
      // Billing Address validation
      if (!formData.billingSameAsBusiness) {
        if (!formData.billingStreet.trim()) newErrors.billingStreet = "Street address is required";
        if (!formData.billingCity.trim()) newErrors.billingCity = "City is required";
        if (!formData.billingState.trim()) newErrors.billingState = "State is required";
        if (!formData.billingZip.trim()) newErrors.billingZip = "ZIP code is required";
      }
    } else if (step === 4) {
      // Admin Users validation
      if (!formData.admin1FirstName.trim()) newErrors.admin1FirstName = "First name is required";
      if (!formData.admin1LastName.trim()) newErrors.admin1LastName = "Last name is required";
      if (!formData.admin1Email.trim()) newErrors.admin1Email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin1Email))
        newErrors.admin1Email = "Invalid email format";
      if (!formData.admin1Mobile.trim()) newErrors.admin1Mobile = "Mobile number is required";
    } else if (step === 5) {
      // Signature validation
      if (!formData.authorizedSignature.trim()) newErrors.authorizedSignature = "Signature is required";
      if (!formData.signatureDate.trim()) newErrors.signatureDate = "Date is required";
      if (!formData.signatureName.trim()) newErrors.signatureName = "Name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === STEPS.length - 1) {
        setShowReview(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (showReview) {
      setShowReview(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    submitIntake.mutate({
      companyName: formData.companyName,
      companyLogoUrl: formData.companyLogoUrl,
      ein: formData.ein,
      businessEntity: formData.businessEntity,
      ownerFirstName: formData.ownerName.split(" ")[0] || "",
      ownerLastName: formData.ownerName.split(" ").slice(1).join(" ") || formData.ownerName.split(" ")[0] || "",
      ownerEmail: formData.ownerEmail,
      ownerPhone: formData.ownerPhone,
      ownerTitle: "",
      contactFirstName: formData.contactName.split(" ")[0] || "",
      contactLastName: formData.contactName.split(" ").slice(1).join(" ") || formData.contactName.split(" ")[0] || "",
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactWorkPhone,
      contactTitle: "",
      businessStreet: formData.businessStreet,
      businessCity: formData.businessCity,
      businessState: formData.businessState,
      businessZip: formData.businessZip,
      billingSameAsBusiness: formData.billingSameAsBusiness ? "true" : "false",
      billingStreet: formData.billingStreet,
      billingCity: formData.billingCity,
      billingState: formData.billingState,
      billingZip: formData.billingZip,
      adminUsers: [
        {
          firstName: formData.admin1FirstName,
          lastName: formData.admin1LastName,
          email: formData.admin1Email,
          phone: formData.admin1Mobile,
        },
        ...(formData.admin2FirstName ? [{
          firstName: formData.admin2FirstName,
          lastName: formData.admin2LastName,
          email: formData.admin2Email,
          phone: formData.admin2Mobile,
        }] : []),
        ...(formData.admin3FirstName ? [{
          firstName: formData.admin3FirstName,
          lastName: formData.admin3LastName,
          email: formData.admin3Email,
          phone: formData.admin3Mobile,
        }] : []),
      ],
    });
  };

  const progressPercentage = showReview ? 100 : ((currentStep + 1) / STEPS.length) * 100;

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-3 text-foreground">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            Your credentialing application has been submitted successfully. We'll review your information and be in touch shortly.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Start New Application
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <img src="/manus-storage/SaffhireLogoShirtStyle_a1b2c3d4.webp" alt="SaffHire" className="h-12" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {showReview ? "Review Your Information" : STEPS[currentStep].title}
            </h2>
            <span className="text-sm text-muted-foreground">
              {showReview ? "Review" : `Step ${currentStep + 1} of ${STEPS.length}`}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showReview ? (
          <ReviewScreen formData={formData} />
        ) : (
          <FormStep step={currentStep} formData={formData} errors={errors} onChange={handleInputChange} />
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 mt-8">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            {showReview ? "Edit" : "Back"}
          </Button>
          <Button
            onClick={showReview ? handleSubmit : handleNext}
            disabled={submitIntake.isPending}
            className="flex-1"
          >
            {submitIntake.isPending ? "Submitting..." : showReview ? "Confirm & Submit" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FormStepProps {
  step: number;
  formData: FormData;
  errors: Record<string, string>;
  onChange: (field: keyof FormData, value: string | boolean) => void;
}

function FormStep({ step, formData, errors, onChange }: FormStepProps) {
  // Create a stable sessionId using nanoid if not already created
  const [sessionId] = useState(() => nanoid());
  if (step === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company Name *" error={errors.companyName}>
            <Input
              value={formData.companyName}
              onChange={(e) => onChange("companyName", e.target.value)}
              placeholder="Legal business name"
            />
          </FormField>
          <FormField label="DBA" error={errors.dba}>
            <Input
              value={formData.dba}
              onChange={(e) => onChange("dba", e.target.value)}
              placeholder="Doing Business As"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="EIN (Tax ID) *" error={errors.ein}>
            <Input value={formData.ein} onChange={(e) => onChange("ein", e.target.value)} placeholder="XX-XXXXXXX" />
          </FormField>
          <FormField label="Business Type *" error={errors.businessType}>
            <Input
              value={formData.businessType}
              onChange={(e) => onChange("businessType", e.target.value)}
              placeholder="e.g., Staffing, Consulting"
            />
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
                <Checkbox
                  checked={formData.businessEntity === entity}
                  onCheckedChange={() => onChange("businessEntity", entity)}
                />
                <span className="text-sm">{entity}</span>
              </label>
            ))}
          </div>
        </FormField>

        <CompanyLogoUpload formData={formData} onChange={onChange} sessionId={sessionId} />
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
          <Input
            value={formData.contactEmail}
            onChange={(e) => onChange("contactEmail", e.target.value)}
            type="email"
          />
        </FormField>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Work Phone *" error={errors.contactWorkPhone}>
            <Input value={formData.contactWorkPhone} onChange={(e) => onChange("contactWorkPhone", e.target.value)} />
          </FormField>
          <FormField label="Ext" error="">
            <Input
              value={formData.contactWorkPhoneExt}
              onChange={(e) => onChange("contactWorkPhoneExt", e.target.value)}
            />
          </FormField>
          <FormField label="Mobile Phone" error="">
            <Input
              value={formData.contactMobilePhone}
              onChange={(e) => onChange("contactMobilePhone", e.target.value)}
            />
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
          <Checkbox
            checked={formData.billingSameAsBusiness}
            onCheckedChange={(checked) => onChange("billingSameAsBusiness", checked as boolean)}
          />
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
          <Input
            value={formData.billingAttention}
            onChange={(e) => onChange("billingAttention", e.target.value)}
            placeholder="Contact name or department"
          />
        </FormField>
      </div>
    );
  }

  if (step === 4) {
    // Determine how many users have been added based on form data
    const userCount = formData.admin1FirstName.trim() ? 1 : 0;
    const hasUser2 = formData.admin2FirstName.trim() ? 1 : 0;
    const hasUser3 = formData.admin3FirstName.trim() ? 1 : 0;
    const totalUsers = userCount + hasUser2 + hasUser3;

    const renderAdminUser = (userNum: number) => (
      <Card key={userNum} className="p-6">
        <h3 className="font-semibold mb-4">
          {userNum === 1 ? "Primary Admin User" : `Additional User ${userNum}`}
          {userNum > 1 && formData[`admin${userNum}Status` as keyof FormData] && (
            <span className="text-sm text-muted-foreground ml-2">
              ({formData[`admin${userNum}Status` as keyof FormData]})
            </span>
          )}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField
            label="First Name *"
            error={errors[`admin${userNum}FirstName` as keyof typeof errors]}
          >
            <Input
              value={formData[`admin${userNum}FirstName` as keyof FormData] as string}
              onChange={(e) => onChange(`admin${userNum}FirstName` as keyof FormData, e.target.value)}
            />
          </FormField>
          <FormField label="Last Name *" error={errors[`admin${userNum}LastName` as keyof typeof errors]}>
            <Input
              value={formData[`admin${userNum}LastName` as keyof FormData] as string}
              onChange={(e) => onChange(`admin${userNum}LastName` as keyof FormData, e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Job Title" error="">
          <Input
            value={formData[`admin${userNum}JobTitle` as keyof FormData] as string}
            onChange={(e) => onChange(`admin${userNum}JobTitle` as keyof FormData, e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4 my-4">
          <FormField label="Mobile Number *" error={errors[`admin${userNum}Mobile` as keyof typeof errors]}>
            <Input
              value={formData[`admin${userNum}Mobile` as keyof FormData] as string}
              onChange={(e) => onChange(`admin${userNum}Mobile` as keyof FormData, e.target.value)}
              placeholder="Used for 2FA"
            />
          </FormField>
          <FormField label="Email *" error={errors[`admin${userNum}Email` as keyof typeof errors]}>
            <Input
              value={formData[`admin${userNum}Email` as keyof FormData] as string}
              onChange={(e) => onChange(`admin${userNum}Email` as keyof FormData, e.target.value)}
              type="email"
            />
          </FormField>
        </div>
      </Card>
    );

    return (
      <div className="space-y-6">
        {/* Primary Admin */}
        {renderAdminUser(1)}

        {/* Ask about adding User 2 */}
        {totalUsers === 1 && (
          <Card className="p-6 bg-accent/50 border-2 border-dashed">
            <h3 className="font-semibold mb-4">Add another user?</h3>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Ask about access level for User 2
                  onChange("admin2Status", "pending");
                }}
              >
                Yes, Add User 2
              </Button>
              <Button variant="outline" onClick={() => onChange("admin2Status", "skipped")}>
                No, Skip
              </Button>
            </div>
          </Card>
        )}

        {/* Access level question for User 2 */}
        {formData.admin2Status === "pending" && (
          <Card className="p-6 border-2 border-primary">
            <h3 className="font-semibold mb-4">What access level for User 2?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin2Status", "Admin")}>
                Admin Access
              </Button>
              <Button variant="outline" onClick={() => onChange("admin2Status", "General")}>
                General Access
              </Button>
            </div>
          </Card>
        )}

        {/* User 2 form */}
        {(formData.admin2Status === "Admin" || formData.admin2Status === "General") &&
          renderAdminUser(2)}

        {/* Ask about adding User 3 */}
        {totalUsers === 2 && formData.admin2Status !== "skipped" && (
          <Card className="p-6 bg-accent/50 border-2 border-dashed">
            <h3 className="font-semibold mb-4">Add a third user?</h3>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  onChange("admin3Status", "pending");
                }}
              >
                Yes, Add User 3
              </Button>
              <Button variant="outline" onClick={() => onChange("admin3Status", "skipped")}>
                No, Done
              </Button>
            </div>
          </Card>
        )}

        {/* Access level question for User 3 */}
        {formData.admin3Status === "pending" && (
          <Card className="p-6 border-2 border-primary">
            <h3 className="font-semibold mb-4">What access level for User 3?</h3>
            <div className="flex gap-3">
              <Button onClick={() => onChange("admin3Status", "Admin")}>
                Admin Access
              </Button>
              <Button variant="outline" onClick={() => onChange("admin3Status", "General")}>
                General Access
              </Button>
            </div>
          </Card>
        )}

        {/* User 3 form */}
        {(formData.admin3Status === "Admin" || formData.admin3Status === "General") &&
          renderAdminUser(3)}
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="space-y-6">
        <FormField label="Authorized Signature *" error={errors.authorizedSignature}>
          <Input
            value={formData.authorizedSignature}
            onChange={(e) => onChange("authorizedSignature", e.target.value)}
            placeholder="Type your full name as signature"
          />
        </FormField>

        <FormField label="Date *" error={errors.signatureDate}>
          <Input
            value={formData.signatureDate}
            onChange={(e) => onChange("signatureDate", e.target.value)}
            type="date"
          />
        </FormField>

        <FormField label="Name *" error={errors.signatureName}>
          <Input value={formData.signatureName} onChange={(e) => onChange("signatureName", e.target.value)} />
        </FormField>

        <FormField label="Title *" error={errors.signatureTitle}>
          <Input value={formData.signatureTitle} onChange={(e) => onChange("signatureTitle", e.target.value)} />
        </FormField>
      </div>
    );
  }

  return null;
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground mb-2 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function ReviewScreen({ formData }: { formData: FormData }) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Client Information</h3>
        {formData.companyLogoUrl && (
          <div className="mb-4 pb-4 border-b border-border">
            <img
              src={formData.companyLogoUrl}
              alt="Company Logo"
              className="h-20 w-auto object-contain"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Company Name</p>
            <p className="font-medium">{formData.companyName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">DBA</p>
            <p className="font-medium">{formData.dba || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">EIN</p>
            <p className="font-medium">{formData.ein}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Business Type</p>
            <p className="font-medium">{formData.businessType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Owner Name</p>
            <p className="font-medium">{formData.ownerName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Owner Email</p>
            <p className="font-medium">{formData.ownerEmail}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Contact Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{formData.contactName || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{formData.contactEmail || "—"}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Business Address</h3>
        <div className="text-sm">
          <p className="font-medium">{formData.businessStreet}</p>
          {formData.businessStreet2 && <p className="font-medium">{formData.businessStreet2}</p>}
          <p className="font-medium">
            {formData.businessCity}, {formData.businessState} {formData.businessZip}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Admin Users</h3>
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Primary Admin</p>
            <p className="font-medium">
              {formData.admin1FirstName} {formData.admin1LastName}
            </p>
            <p className="text-muted-foreground">{formData.admin1Email}</p>
            {formData.admin1JobTitle && <p className="text-muted-foreground">{formData.admin1JobTitle}</p>}
          </div>

          {formData.admin2FirstName && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground">
                User 2 {formData.admin2Status && `(${formData.admin2Status})`}
              </p>
              <p className="font-medium">
                {formData.admin2FirstName} {formData.admin2LastName}
              </p>
              <p className="text-muted-foreground">{formData.admin2Email}</p>
              {formData.admin2JobTitle && <p className="text-muted-foreground">{formData.admin2JobTitle}</p>}
            </div>
          )}

          {formData.admin3FirstName && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground">
                User 3 {formData.admin3Status && `(${formData.admin3Status})`}
              </p>
              <p className="font-medium">
                {formData.admin3FirstName} {formData.admin3LastName}
              </p>
              <p className="text-muted-foreground">{formData.admin3Email}</p>
              {formData.admin3JobTitle && <p className="text-muted-foreground">{formData.admin3JobTitle}</p>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


interface CompanyLogoUploadProps {
  formData: FormData;
  onChange: (field: keyof FormData, value: string | boolean) => void;
  sessionId: string;
}

function CompanyLogoUpload({ formData, onChange, sessionId }: CompanyLogoUploadProps) {
  const uploadLogo = trpc.signup.uploadCompanyLogo.useMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(",")[1];
        if (!base64) return;

        try {
          const result = await uploadLogo.mutateAsync({
            sessionId,
            fileData: base64,
            fileName: file.name,
            mimeType: file.type,
          });

          onChange("companyLogoUrl", result.url);
          toast.success("Logo uploaded successfully");
        } catch (err) {
          toast.error("Failed to upload logo");
          console.error(err);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to read file");
      console.error(err);
    }
  };

  return (
    <FormField label="Company Logo (Optional)">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploadLogo.isPending}
            className="flex-1"
          />
          {uploadLogo.isPending && <span className="text-sm text-muted-foreground">Uploading...</span>}
        </div>
        {formData.companyLogoUrl && (
          <div className="flex items-center gap-4">
            <img
              src={formData.companyLogoUrl}
              alt="Company Logo"
              className="h-16 w-auto object-contain border border-border rounded p-2"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange("companyLogoUrl", "")}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </FormField>
  );
}
