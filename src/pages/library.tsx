import { LibraryTable } from "@/components/library-table";

export function LibraryPage() {
  return (
    <div className="py-6">
      <header className="px-8 pb-4">
        <h1 className="text-lg">Library</h1>
      </header>
      <LibraryTable />
    </div>
  );
}
