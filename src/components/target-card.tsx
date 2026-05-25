import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ipc } from "@/lib/ipc";

export function TargetCard({
  name,
  path,
  kind,
}: {
  name: string;
  path?: string;
  kind: "directory-mirror" | "package-only";
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const test = async () => {
    if (!path) return;
    try {
      await ipc.testTargetWrite(path);
      setStatus("ok");
      setMsg(null);
    } catch (e) {
      setStatus("fail");
      setMsg(String(e));
    }
  };
  return (
    <div className="rounded border border-border p-4 bg-card">
      <div className="flex justify-between items-baseline">
        <h3 className="capitalize text-base">{name}</h3>
        <span className="text-xs text-muted-foreground">{kind}</span>
      </div>
      {path && <div className="mono text-xs text-muted-foreground mt-1 break-all">{path}</div>}
      {kind === "directory-mirror" && (
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={test} disabled={!path}>
            Test write
          </Button>
          {status === "ok" && <span className="text-xs text-success">writable</span>}
          {status === "fail" && <span className="text-xs text-danger">{msg}</span>}
        </div>
      )}
    </div>
  );
}
