import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export default async function SupabaseTodosPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  if (error) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
        <h1 className="text-2xl font-semibold text-[var(--text)]">Supabase demo</h1>
        <p className="mt-3 text-sm text-[var(--textSecondary)]">
          Could not load todos from Supabase.
        </p>
        <pre className="mt-4 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text)]">
          {JSON.stringify({ message: error.message }, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-12 sm:px-8 sm:py-16 lg:px-10">
      <h1 className="text-2xl font-semibold text-[var(--text)]">Supabase demo</h1>
      <p className="mt-2 text-sm text-[var(--textSecondary)]">
        Showing rows from <span className="font-mono">todos</span>.
      </p>
      <ul className="mt-6 space-y-2">
        {(todos ?? []).map((todo: any) => (
          <li
            key={todo.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm text-[var(--text)]"
          >
            {String(todo.name ?? todo.id)}
          </li>
        ))}
      </ul>
    </div>
  );
}

