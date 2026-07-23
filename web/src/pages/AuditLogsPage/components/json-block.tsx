import { ScrollArea } from "@/components/ui/scroll-area";

export function JsonBlock({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-muted-foreground">—</span>;
  return (
    <ScrollArea className="max-h-64 rounded-md bg-muted/50 p-2">
      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
    </ScrollArea>
  );
}
