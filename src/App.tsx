import { useEffect, useState } from "react";
import { ipc } from "@/lib/ipc";
import type { SkillView } from "@/types/bindings";

export default function App() {
  const [skills, setSkills] = useState<SkillView[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    ipc.listSkills()
      .then(setSkills)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <div className="p-8 space-y-3">
      <h1 className="text-lg">Skill Sync</h1>
      {error && <p className="text-danger text-sm">{error}</p>}
      <ul className="space-y-1 text-sm">
        {skills.map((s) => (
          <li key={s.name} className="font-mono">
            {s.name} — <span className="text-muted-foreground">{String(s.class)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
