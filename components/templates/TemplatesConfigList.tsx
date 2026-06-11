"use client";

import { useState } from "react";
import { updateTemplateAction } from "@/lib/actions/templates";
import { formatJPY, formatIDR } from "@/lib/format";
import { IconLoader, IconCheck, IconAlertCircle } from "@tabler/icons-react";

interface TemplateItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  accountId: string;
  isActive: boolean;
}

interface AccountItem {
  id: string;
  name: string;
  currency: string;
}

interface TemplatesConfigListProps {
  templates: TemplateItem[];
  accounts: AccountItem[];
}

export default function TemplatesConfigList({
  templates,
  accounts,
}: TemplatesConfigListProps) {
  // State to track template edits
  const [items, setItems] = useState<TemplateItem[]>(templates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessId, setSaveSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEditing = (template: TemplateItem) => {
    setEditingId(template.id);
    setEditAmount(String(template.amount));
    setEditAccountId(template.accountId);
    setEditIsActive(template.isActive);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError(null);
  };

  const handleSave = async (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await updateTemplateAction(id, {
        amount: parsedAmount,
        accountId: editAccountId,
        isActive: editIsActive,
      });

      if (res.success) {
        // Update local state
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  amount: parsedAmount,
                  accountId: editAccountId,
                  isActive: editIsActive,
                }
              : item
          )
        );
        setEditingId(null);
        setSaveSuccessId(id);
        setTimeout(() => setSaveSuccessId(null), 2000);
      } else {
        setError(res.error || "Failed to save template");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 flex-1">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-wide text-primary">
          Monthly Templates
        </h1>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Configure default recurring bills that auto-deduct at the start of each month (1st).
        </p>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
          <IconAlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Templates List */}
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isEditing = editingId === item.id;
          const linkedAccount = accounts.find((a) => a.id === item.accountId);
          const showSuccess = saveSuccessId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 transition-all ${
                isEditing
                  ? "border-primary/45 ring-1 ring-primary/10 shadow-xs"
                  : "border-border/40 shadow-2xs"
              }`}
            >
              {isEditing ? (
                /* Editing Mode Form */
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-foreground leading-tight">
                      Editing {item.name}
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground select-none cursor-pointer">
                      <span>Active</span>
                      <input
                        type="checkbox"
                        checked={editIsActive}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        className="size-4 accent-primary rounded-lg border-border focus:ring-transparent cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Amount Input */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Default Amount ({item.currency})
                    </label>
                    <div className="relative flex items-center bg-background border border-border/80 rounded-xl px-3 h-10">
                      <span className="text-xs font-bold text-muted-foreground mr-1.5 select-none">
                        {item.currency === "JPY" ? "¥" : "Rp"}
                      </span>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="flex-1 h-full text-xs font-bold font-sans tracking-wide bg-transparent focus:outline-none text-foreground"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Account Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-muted-foreground">
                      Deduct From Account
                    </label>
                    <select
                      value={editAccountId}
                      onChange={(e) => setEditAccountId(e.target.value)}
                      className="w-full h-10 px-3 border border-border/85 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end mt-1.5">
                    <button
                      onClick={cancelEditing}
                      className="h-8 px-3 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium cursor-pointer"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(item.id)}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <IconLoader className="size-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex justify-between items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground leading-tight">
                        {item.name}
                      </span>
                      {!item.isActive && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold uppercase tracking-wide">
                          Inactive
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      Linked to: {linkedAccount?.name || "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right flex flex-col items-end">
                      <span className="text-xs font-sans font-bold text-foreground">
                        {item.currency === "JPY" ? formatJPY(item.amount) : formatIDR(item.amount)}
                      </span>
                    </div>

                    {showSuccess ? (
                      <div className="p-1 rounded-full bg-brand-green/10 text-brand-green">
                        <IconCheck className="size-4" />
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(item)}
                        className="h-8 px-3 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
