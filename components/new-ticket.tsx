"use client";
import { useState } from "react";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** Lets a prospect try their own ticket against their own knowledge base, live. */
export function NewTicket() {
  const { addTicket, ws } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [value, setValue] = useState(0);
  if (!open) return <Button variant="outline" onClick={() => setOpen(true)}>+ Try your own ticket</Button>;
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <div className="grid gap-2 md:grid-cols-3">
          <Input placeholder="Customer name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input type="number" placeholder={`${ws.labels.value} (${ws.currency})`} value={value || ""} onChange={(e) => setValue(Number(e.target.value) || 0)} />
        </div>
        <Textarea rows={3} placeholder="Customer message" value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex gap-2">
          <Button disabled={!message.trim()} onClick={() => {
            addTicket({ customer: name || "Customer", company: "", plan: "New", mrr: value, subject: subject || message.slice(0, 50), message });
            setName(""); setSubject(""); setMessage(""); setValue(0); setOpen(false);
          }}>Triage it</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
