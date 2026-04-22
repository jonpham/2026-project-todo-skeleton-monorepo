import { useState } from "react";

interface TodoInputProps {
  onSubmit: (value: string) => void;
}

export function TodoInput({ onSubmit }: TodoInputProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a to-do…"
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={submit}
        className="rounded bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
      >
        Add
      </button>
    </div>
  );
}
