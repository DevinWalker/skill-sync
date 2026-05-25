import { Button } from "@/components/ui/button";

export default function App() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-lg">Skill Sync</h1>
      <p className="text-muted-foreground text-sm">Warm-minimal tokens loaded.</p>
      <div className="flex gap-3">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
      </div>
    </div>
  );
}
