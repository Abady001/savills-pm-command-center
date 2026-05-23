"use client";

import { FormEvent, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type BuildingType = Doc<"buildings">["type"];
type BuildingStatus = Doc<"buildings">["status"];

type BuildingDraft = {
  name: string;
  code: string;
  type: BuildingType;
  status: Exclude<BuildingStatus, "archived">;
  address: string;
  notes: string;
};

const BUILDING_TYPES: BuildingType[] = [
  "residential",
  "commercial",
  "retail",
  "mixed_use",
  "parking",
  "facility",
  "other",
];

const BUILDING_STATUSES: Exclude<BuildingStatus, "archived">[] = [
  "active",
  "inactive",
];

const INITIAL_FORM: BuildingDraft = {
  name: "",
  code: "",
  type: "mixed_use",
  status: "active",
  address: "",
  notes: "",
};

function mapBuildingToDraft(building: Doc<"buildings">): BuildingDraft {
  return {
    name: building.name,
    code: building.code,
    type: building.type,
    status: building.status === "archived" ? "active" : building.status,
    address: building.address ?? "",
    notes: building.notes ?? "",
  };
}

export default function BuildingsClient() {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { has } = useAuth();

  const canCreate = has?.({ permission: "org:properties:create" }) ?? false;
  const canUpdate = has?.({ permission: "org:properties:update" }) ?? false;
  const canArchive = has?.({ permission: "org:properties:archive" }) ?? false;

  const [selectedPropertyId, setSelectedPropertyId] = useState<
    Id<"properties"> | undefined
  >(undefined);
  const [createForm, setCreateForm] = useState<BuildingDraft>(INITIAL_FORM);
  const [drafts, setDrafts] = useState<Record<string, BuildingDraft>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [isArchiving, setIsArchiving] = useState<Record<string, boolean>>({});

  const properties = useQuery(
    api.properties.list,
    isAuthenticated ? { includeArchived: false } : "skip",
  );

  const buildings = useQuery(
    api.buildings.list,
    isAuthenticated
      ? { propertyId: selectedPropertyId, includeArchived: showArchived }
      : "skip",
  );

  // Auto-select the first property when properties load
  const effectivePropertyId = useMemo(() => {
    if (selectedPropertyId !== undefined) return selectedPropertyId;
    return properties?.[0]?._id;
  }, [selectedPropertyId, properties]);

  const displayedBuildings = useMemo(() => {
    if (!buildings) return undefined;
    if (effectivePropertyId === undefined) return buildings;
    return buildings.filter((b) => b.propertyId === effectivePropertyId);
  }, [buildings, effectivePropertyId]);

  const createBuilding = useMutation(api.buildings.create);
  const updateBuilding = useMutation(api.buildings.update);
  const archiveBuilding = useMutation(api.buildings.archive);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!effectivePropertyId) {
      setError("Select a property first.");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      await createBuilding({
        propertyId: effectivePropertyId,
        name: createForm.name,
        code: createForm.code,
        type: createForm.type,
        status: createForm.status,
        address: createForm.address || undefined,
        notes: createForm.notes || undefined,
      });
      setCreateForm(INITIAL_FORM);
      setMessage("Building created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create building");
    } finally {
      setIsCreating(false);
    }
  };

  const getDraft = (building: Doc<"buildings">): BuildingDraft =>
    drafts[building._id] ?? mapBuildingToDraft(building);

  const setDraftField = (
    buildingId: Id<"buildings">,
    field: keyof BuildingDraft,
    value: string,
  ) => {
    setDrafts((current) => {
      const key = String(buildingId);
      return {
        ...current,
        [key]: { ...(current[key] ?? INITIAL_FORM), [field]: value } as BuildingDraft,
      };
    });
  };

  const onUpdate = async (building: Doc<"buildings">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    const draft = getDraft(building);
    const id = String(building._id);

    setIsUpdating((c) => ({ ...c, [id]: true }));
    setError(null);
    setMessage(null);

    try {
      await updateBuilding({
        buildingId: building._id,
        name: draft.name,
        code: draft.code,
        type: draft.type,
        status: draft.status,
        address: draft.address,
        notes: draft.notes,
      });
      setMessage("Building updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update building");
    } finally {
      setIsUpdating((c) => ({ ...c, [id]: false }));
    }
  };

  const onArchive = async (buildingId: Id<"buildings">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!window.confirm("Archive this building?")) return;

    const id = String(buildingId);
    setIsArchiving((c) => ({ ...c, [id]: true }));
    setError(null);
    setMessage(null);

    try {
      await archiveBuilding({ buildingId });
      setMessage("Building archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive building");
    } finally {
      setIsArchiving((c) => ({ ...c, [id]: false }));
    }
  };

  if (isConvexAuthLoading) {
    return <div>Loading secure workspace...</div>;
  }

  if (!isAuthenticated) {
    return <div>Not authenticated. Please refresh or sign in again.</div>;
  }

  if (properties === undefined) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (properties.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No properties found. Create a property first on the{" "}
        <a href="/properties" className="underline underline-offset-4">
          Properties
        </a>{" "}
        page.
      </p>
    );
  }

  const activePropertyId = effectivePropertyId ?? properties[0]._id;

  return (
    <div className="space-y-8">
      {/* Property selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm font-medium" htmlFor="property-select">
          Property
        </label>
        <select
          id="property-select"
          className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-72"
          value={String(activePropertyId)}
          onChange={(e) =>
            setSelectedPropertyId(e.target.value as Id<"properties">)
          }
        >
          {properties.map((p) => (
            <option key={p._id} value={String(p._id)}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>

      {/* Create form — admins only */}
      {canCreate && (
        <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Add Building</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onCreate}>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Name</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, name: e.target.value }))
                }
                required
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Code</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, code: e.target.value }))
                }
                required
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Type</span>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    type: e.target.value as BuildingType,
                  }))
                }
              >
                {BUILDING_TYPES.map((t) => (
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
                    status: e.target.value as Exclude<BuildingStatus, "archived">,
                  }))
                }
              >
                {BUILDING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">Address</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, address: e.target.value }))
                }
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">Notes</span>
              <textarea
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                rows={2}
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, notes: e.target.value }))
                }
              />
            </label>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Add Building"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Building list */}
      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Buildings</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>

        {message ? (
          <p className="mb-4 text-sm text-green-700">{message}</p>
        ) : null}
        {error ? (
          <p className="mb-4 text-sm text-red-700">{error}</p>
        ) : null}

        {displayedBuildings === undefined ? (
          <p className="text-sm text-slate-500">Loading buildings...</p>
        ) : displayedBuildings.length === 0 ? (
          <p className="text-sm text-slate-500">
            No buildings found for this property.
          </p>
        ) : (
          <div className="space-y-4">
            {displayedBuildings.map((building) => {
              const draft = getDraft(building);
              const bKey = String(building._id);

              return (
                <article
                  key={building._id}
                  className="rounded-md border p-4 dark:border-slate-700"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">{building.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                      {building.status}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Name</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.name}
                        onChange={(e) =>
                          setDraftField(building._id, "name", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Code</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                        value={draft.code}
                        onChange={(e) =>
                          setDraftField(building._id, "code", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Type</span>
                      <select
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.type}
                        onChange={(e) =>
                          setDraftField(building._id, "type", e.target.value)
                        }
                        disabled={!canUpdate}
                      >
                        {BUILDING_TYPES.map((t) => (
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
                        value={draft.status}
                        onChange={(e) =>
                          setDraftField(building._id, "status", e.target.value)
                        }
                        disabled={!canUpdate}
                      >
                        {BUILDING_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="archived">archived</option>
                      </select>
                    </label>

                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block font-medium">Address</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.address}
                        onChange={(e) =>
                          setDraftField(building._id, "address", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm md:col-span-2">
                      <span className="mb-1 block font-medium">Notes</span>
                      <textarea
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        rows={2}
                        value={draft.notes}
                        onChange={(e) =>
                          setDraftField(building._id, "notes", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {canUpdate && (
                      <button
                        type="button"
                        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                        onClick={() => onUpdate(building)}
                        disabled={isUpdating[bKey]}
                      >
                        {isUpdating[bKey] ? "Saving..." : "Save changes"}
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => onArchive(building._id)}
                        disabled={
                          isArchiving[bKey] || building.status === "archived"
                        }
                      >
                        {isArchiving[bKey] ? "Archiving..." : "Archive"}
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
