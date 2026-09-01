import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import { FormStep, ReviewScreen } from "./formSteps";

const STEPS = [
  { id: 0, title: "Client Information", label: "Client Info" },
  { id: 1, title: "Contact Information", label: "Contact Info" },
  { id: 2, title: "Business Address", label: "Business Address" },
  { id: 3, title: "Billing Address", label: "Billing Address" },
  { id: 4, title: "Admin Users", label: "Admin Users" },
];

export interface FormData {
  companyName: string;
  dba: string;
  ein: string;
  businessType: string;
  ownerName: string;
  ownerPhone: string;
  ownerPhoneExt: string;
  ownerEmail: string;
  businessEntity: string;
  contactName: string;
  contactEmail: string;
  contactWorkPhone: string;
  contactWorkPhoneExt: string;
  contactMobilePhone: string;
  businessStreet: string;
  businessStreet2: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessCountry: string;
  billingSameAsBusiness: boolean;
  billingStreet: string;
  billingStreet2: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  billingCountry: string;
  billingAttention: string;
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
}

const initialFormData: FormData = {
  companyName: "",
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
};

export default function AccountSetup() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
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
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0) {
      if (!formData.companyName.trim()) newErrors.companyName = "Company name is required";
      if (!formData.ein.trim()) newErrors.ein = "EIN is required";
      if (!formData.businessType.trim()) newErrors.businessType = "Business type is required";
      if (!formData.ownerName.trim()) newErrors.ownerName = "Owner name is required";
      if (!formData.ownerPhone.trim()) newErrors.ownerPhone = "Owner phone is required";
      if (!formData.ownerEmail.trim()) newErrors.ownerEmail = "Owner email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) newErrors.ownerEmail = "Invalid email format";
    } else if (step === 1) {
      if (!formData.contactName.trim()) newErrors.contactName = "Contact name is required";
      if (!formData.contactEmail.trim()) newErrors.contactEmail = "Contact email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) newErrors.contactEmail = "Invalid email format";
      if (!formData.contactWorkPhone.trim()) newErrors.contactWorkPhone = "Work phone is required";
      if (!formData.contactMobilePhone.trim()) newErrors.contactMobilePhone = "Mobile phone is required";
    } else if (step === 2) {
      if (!formData.businessStreet.trim()) newErrors.businessStreet = "Street address is required";
      if (!formData.businessCity.trim()) newErrors.businessCity = "City is required";
      if (!formData.businessState.trim()) newErrors.businessState = "State is required";
      if (!formData.businessZip.trim()) newErrors.businessZip = "ZIP code is required";
    } else if (step === 3 && !formData.billingSameAsBusiness) {
      if (!formData.billingStreet.trim()) newErrors.billingStreet = "Street address is required";
      if (!formData.billingCity.trim()) newErrors.billingCity = "City is required";
      if (!formData.billingState.trim()) newErrors.billingState = "State is required";
      if (!formData.billingZip.trim()) newErrors.billingZip = "ZIP code is required";
    } else if (step === 4) {
      if (!formData.admin1FirstName.trim()) newErrors.admin1FirstName = "First name is required";
      if (!formData.admin1LastName.trim()) newErrors.admin1LastName = "Last name is required";
      if (!formData.admin1Email.trim()) newErrors.admin1Email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin1Email)) newErrors.admin1Email = "Invalid email format";
      if (!formData.admin1Mobile.trim()) newErrors.admin1Mobile = "Mobile number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === STEPS.length - 1) setShowReview(true);
      else setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (showReview) setShowReview(false);
    else if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      submitIntake.mutate({
        companyName: formData.companyName,
        dba: formData.dba,
        ein: formData.ein,
        businessType: formData.businessType,
        businessEntity: formData.businessEntity,
        ownerName: formData.ownerName,
        ownerFirstName: formData.ownerName.split(" ")[0] || "",
        ownerLastName: formData.ownerName.split(" ").slice(1).join(" ") || formData.ownerName.split(" ")[0] || "",
        ownerEmail: formData.ownerEmail,
        ownerPhone: formData.ownerPhone,
        ownerPhoneExt: formData.ownerPhoneExt,
        ownerTitle: "",
        contactName: formData.contactName,
        contactFirstName: formData.contactName.split(" ")[0] || "",
        contactLastName: formData.contactName.split(" ").slice(1).join(" ") || formData.contactName.split(" ")[0] || "",
        contactEmail: formData.contactEmail,
        contactWorkPhone: formData.contactWorkPhone,
        contactWorkPhoneExt: formData.contactWorkPhoneExt,
        contactMobilePhone: formData.contactMobilePhone,
        contactPhone: formData.contactWorkPhone,
        contactTitle: "",
        businessStreet: formData.businessStreet,
        businessStreet2: formData.businessStreet2,
        businessCity: formData.businessCity,
        businessState: formData.businessState,
        businessZip: formData.businessZip,
        businessCountry: formData.businessCountry,
        billingSameAsBusiness: formData.billingSameAsBusiness ? "true" : "false",
        billingStreet: formData.billingStreet,
        billingStreet2: formData.billingStreet2,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingZip: formData.billingZip,
        billingCountry: formData.billingCountry,
        billingAttention: formData.billingAttention,
        adminUsers: [
          {
            firstName: formData.admin1FirstName,
            lastName: formData.admin1LastName,
            email: formData.admin1Email,
            phone: formData.admin1Mobile,
            jobTitle: formData.admin1JobTitle,
          },
          ...(formData.admin2FirstName ? [{
            firstName: formData.admin2FirstName,
            lastName: formData.admin2LastName,
            email: formData.admin2Email,
            phone: formData.admin2Mobile,
            jobTitle: formData.admin2JobTitle,
          }] : []),
          ...(formData.admin3FirstName ? [{
            firstName: formData.admin3FirstName,
            lastName: formData.admin3LastName,
            email: formData.admin3Email,
            phone: formData.admin3Mobile,
            jobTitle: formData.admin3JobTitle,
          }] : []),
        ],
        conversationLog: JSON.stringify(formData),
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to prepare form data");
    }
  };

  const progressPercentage = showReview ? 100 : ((currentStep + 1) / STEPS.length) * 100;

  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold mb-3 text-foreground">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            Your credentialing application has been submitted successfully. We'll review your information and be in touch shortly.
          </p>
          <Button onClick={() => window.location.reload()} className="w-full">Start New Application</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/manus-storage/SaffhireLogoShirtStyle_300428e9.webp" alt="SaffHire" className="h-12 w-auto" />
          <Button variant="outline" size="sm" asChild>
            <a href="https://www.saffhire.com" target="_blank" rel="noopener noreferrer">Back to Website</a>
          </Button>
        </div>
      </div>
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{showReview ? "Review Your Information" : STEPS[currentStep].title}</h2>
            <span className="text-sm text-muted-foreground">{showReview ? "Review" : `Step ${currentStep + 1} of ${STEPS.length}`}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {showReview ? <ReviewScreen formData={formData} /> : <FormStep step={currentStep} formData={formData} errors={errors} onChange={handleInputChange} />}
        <div className="flex gap-4 mt-8">
          <Button variant="outline" onClick={handleBack} className="flex-1">{showReview ? "Edit" : "Back"}</Button>
          <Button onClick={showReview ? handleSubmit : handleNext} disabled={submitIntake.isPending} className="flex-1">
            {submitIntake.isPending ? "Submitting..." : showReview ? "Confirm & Submit" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
