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
];
