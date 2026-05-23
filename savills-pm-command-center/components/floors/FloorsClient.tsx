"use client";

import { FormEvent, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type FloorType = Doc<"floors">["type"];
type FloorStatus = Doc<"floors">["status"];

type FloorDraft = {
  name: string;
  code: string;
  level: string;
  type: FloorType;
  status: Exclude<FloorStatus, "archived">;
  grossAreaSqm: string;
  netAreaSqm: string;
  notes: string;
};

const FLOOR_TYPES: FloorType[] = [
  "residential",
  "commercial",
  "retail",
  "parking",
  "amenity",
  "mechanical",
  "other",
];

const FLOOR_STATUSES: Exclude<FloorStatus, "archived">[] = ["active", "inactive"];

const INITIAL_FORM: FloorDraft = {
  name: "",
  code: "",
  level: "0",
  type: "residential",
  status: "active",
  grossAreaSqm: "",
  netAreaSqm: "",
  notes: "",
};

function mapFloorToDraft(floor: Doc<"floors">): FloorDraft {
  return {
    name: floor.name,
    code: floor.code,
    level: String(floor.level),
    type: floor.type,
    status: floor.status === "archived" ? "active" : floor.status,
    grossAreaSqm: floor.grossAreaSqm != null ? String(floor.grossAreaSqm) : "",
    netAreaSqm: floor.netAreaSqm != null ? String(floor.netAreaSqm) : "",
    notes: floor.notes ?? "",
  };
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return isNaN(n) ? undefined : n;
}

export default function FloorsClient() {
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const { has } = useAuth();

  const canCreate = has?.({ permission: "org:properties:create" }) ?? false;
  const canUpdate = has?.({ permission: "org:properties:update" }) ?? false;
  const canArchive = has?.({ permission: "org:properties:archive" }) ?? false;

  const [selectedPropertyId, setSelectedPropertyId] = useState<
    Id<"properties"> | undefined
  >(undefined);
  const [selectedBuildingId, setSelectedBuildingId] = useState<
    Id<"buildings"> | undefined
  >(undefined);

  const [createForm, setCreateForm] = useState<FloorDraft>(INITIAL_FORM);
  const [drafts, setDrafts] = useState<Record<string, FloorDraft>>({});
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

  const activePropertyId = useMemo(
    () => selectedPropertyId ?? properties?.[0]?._id,
    [selectedPropertyId, properties],
  );

  const buildings = useQuery(
    api.buildings.list,
    isAuthenticated && activePropertyId
      ? { propertyId: activePropertyId, includeArchived: false }
      : "skip",
  );

  // Reset building selection when property changes
  const activeBuildingId = useMemo(() => {
    if (selectedBuildingId !== undefined) {
      // Ensure the selected building still belongs to the active property
      const stillValid = buildings?.some((b) => b._id === selectedBuildingId);
      if (stillValid) return selectedBuildingId;
    }
    return buildings?.[0]?._id;
  }, [selectedBuildingId, buildings]);

  const floors = useQuery(
    api.floors.list,
    isAuthenticated && activeBuildingId
      ? { buildingId: activeBuildingId, includeArchived: showArchived }
      : "skip",
  );

  const createFloor = useMutation(api.floors.create);
  const updateFloor = useMutation(api.floors.update);
  const archiveFloor = useMutation(api.floors.archive);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!activePropertyId || !activeBuildingId) {
      setError("Select a property and building first.");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      await createFloor({
        propertyId: activePropertyId,
        buildingId: activeBuildingId,
        name: createForm.name,
        code: createForm.code,
        level: Number(createForm.level),
        type: createForm.type,
        status: createForm.status,
        grossAreaSqm: parseOptionalNumber(createForm.grossAreaSqm),
        netAreaSqm: parseOptionalNumber(createForm.netAreaSqm),
        notes: createForm.notes || undefined,
      });
      setCreateForm(INITIAL_FORM);
      setMessage("Floor created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create floor");
    } finally {
      setIsCreating(false);
    }
  };

  const getDraft = (floor: Doc<"floors">): FloorDraft =>
    drafts[floor._id] ?? mapFloorToDraft(floor);

  const setDraftField = (
    floorId: Id<"floors">,
    field: keyof FloorDraft,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [String(floorId)]: {
        ...(current[String(floorId)] ?? INITIAL_FORM),
        [field]: value,
      } as FloorDraft,
    }));
  };

  const onUpdate = async (floor: Doc<"floors">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    const draft = getDraft(floor);
    const key = String(floor._id);

    setIsUpdating((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await updateFloor({
        floorId: floor._id,
        name: draft.name,
        code: draft.code,
        level: Number(draft.level),
        type: draft.type,
        status: draft.status,
        grossAreaSqm: parseOptionalNumber(draft.grossAreaSqm),
        netAreaSqm: parseOptionalNumber(draft.netAreaSqm),
        notes: draft.notes || undefined,
      });
      setMessage("Floor updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update floor");
    } finally {
      setIsUpdating((c) => ({ ...c, [key]: false }));
    }
  };

  const onArchive = async (floorId: Id<"floors">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!window.confirm("Archive this floor?")) return;

    const key = String(floorId);
    setIsArchiving((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await archiveFloor({ floorId });
      setMessage("Floor archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive floor");
    } finally {
      setIsArchiving((c) => ({ ...c, [key]: false }));
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

  const resolvedPropertyId = activePropertyId ?? properties[0]._id;

  return (
    <div className="space-y-8">
      {/* Selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="property-select">
            Property
          </label>
          <select
            id="property-select"
            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-64"
            value={String(resolvedPropertyId)}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value as Id<"properties">);
              setSelectedBuildingId(undefined);
            }}
          >
            {properties.map((p) => (
              <option key={p._id} value={String(p._id)}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="building-select">
            Building
          </label>
          {buildings === undefined ? (
            <p className="text-sm text-slate-500">Loading buildings...</p>
          ) : buildings.length === 0 ? (
            <p className="text-sm text-slate-500">
              No buildings for this property.{" "}
              <a href="/buildings" className="underline underline-offset-4">
                Add one
              </a>
              .
            </p>
          ) : (
            <select
              id="building-select"
              className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-64"
              value={activeBuildingId ? String(activeBuildingId) : ""}
              onChange={(e) =>
                setSelectedBuildingId(e.target.value as Id<"buildings">)
              }
            >
              {buildings.map((b) => (
                <option key={b._id} value={String(b._id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Create form — admins only */}
      {canCreate && activeBuildingId && (
        <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Add Floor</h2>
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
              <span className="mb-1 block font-medium">Level</span>
              <input
                type="number"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.level}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, level: e.target.value }))
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
                    type: e.target.value as FloorType,
                  }))
                }
              >
                {FLOOR_TYPES.map((t) => (
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
                    status: e.target.value as Exclude<FloorStatus, "archived">,
                  }))
                }
              >
                {FLOOR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Gross Area (sqm)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.grossAreaSqm}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, grossAreaSqm: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Net Area (sqm)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.netAreaSqm}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, netAreaSqm: e.target.value }))
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
                {isCreating ? "Creating..." : "Add Floor"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Floor list */}
      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Floors</h2>
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
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        {!activeBuildingId ? (
          <p className="text-sm text-slate-500">
            Select a building to view its floors.
          </p>
        ) : floors === undefined ? (
          <p className="text-sm text-slate-500">Loading floors...</p>
        ) : floors.length === 0 ? (
          <p className="text-sm text-slate-500">
            No floors found for this building.
          </p>
        ) : (
          <div className="space-y-4">
            {floors.map((floor) => {
              const draft = getDraft(floor);
              const fKey = String(floor._id);

              return (
                <article
                  key={floor._id}
                  className="rounded-md border p-4 dark:border-slate-700"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">
                      {floor.name}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        Level {floor.level}
                      </span>
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                      {floor.status}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Name</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.name}
                        onChange={(e) =>
                          setDraftField(floor._id, "name", e.target.value)
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
                          setDraftField(floor._id, "code", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Level</span>
                      <input
                        type="number"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.level}
                        onChange={(e) =>
                          setDraftField(floor._id, "level", e.target.value)
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
                          setDraftField(floor._id, "type", e.target.value)
                        }
                        disabled={!canUpdate}
                      >
                        {FLOOR_TYPES.map((t) => (
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
                          setDraftField(floor._id, "status", e.target.value)
                        }
                        disabled={!canUpdate}
                      >
                        {FLOOR_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="archived">archived</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Gross Area (sqm)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.grossAreaSqm}
                        onChange={(e) =>
                          setDraftField(
                            floor._id,
                            "grossAreaSqm",
                            e.target.value,
                          )
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">
                        Net Area (sqm)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.netAreaSqm}
                        onChange={(e) =>
                          setDraftField(floor._id, "netAreaSqm", e.target.value)
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
                          setDraftField(floor._id, "notes", e.target.value)
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
                        onClick={() => onUpdate(floor)}
                        disabled={isUpdating[fKey]}
                      >
                        {isUpdating[fKey] ? "Saving..." : "Save changes"}
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => onArchive(floor._id)}
                        disabled={
                          isArchiving[fKey] || floor.status === "archived"
                        }
                      >
                        {isArchiving[fKey] ? "Archiving..." : "Archive"}
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
