import { Suspense } from "react";
import { TicketView } from "@/components/ticket-view";

async function Resolved({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketView id={id} />;
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <Resolved params={params} />
    </Suspense>
  );
}
