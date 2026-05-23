"use client";

import { FormEvent, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type TenantType = Doc<"tenants">["tenantType"];
type TenantStatus = Doc<"tenants">["status"];
type TenantCategory = NonNullable<Doc<"tenants">["tenantCategory"]>;

type TenantDraft = {
  tenantType: TenantType;
  status: Exclude<TenantStatus, "archived">;
  displayName: string;
  legalName: string;
  tradeName: string;
  primaryContactName: string;
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  taxId: string;
  commercialRegisterNumber: string;
  nationalIdOrPassport: string;
  industry: string;
  tenantCategory: TenantCategory | "";
  preferredLanguage: string;
  billingAddress: string;
  notes: string;
};

const TENANT_TYPES: TenantType[] = ["individual", "company"];
const TENANT_STATUSES: Exclude<TenantStatus, "archived">[] = [
  "prospect",
  "active",
  "inactive",
  "blacklisted",
];
const TENANT_CATEGORIES: TenantCategory[] = [
  "residential",
  "commercial",
  "retail",
  "office",
  "anchor",
  "temporary",
  "staff_housing",
  "other",
];

const INITIAL_FORM: TenantDraft = {
  tenantType: "individual",
  status: "prospect",
  displayName: "",
  legalName: "",
  tradeName: "",
  primaryContactName: "",
  primaryEmail: "",
  primaryPhone: "",
  secondaryPhone: "",
  taxId: "",
  commercialRegisterNumber: "",
  nationalIdOrPassport: "",
  industry: "",
  tenantCategory: "",
  preferredLanguage: "",
  billingAddress: "",
  notes: "",
};

function mapTenantToDraft(t: Doc<"tenants">): TenantDraft {
  return {
    tenantType: t.tenantType,
    status: t.status === "archived" ? "inactive" : t.status,
    displayName: t.displayName,
    legalName: t.legalName ?? "",
    tradeName: t.tradeName ?? "",
    primaryContactName: t.primaryContactName ?? "",
    primaryEmail: t.primaryEmail ?? "",
    primaryPhone: t.primaryPhone ?? "",
    secondaryPhone: t.secondaryPhone ?? "",
    taxId: t.taxId ?? "",
    commercialRegisterNumber: t.commercialRegisterNumber ?? "",
    nationalIdOrPassport: t.nationalIdOrPassport ?? "",
    industry: t.industry ?? "",
    tenantCategory: t.tenantCategory ?? "",
    preferredLanguage: t.preferredLanguage ?? "",
    billingAddress: t.billingAddress ?? "",
    notes: t.notes ?? "",
  };
}

export default function TenantsClient() {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { has } = useAuth();

  const canCreate = has?.({ permission: "org:tenants:create" }) ?? false;
  const canUpdate = has?.({ permission: "org:tenants:update" }) ?? false;
  const canArchive = has?.({ permission: "org:tenants:archive" }) ?? false;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TenantType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  const [createForm, setCreateForm] = useState<TenantDraft>(INITIAL_FORM);
  const [drafts, setDrafts] = useState<Record<string, TenantDraft>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isArchiving, setIsArchiving] = useState<Record<string, boolean>>({});

  const tenants = useQuery(
    api.tenants.list,
    isAuthenticated
      ? {
          status: statusFilter === "all" ? undefined : statusFilter,
          tenantType: typeFilter === "all" ? undefined : typeFilter,
          search: search.trim() || undefined,
          includeArchived: showArchived,
        }
      : "skip",
  );

  const createTenant = useMutation(api.tenants.create);
  const updateTenant = useMutation(api.tenants.update);
  const archiveTenant = useMutation(api.tenants.archive);

  const kpis = useMemo(() => {
    if (!tenants) return null;
    return {
      total: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      company: tenants.filter((t) => t.tenantType === "company").length,
      individual: tenants.filter((t) => t.tenantType === "individual").length,
    };
  }, [tenants]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!createForm.primaryEmail.trim() && !createForm.primaryPhone.trim()) {
      setError("Provide at least one contact channel (email or phone).");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      await createTenant({
        tenantType: createForm.tenantType,
        status: createForm.status,
        displayName: createForm.displayName,
        legalName: createForm.legalName || undefined,
        tradeName: createForm.tradeName || undefined,
        primaryContactName: createForm.primaryContactName || undefined,
        primaryEmail: createForm.primaryEmail || undefined,
        primaryPhone: createForm.primaryPhone || undefined,
        secondaryPhone: createForm.secondaryPhone || undefined,
        taxId: createForm.taxId || undefined,
        commercialRegisterNumber: createForm.commercialRegisterNumber || undefined,
        nationalIdOrPassport: createForm.nationalIdOrPassport || undefined,
        industry: createForm.industry || undefined,
        tenantCategory: createForm.tenantCategory || undefined,
        preferredLanguage: createForm.preferredLanguage || undefined,
        billingAddress: createForm.billingAddress || undefined,
        notes: createForm.notes || undefined,
      });
      setCreateForm(INITIAL_FORM);
      setMessage("Tenant created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setIsCreating(false);
    }
  };

  const getDraft = (t: Doc<"tenants">): TenantDraft =>
    drafts[t._id] ?? mapTenantToDraft(t);

  const setDraftField = <K extends keyof TenantDraft>(
    tenantId: Id<"tenants">,
    field: K,
    value: TenantDraft[K],
  ) => {
    setDrafts((current) => ({
      ...current,
      [String(tenantId)]: {
        ...(current[String(tenantId)] ?? INITIAL_FORM),
        [field]: value,
      } as TenantDraft,
    }));
  };

  const onUpdate = async (t: Doc<"tenants">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    const draft = getDraft(t);
    const key = String(t._id);

    setIsUpdating((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await updateTenant({
        tenantId: t._id,
        tenantType: draft.tenantType,
        status: draft.status,
        displayName: draft.displayName,
        legalName: draft.legalName,
        tradeName: draft.tradeName,
        primaryContactName: draft.primaryContactName,
        primaryEmail: draft.primaryEmail,
        primaryPhone: draft.primaryPhone,
        secondaryPhone: draft.secondaryPhone,
        taxId: draft.taxId,
        commercialRegisterNumber: draft.commercialRegisterNumber,
        nationalIdOrPassport: draft.nationalIdOrPassport,
        industry: draft.industry,
        tenantCategory: draft.tenantCategory || undefined,
        preferredLanguage: draft.preferredLanguage,
        billingAddress: draft.billingAddress,
        notes: draft.notes,
      });
      setMessage("Tenant updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tenant");
    } finally {
      setIsUpdating((c) => ({ ...c, [key]: false }));
    }
  };

  const onArchive = async (tenantId: Id<"tenants">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!window.confirm("Archive this tenant?")) return;
    const key = String(tenantId);

    setIsArchiving((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await archiveTenant({ tenantId });
      setMessage("Tenant archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive tenant");
    } finally {
      setIsArchiving((c) => ({ ...c, [key]: false }));
    }
  };

  if (isConvexAuthLoading) return <div>Loading secure workspace...</div>;
  if (!isAuthenticated)
    return <div>Not authenticated. Please refresh or sign in again.</div>;

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label="Total" value={kpis?.total} />
        <KPI label="Active" value={kpis?.active} />
        <KPI label="Company" value={kpis?.company} />
        <KPI label="Individual" value={kpis?.individual} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="tenant-search">
            Search
          </label>
          <input
            id="tenant-search"
            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-64"
            placeholder="Name, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="tenant-type-filter">
            Tenant type
          </label>
          <select
            id="tenant-type-filter"
            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-44"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as TenantType | "all")
            }
          >
            <option value="all">All</option>
            {TENANT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="tenant-status-filter">
            Status
          </label>
          <select
            id="tenant-status-filter"
            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-44"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TenantStatus | "all")
            }
          >
            <option value="all">All</option>
            {TENANT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="archived">archived</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {/* Create form — admins only */}
      {canCreate && (
        <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Add Tenant</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={onCreate}>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tenant Type</span>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.tenantType}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    tenantType: e.target.value as TenantType,
                  }))
                }
              >
                {TENANT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Status</span>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.status}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    status: e.target.value as Exclude<TenantStatus, "archived">,
                  }))
                }
              >
                {TENANT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tenant Category</span>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.tenantCategory}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    tenantCategory: e.target.value as TenantCategory | "",
                  }))
                }
              >
                <option value="">—</option>
                {TENANT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Display Name *</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.displayName}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, displayName: e.target.value }))
                }
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Legal Name</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.legalName}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, legalName: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Trade Name</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.tradeName}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, tradeName: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Primary Contact</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.primaryContactName}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    primaryContactName: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Primary Email</span>
              <input
                type="email"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.primaryEmail}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, primaryEmail: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Primary Phone</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.primaryPhone}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, primaryPhone: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Secondary Phone</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.secondaryPhone}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    secondaryPhone: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Tax ID</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.taxId}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, taxId: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Commercial Reg #</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.commercialRegisterNumber}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    commercialRegisterNumber: e.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">National ID / Passport</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.nationalIdOrPassport}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    nationalIdOrPassport: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Industry</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.industry}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, industry: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Preferred Language</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                placeholder="e.g. en, ar"
                value={createForm.preferredLanguage}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    preferredLanguage: e.target.value,
                  }))
                }
              />
            </label>

            <label className="text-sm md:col-span-3">
              <span className="mb-1 block font-medium">Billing Address</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.billingAddress}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    billingAddress: e.target.value,
                  }))
                }
              />
            </label>
            <label className="text-sm md:col-span-3">
              <span className="mb-1 block font-medium">Notes</span>
              <textarea
                rows={2}
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, notes: e.target.value }))
                }
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Add Tenant"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tenant list */}
      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Tenants</h2>

        {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        {tenants === undefined ? (
          <p className="text-sm text-slate-500">Loading tenants...</p>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tenants match the current filters.
            {canCreate ? " Add the first tenant above." : ""}
          </p>
        ) : (
          <div className="space-y-3">
            {tenants.map((t) => {
              const key = String(t._id);
              const isOpen = expanded[key] ?? false;
              const draft = getDraft(t);

              return (
                <article
                  key={t._id}
                  className="rounded-md border p-4 dark:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">
                        {t.displayName}
                        <span className="ml-2 text-sm font-normal text-slate-500">
                          {t.tenantType}
                        </span>
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">
                        {t.primaryEmail || "—"}
                        {t.primaryPhone ? ` · ${t.primaryPhone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                        {t.status}
                      </span>
                      <button
                        type="button"
                        className="text-xs underline underline-offset-4"
                        onClick={() =>
                          setExpanded((c) => ({ ...c, [key]: !isOpen }))
                        }
                      >
                        {isOpen ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <DraftField
                        label="Tenant Type"
                        kind="select"
                        value={draft.tenantType}
                        options={TENANT_TYPES}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "tenantType", v as TenantType)
                        }
                      />
                      <DraftField
                        label="Status"
                        kind="select"
                        value={draft.status}
                        options={[...TENANT_STATUSES, "archived"]}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(
                            t._id,
                            "status",
                            v as Exclude<TenantStatus, "archived">,
                          )
                        }
                      />
                      <DraftField
                        label="Category"
                        kind="select"
                        value={draft.tenantCategory || ""}
                        options={["", ...TENANT_CATEGORIES]}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(
                            t._id,
                            "tenantCategory",
                            v as TenantCategory | "",
                          )
                        }
                      />

                      <DraftField
                        label="Display Name"
                        value={draft.displayName}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "displayName", v)
                        }
                      />
                      <DraftField
                        label="Legal Name"
                        value={draft.legalName}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "legalName", v)}
                      />
                      <DraftField
                        label="Trade Name"
                        value={draft.tradeName}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "tradeName", v)}
                      />

                      <DraftField
                        label="Primary Contact"
                        value={draft.primaryContactName}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "primaryContactName", v)
                        }
                      />
                      <DraftField
                        label="Primary Email"
                        value={draft.primaryEmail}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "primaryEmail", v)}
                      />
                      <DraftField
                        label="Primary Phone"
                        value={draft.primaryPhone}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "primaryPhone", v)}
                      />

                      <DraftField
                        label="Secondary Phone"
                        value={draft.secondaryPhone}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "secondaryPhone", v)
                        }
                      />
                      <DraftField
                        label="Tax ID"
                        value={draft.taxId}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "taxId", v)}
                      />
                      <DraftField
                        label="Commercial Reg #"
                        value={draft.commercialRegisterNumber}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "commercialRegisterNumber", v)
                        }
                      />

                      <DraftField
                        label="National ID / Passport"
                        value={draft.nationalIdOrPassport}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "nationalIdOrPassport", v)
                        }
                      />
                      <DraftField
                        label="Industry"
                        value={draft.industry}
                        disabled={!canUpdate}
                        onChange={(v) => setDraftField(t._id, "industry", v)}
                      />
                      <DraftField
                        label="Preferred Language"
                        value={draft.preferredLanguage}
                        disabled={!canUpdate}
                        onChange={(v) =>
                          setDraftField(t._id, "preferredLanguage", v)
                        }
                      />

                      <label className="text-sm md:col-span-3">
                        <span className="mb-1 block font-medium">
                          Billing Address
                        </span>
                        <input
                          className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                          value={draft.billingAddress}
                          onChange={(e) =>
                            setDraftField(t._id, "billingAddress", e.target.value)
                          }
                          disabled={!canUpdate}
                        />
                      </label>
                      <label className="text-sm md:col-span-3">
                        <span className="mb-1 block font-medium">Notes</span>
                        <textarea
                          rows={2}
                          className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                          value={draft.notes}
                          onChange={(e) =>
                            setDraftField(t._id, "notes", e.target.value)
                          }
                          disabled={!canUpdate}
                        />
                      </label>

                      <div className="md:col-span-3 mt-2 flex flex-wrap gap-2">
                        {canUpdate && (
                          <button
                            type="button"
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                            onClick={() => onUpdate(t)}
                            disabled={isUpdating[key]}
                          >
                            {isUpdating[key] ? "Saving..." : "Save changes"}
                          </button>
                        )}
                        {canArchive && (
                          <button
                            type="button"
                            className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                            onClick={() => onArchive(t._id)}
                            disabled={isArchiving[key] || t.status === "archived"}
                          >
                            {isArchiving[key] ? "Archiving..." : "Archive"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function KPI({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function DraftField({
  label,
  value,
  onChange,
  disabled,
  kind = "input",
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  kind?: "input" | "select";
  options?: readonly string[];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {kind === "select" ? (
        <select
          className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {(options ?? []).map((o) => (
            <option key={o} value={o}>
              {o || "—"}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </label>
  );
}
