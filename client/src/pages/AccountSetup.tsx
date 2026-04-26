import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AdminUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
};

type IntakeData = {
  // Section 1
  companyName?: string;
  ein?: string;
  businessEntity?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  ownerTitle?: string;
  // Section 2
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactTitle?: string;
  // Section 3
  businessStreet?: string;
  businessCity?: string;
  businessState?: string;
  businessZip?: string;
  // Section 4
  billingSameAsBusiness?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  // Section 5 — admin users stored separately
};

type FormStage = "chat" | "review" | "success";

const SECTION_TITLES = [
  "Client Information",
  "Contact Information",
  "Business Address",
  "Billing Address",
  "Admin Users",
];

const TOTAL_SECTIONS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
      <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
      <span className="typing-dot w-2 h-2 rounded-full bg-primary/60 inline-block" />
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ currentSection }: { currentSection: number }) {
  const pct = Math.round(((currentSection) / TOTAL_SECTIONS) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          {currentSection < TOTAL_SECTIONS
            ? `Step ${currentSection + 1} of ${TOTAL_SECTIONS} — ${SECTION_TITLES[currentSection]}`
            : "All sections complete"}
        </span>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-shimmer transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex mt-2 gap-1">
        {SECTION_TITLES.map((title, i) => (
          <div
            key={title}
            className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${
              i < currentSection
                ? "bg-primary"
                : i === currentSection
                ? "bg-primary/40"
                : "bg-border"
            }`}
            title={title}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  data,
  adminUsers,
  onConfirm,
  onBack,
  isSubmitting,
}: {
  data: IntakeData;
  adminUsers: AdminUser[];
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const Section = ({
    title,
    rows,
  }: {
    title: string;
    rows: [string, string | undefined][];
  }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
        {title}
      </h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {rows
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between items-start px-4 py-3 border-b border-border last:border-0 gap-4"
            >
              <span className="text-sm text-muted-foreground shrink-0 w-40">{label}</span>
              <span className="text-sm font-medium text-foreground text-right">{value}</span>
            </div>
          ))}
      </div>
    </div>
  );

  const billingAddress =
    data.billingSameAsBusiness?.toLowerCase() === "yes"
      ? "Same as business address"
      : [data.billingStreet, data.billingCity, data.billingState, data.billingZip]
          .filter(Boolean)
          .join(", ");

  return (
    <div className="fade-up max-w-2xl mx-auto w-full px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent mb-4">
          <CheckCircle2 className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
          Review Your Information
        </h2>
        <p className="text-muted-foreground text-sm">
          Please confirm everything looks correct before submitting.
        </p>
      </div>

      <Section
        title="Client Information"
        rows={[
          ["Company Name", data.companyName],
          ["EIN", data.ein],
          ["Business Entity", data.businessEntity],
          ["Owner Name", [data.ownerFirstName, data.ownerLastName].filter(Boolean).join(" ")],
          ["Owner Email", data.ownerEmail],
          ["Owner Phone", data.ownerPhone],
          ["Owner Title", data.ownerTitle],
        ]}
      />

      {(data.contactFirstName || data.contactEmail) && (
        <Section
          title="Contact Information"
          rows={[
            ["Name", [data.contactFirstName, data.contactLastName].filter(Boolean).join(" ")],
            ["Email", data.contactEmail],
            ["Phone", data.contactPhone],
            ["Title", data.contactTitle],
          ]}
        />
      )}

      <Section
        title="Business Address"
        rows={[
          ["Street", data.businessStreet],
          ["City", data.businessCity],
          ["State", data.businessState],
          ["ZIP", data.businessZip],
        ]}
      />

      <Section
        title="Billing Address"
        rows={[["Address", billingAddress]]}
      />

      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
          Admin Users
        </h3>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {adminUsers.map((admin, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-accent text-primary text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">
                  {admin.firstName} {admin.lastName}
                </span>
              </div>
              <div className="ml-7 text-sm text-muted-foreground">
                {admin.email}
                {admin.phone && ` · ${admin.phone}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Go Back
        </Button>
        <Button
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Submitting…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Confirm & Submit
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  return (
    <div className="fade-up flex flex-col items-center justify-center min-h-[60vh] px-4 text-center max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-6 shadow-sm">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>
      <h2 className="font-serif text-3xl font-semibold text-foreground mb-4 leading-tight">
        You're all set!
      </h2>
      <p className="text-base text-muted-foreground leading-relaxed mb-6">
        Thank you for providing your information! You will be receiving an
        agreement to review and sign. In the meantime, we will get started on
        setting up your account.
      </p>
      <div className="w-full rounded-xl border border-border bg-card p-5 text-left space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          What happens next
        </p>
        {[
          "Our team will review your submission within 1 business day.",
          "You'll receive a service agreement via email to review and sign.",
          "Once signed, your SaffHire portal will be activated.",
          "Your admin users will receive login credentials.",
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-accent text-primary text-xs font-semibold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <p className="text-sm text-foreground">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AccountSetup() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [intakeData, setIntakeData] = useState<IntakeData>({});
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [stage, setStage] = useState<FormStage>("chat");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Stable session ID — generated once per page load, used to deduplicate partial saves
  const sessionId = useMemo(() => uid() + uid(), []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Debounce timer for saveProgress to avoid hammering the server
  const saveProgressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getNextMessage = trpc.signup.getNextMessage.useMutation();
  const submitIntake = trpc.signup.submitIntake.useMutation();
  const saveProgress = trpc.signup.saveProgress.useMutation();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Start the conversation
  const startConversation = useCallback(async () => {
    setHasStarted(true);
    setIsTyping(true);
    try {
      const result = await getNextMessage.mutateAsync({
        messages: [],
        collectedData: {},
        currentSection: 0,
      });
      setMessages([{ id: uid(), role: "assistant", content: result.message }]);
    } catch {
      setMessages([
        {
          id: uid(),
          role: "assistant",
          content:
            "Hello! Welcome to SaffHire Background Screening. I'm here to help you set up your account. Let's start with your company information — what is your company name?",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  useEffect(() => {
    if (!hasStarted) {
      startConversation();
    }
  }, [hasStarted, startConversation]);

  // Parse collected data from AI response using simple heuristics + explicit extraction
  const extractDataFromConversation = useCallback(
    async (userMsg: string, assistantMsg: string) => {
      // We'll do a best-effort extraction by sending the full conversation context
      // The AI will help us extract structured fields
      const allMessages = [
        ...messages,
        { role: "user" as const, content: userMsg },
        { role: "assistant" as const, content: assistantMsg },
      ];

      // Detect section transitions from assistant message
      const lowerAssistant = assistantMsg.toLowerCase();
      let newSection = currentSection;

      if (
        currentSection === 0 &&
        (lowerAssistant.includes("contact information") ||
          lowerAssistant.includes("main point of contact") ||
          lowerAssistant.includes("section 2"))
      ) {
        newSection = 1;
      } else if (
        currentSection === 1 &&
        (lowerAssistant.includes("business address") ||
          lowerAssistant.includes("where is your business") ||
          lowerAssistant.includes("section 3"))
      ) {
        newSection = 2;
      } else if (
        currentSection === 2 &&
        (lowerAssistant.includes("billing address") ||
          lowerAssistant.includes("where should invoices") ||
          lowerAssistant.includes("section 4"))
      ) {
        newSection = 3;
      } else if (
        currentSection === 3 &&
        (lowerAssistant.includes("admin user") ||
          lowerAssistant.includes("portal access") ||
          lowerAssistant.includes("section 5"))
      ) {
        newSection = 4;
      }

      if (newSection !== currentSection) {
        setCurrentSection(newSection);
      }

      // Build a context string from recent messages
      const contextStr = allMessages
        .slice(-10)
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      // Extract key fields based on current section
      const fieldsToExtract: [string, string][] = [];

      if (currentSection === 0) {
        fieldsToExtract.push(
          ["companyName", "Company Name"],
          ["ein", "EIN"],
          ["businessEntity", "Business Entity Type"],
          ["ownerFirstName", "Owner First Name"],
          ["ownerLastName", "Owner Last Name"],
          ["ownerEmail", "Owner Email"],
          ["ownerPhone", "Owner Phone"],
          ["ownerTitle", "Owner Title"]
        );
      } else if (currentSection === 1) {
        fieldsToExtract.push(
          ["contactFirstName", "Contact First Name"],
          ["contactLastName", "Contact Last Name"],
          ["contactEmail", "Contact Email"],
          ["contactPhone", "Contact Phone"],
          ["contactTitle", "Contact Title"]
        );
      } else if (currentSection === 2) {
        fieldsToExtract.push(
          ["businessStreet", "Business Street Address"],
          ["businessCity", "Business City"],
          ["businessState", "Business State"],
          ["businessZip", "Business ZIP Code"]
        );
      } else if (currentSection === 3) {
        fieldsToExtract.push(
          ["billingSameAsBusiness", "Is billing address same as business address? (Yes/No)"],
          ["billingStreet", "Billing Street Address"],
          ["billingCity", "Billing City"],
          ["billingState", "Billing State"],
          ["billingZip", "Billing ZIP Code"]
        );
      } else if (currentSection === 4) {
        // Admin users — extract from last user message
        fieldsToExtract.push(
          ["admin1FirstName", "Admin User 1 First Name"],
          ["admin1LastName", "Admin User 1 Last Name"],
          ["admin1Email", "Admin User 1 Email"],
          ["admin1Phone", "Admin User 1 Phone"],
          ["admin2FirstName", "Admin User 2 First Name"],
          ["admin2LastName", "Admin User 2 Last Name"],
          ["admin2Email", "Admin User 2 Email"],
          ["admin2Phone", "Admin User 2 Phone"],
          ["admin3FirstName", "Admin User 3 First Name"],
          ["admin3LastName", "Admin User 3 Last Name"],
          ["admin3Email", "Admin User 3 Email"],
          ["admin3Phone", "Admin User 3 Phone"]
        );
      }

      // Extract all fields in parallel (fire and forget — update state as they come in)
      const updates: Record<string, string> = {};
      await Promise.all(
        fieldsToExtract.map(async ([key, label]) => {
          if (intakeData[key as keyof IntakeData]) return; // already have it
          try {
            const res = await getNextMessage.mutateAsync({
              messages: [
                {
                  role: "user",
                  content: `Extract the value for "${label}" from this conversation. Return ONLY the value, nothing else. If not mentioned, return empty string.\n\nConversation:\n${contextStr}`,
                },
              ],
              collectedData: {},
              currentSection: 99, // signal extraction mode
            });
            const val = res.message.trim();
            if (val && val.length < 200 && !val.toLowerCase().includes("not mentioned")) {
              updates[key] = val;
            }
          } catch {
            // ignore extraction errors
          }
        })
      );

      // Merge updates into intake data
      const mergedData = Object.keys(updates).length > 0
        ? { ...intakeData, ...updates }
        : intakeData;

      if (Object.keys(updates).length > 0) {
        setIntakeData(mergedData);

        // Build admin users from extracted fields
        const adminUpdates: AdminUser[] = [];
        for (let i = 1; i <= 3; i++) {
          const fn = updates[`admin${i}FirstName`] || intakeData[`admin${i}FirstName` as keyof IntakeData];
          const ln = updates[`admin${i}LastName`] || intakeData[`admin${i}LastName` as keyof IntakeData];
          const em = updates[`admin${i}Email`] || intakeData[`admin${i}Email` as keyof IntakeData];
          const ph = updates[`admin${i}Phone`] || intakeData[`admin${i}Phone` as keyof IntakeData];
          if (fn && ln && em) {
            adminUpdates.push({ firstName: fn, lastName: ln, email: em, phone: ph });
          }
        }
        if (adminUpdates.length > 0) {
          setAdminUsers(adminUpdates);
        }
      }

      // ── Real-time partial save ─────────────────────────────────────────────
      // Debounce: wait 1.5 s after the last extraction before posting to server
      if (saveProgressTimer.current) clearTimeout(saveProgressTimer.current);
      saveProgressTimer.current = setTimeout(() => {
        // Only save if we have at least a company name or owner email to identify the lead
        const d = mergedData as Record<string, string | undefined>;
        const hasIdentifier = !!(d.companyName || d.ownerEmail || d.ownerFirstName);
        if (!hasIdentifier) return;

        // Strip out admin sub-fields (admin1FirstName etc.) — those aren't in the server schema
        const partialPayload: Record<string, string> = {};
        const serverFields = [
          "companyName", "ein", "businessEntity",
          "ownerFirstName", "ownerLastName", "ownerEmail", "ownerPhone", "ownerTitle",
          "contactFirstName", "contactLastName", "contactEmail", "contactPhone", "contactTitle",
          "businessStreet", "businessCity", "businessState", "businessZip",
          "billingSameAsBusiness", "billingStreet", "billingCity", "billingState", "billingZip",
        ];
        for (const f of serverFields) {
          if (d[f]) partialPayload[f] = d[f] as string;
        }

        saveProgress.mutate(
          { sessionId, data: partialPayload, currentSection },
          {
            onError: (err) => console.warn("[SaveProgress] failed:", err),
          }
        );
      }, 1500);
    },
    [messages, currentSection, intakeData, getNextMessage, saveProgress, sessionId]
  );

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: uid(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const allMessages = [...messages, { role: "user" as const, content: text }];
      const result = await getNextMessage.mutateAsync({
        messages: allMessages,
        collectedData: intakeData as Record<string, string>,
        currentSection,
      });

      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: result.message,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Extract data in background
      extractDataFromConversation(text, result.message);

      if (result.isComplete) {
        // Give a moment before transitioning to review
        setTimeout(() => setStage("review"), 1500);
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Ensure we have at least one admin user
      const admins =
        adminUsers.length > 0
          ? adminUsers
          : [
              {
                firstName: intakeData.ownerFirstName || "Admin",
                lastName: intakeData.ownerLastName || "User",
                email: intakeData.ownerEmail || "",
                phone: intakeData.ownerPhone,
              },
            ];

      await submitIntake.mutateAsync({
        companyName: intakeData.companyName || "",
        ein: intakeData.ein || "",
        businessEntity: intakeData.businessEntity || "",
        ownerFirstName: intakeData.ownerFirstName || "",
        ownerLastName: intakeData.ownerLastName || "",
        ownerEmail: intakeData.ownerEmail || "",
        ownerPhone: intakeData.ownerPhone || "",
        ownerTitle: intakeData.ownerTitle,
        contactFirstName: intakeData.contactFirstName,
        contactLastName: intakeData.contactLastName,
        contactEmail: intakeData.contactEmail,
        contactPhone: intakeData.contactPhone,
        contactTitle: intakeData.contactTitle,
        businessStreet: intakeData.businessStreet || "",
        businessCity: intakeData.businessCity || "",
        businessState: intakeData.businessState || "",
        businessZip: intakeData.businessZip || "",
        billingSameAsBusiness: intakeData.billingSameAsBusiness || "Yes",
        billingStreet: intakeData.billingStreet,
        billingCity: intakeData.billingCity,
        billingState: intakeData.billingState,
        billingZip: intakeData.billingZip,
        adminUsers: admins,
        conversationLog: messages,
      });

      setStage("success");
    } catch (err) {
      toast.error("Submission failed. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/manus-storage/SaffhireLogoShirtStyle_6539361a.webp"
              alt="SaffHire Background Screening"
              className="h-10 w-auto object-contain"
            />
          </div>
          {stage === "chat" && hasStarted && (
            <div className="w-48 sm:w-64">
              <ProgressBar currentSection={currentSection} />
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {stage === "success" ? (
          <div className="flex-1 overflow-y-auto">
            <SuccessScreen />
          </div>
        ) : stage === "review" ? (
          <div className="flex-1 overflow-y-auto">
            <ReviewScreen
              data={intakeData}
              adminUsers={adminUsers}
              onConfirm={handleSubmit}
              onBack={() => setStage("chat")}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : (
          <>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`bubble-in flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                        <span className="text-primary-foreground text-xs font-bold">S</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="bubble-in flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center mr-2 mt-1 shrink-0">
                      <span className="text-primary-foreground text-xs font-bold">S</span>
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm shadow-sm">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-sm">
              <div className="max-w-2xl mx-auto px-4 py-4">
                <div className="flex gap-2 items-end">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response…"
                    disabled={isTyping}
                    className="flex-1 rounded-xl border-border bg-background focus-visible:ring-primary text-sm py-3 px-4 h-auto"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isTyping}
                    size="icon"
                    className="w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground text-xs font-mono">Enter</kbd> to send
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
