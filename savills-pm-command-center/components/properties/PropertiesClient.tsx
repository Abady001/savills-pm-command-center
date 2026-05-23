"use client";

import { FormEvent, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type PropertyType = Doc<"properties">["type"];
type PropertyStatus = Doc<"properties">["status"];

type PropertyDraft = {
  name: string;
  code: string;
  type: PropertyType;
  status: PropertyStatus;
  addressLine1: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  description: string;
};

const PROPERTY_TYPES: PropertyType[] = [
  "residential",
  "commercial",
  "retail",
  "mixed_use",
  "administrative",
  "industrial",
  "other",
];

const PROPERTY_STATUSES: Exclude<PropertyStatus, "archived">[] = [
  "active",
  "mobilization",
  "inactive",
];

const INITIAL_FORM: PropertyDraft = {
  name: "",
  code: "",
  type: "mixed_use",
  status: "active",
  addressLine1: "",
  city: "",
  country: "",
  timezone: "Africa/Cairo",
  currency: "EGP",
  description: "",
};

function mapPropertyToDraft(property: Doc<"properties">): PropertyDraft {
  return {
    name: property.name,
    code: property.code,
    type: property.type,
    status: property.status,
    addressLine1: property.addressLine1 ?? "",
    city: property.city,
    country: property.country,
    timezone: property.timezone,
    currency: property.currency,
    description: property.description ?? "",
  };
}

export default function PropertiesClient() {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { has } = useAuth();

  const canCreate = has?.({ permission: "org:properties:create" }) ?? false;
  const canUpdate = has?.({ permission: "org:properties:update" }) ?? false;
  const canArchive = has?.({ permission: "org:properties:archive" }) ?? false;
  const [createForm, setCreateForm] = useState<PropertyDraft>(INITIAL_FORM);
  const [drafts, setDrafts] = useState<Record<string, PropertyDraft>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isArchiving, setIsArchiving] = useState<Record<string, boolean>>({});

  const properties = useQuery(
    api.properties.list,
    isAuthenticated ? { includeArchived: showArchived } : "skip",
  );
  const createProperty = useMutation(api.properties.create);
  const updateProperty = useMutation(api.properties.update);
  const archiveProperty = useMutation(api.properties.archive);

  const orderedProperties = useMemo(
    () => (properties ? [...properties] : undefined),
    [properties],
  );

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setError("Convex session is not authenticated yet. Please refresh or sign in again.");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      await createProperty({
        name: createForm.name,
        code: createForm.code,
        type: createForm.type,
        status: createForm.status,
        addressLine1: createForm.addressLine1 || undefined,
        city: createForm.city,
        country: createForm.country,
        timezone: createForm.timezone,
        currency: createForm.currency,
        description: createForm.description || undefined,
      });
      setCreateForm(INITIAL_FORM);
      setMessage("Property created.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to create property";
      setError(text);
    } finally {
      setIsCreating(false);
    }
  };

  const getDraft = (property: Doc<"properties">): PropertyDraft =>
    drafts[property._id] ?? mapPropertyToDraft(property);

  const setDraftField = (
    propertyId: Id<"properties">,
    field: keyof PropertyDraft,
    value: string,
  ) => {
    setDrafts((current) => {
      const key = String(propertyId);
      const existing = current[key];
      const next = {
        ...(existing ?? INITIAL_FORM),
        [field]: value,
      } as PropertyDraft;

      return {
        ...current,
        [key]: next,
      };
    });
  };

  const onUpdate = async (property: Doc<"properties">) => {
    if (!isAuthenticated) {
      setError("Convex session is not authenticated yet. Please refresh or sign in again.");
      return;
    }

    const draft = getDraft(property);
    const id = String(property._id);

    setIsUpdating((current) => ({ ...current, [id]: true }));
    setError(null);
    setMessage(null);

    try {
      await updateProperty({
        propertyId: property._id,
        name: draft.name,
        code: draft.code,
        type: draft.type,
        status: draft.status,
        addressLine1: draft.addressLine1,
        city: draft.city,
        country: draft.country,
        timezone: draft.timezone,
        currency: draft.currency,
        description: draft.description,
      });
      setMessage("Property updated.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to update property";
      setError(text);
    } finally {
      setIsUpdating((current) => ({ ...current, [id]: false }));
    }
  };

  const onArchive = async (propertyId: Id<"properties">) => {
    if (!isAuthenticated) {
      setError("Convex session is not authenticated yet. Please refresh or sign in again.");
      return;
    }

    const id = String(propertyId);

    if (!window.confirm("Archive this property?")) {
      return;
    }

    setIsArchiving((current) => ({ ...current, [id]: true }));
    setError(null);
    setMessage(null);

    try {
      await archiveProperty({ propertyId });
      setMessage("Property archived.");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Failed to archive property";
      setError(text);
    } finally {
      setIsArchiving((current) => ({ ...current, [id]: false }));
    }
  };

  if (isConvexAuthLoading) {
    return <div>Loading secure workspace...</div>;
  }

  if (!isAuthenticated) {
    return <div>Convex session is not authenticated yet. Please refresh or sign in again.</div>;
  }

  return (
    <div className="space-y-8">
      {canCreate && (
      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Create Property</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Code</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
              value={createForm.code}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, code: event.target.value }))
              }
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Type</span>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.type}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  type: event.target.value as PropertyType,
                }))
              }
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Status</span>
            <select
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.status}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  status: event.target.value as PropertyStatus,
                }))
              }
            >
              {PROPERTY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Address Line 1</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.addressLine1}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  addressLine1: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">City</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.city}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, city: event.target.value }))
              }
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Country</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.country}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, country: event.target.value }))
              }
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Timezone</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              value={createForm.timezone}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              required
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium">Currency</span>
            <input
              className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
              value={createForm.currency}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  currency: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Property"}
            </button>
          </div>
        </form>
      </section>
      )}

      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Property List</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
            />
            Show archived
          </label>
        </div>

        {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        {orderedProperties === undefined ? (
          <p className="text-sm text-slate-500">Loading properties...</p>
        ) : orderedProperties.length === 0 ? (
          <p className="text-sm text-slate-500">No properties found for this organization.</p>
        ) : (
          <div className="space-y-4">
            {orderedProperties.map((property) => {
              const draft = getDraft(property);
              const propertyKey = String(property._id);

              return (
                <article
                  key={property._id}
                  className="rounded-md border p-4 dark:border-slate-700"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{property.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                      {property.status}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Name</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.name}
                        onChange={(event) =>
                          setDraftField(property._id, "name", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Code</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                        value={draft.code}
                        onChange={(event) =>
                          setDraftField(property._id, "code", event.target.value)
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Type</span>
                      <select
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.type}
                        onChange={(event) =>
                          setDraftField(property._id, "type", event.target.value)
                        }
                      >
                        {PROPERTY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Status</span>
                      <select
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.status}
                        onChange={(event) =>
                          setDraftField(property._id, "status", event.target.value)
                        }
                      >
                        {PROPERTY_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                        <option value="archived">archived</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">City</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.city}
                        onChange={(event) =>
                          setDraftField(property._id, "city", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Country</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.country}
                        onChange={(event) =>
                          setDraftField(property._id, "country", event.target.value)
                        }
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Timezone</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.timezone}
                        onChange={(event) =>
                          setDraftField(property._id, "timezone", event.target.value)
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Currency</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                        value={draft.currency}
                        onChange={(event) =>
                          setDraftField(property._id, "currency", event.target.value)
                        }
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block font-medium">Address Line 1</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.addressLine1}
                        onChange={(event) =>
                          setDraftField(property._id, "addressLine1", event.target.value)
                        }
                      />
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block font-medium">Description</span>
                      <textarea
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        rows={2}
                        value={draft.description}
                        onChange={(event) =>
                          setDraftField(property._id, "description", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                        onClick={() => onUpdate(property)}
                        disabled={isUpdating[propertyKey]}
                      >
                        {isUpdating[propertyKey] ? "Saving..." : "Save changes"}
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => onArchive(property._id)}
                        disabled={isArchiving[propertyKey] || property.status === "archived"}
                      >
                        {isArchiving[propertyKey] ? "Archiving..." : "Archive"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
