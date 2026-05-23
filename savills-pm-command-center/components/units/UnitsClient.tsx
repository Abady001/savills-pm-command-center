"use client";

import { FormEvent, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type UnitType = Doc<"units">["unitType"];
type UnitStatus = Doc<"units">["status"];

type UnitDraft = {
  code: string;
  name: string;
  unitType: UnitType;
  status: Exclude<UnitStatus, "archived">;
  usageType: string;
  internalAreaSqm: string;
  externalAreaSqm: string;
  grossAreaSqm: string;
  netAreaSqm: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  storageIncluded: boolean;
  baseRentAmount: string;
  serviceChargeAmount: string;
  currency: string;
  notes: string;
};

const UNIT_TYPES: UnitType[] = [
  "apartment",
  "office",
  "retail",
  "kiosk",
  "clinic",
  "storage",
  "parking",
  "common_area",
  "other",
];

const UNIT_STATUSES: Exclude<UnitStatus, "archived">[] = [
  "available",
  "reserved",
  "occupied",
  "under_maintenance",
  "under_fit_out",
  "blocked",
  "vacant_notice",
  "legal_hold",
];

const INITIAL_FORM: UnitDraft = {
  code: "",
  name: "",
  unitType: "apartment",
  status: "available",
  usageType: "",
  internalAreaSqm: "",
  externalAreaSqm: "",
  grossAreaSqm: "",
  netAreaSqm: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  storageIncluded: false,
  baseRentAmount: "",
  serviceChargeAmount: "",
  currency: "EGP",
  notes: "",
};

function mapUnitToDraft(unit: Doc<"units">): UnitDraft {
  return {
    code: unit.code,
    name: unit.name,
    unitType: unit.unitType,
    status: unit.status === "archived" ? "available" : unit.status,
    usageType: unit.usageType ?? "",
    internalAreaSqm: unit.internalAreaSqm != null ? String(unit.internalAreaSqm) : "",
    externalAreaSqm: unit.externalAreaSqm != null ? String(unit.externalAreaSqm) : "",
    grossAreaSqm: unit.grossAreaSqm != null ? String(unit.grossAreaSqm) : "",
    netAreaSqm: unit.netAreaSqm != null ? String(unit.netAreaSqm) : "",
    bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : "",
    bathrooms: unit.bathrooms != null ? String(unit.bathrooms) : "",
    parkingSpaces: unit.parkingSpaces != null ? String(unit.parkingSpaces) : "",
    storageIncluded: unit.storageIncluded ?? false,
    baseRentAmount: unit.baseRentAmount != null ? String(unit.baseRentAmount) : "",
    serviceChargeAmount:
      unit.serviceChargeAmount != null ? String(unit.serviceChargeAmount) : "",
    currency: unit.currency ?? "",
    notes: unit.notes ?? "",
  };
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return isNaN(n) ? undefined : n;
}

export default function UnitsClient() {
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
  const [selectedFloorId, setSelectedFloorId] = useState<
    Id<"floors"> | undefined
  >(undefined);

  const [createForm, setCreateForm] = useState<UnitDraft>(INITIAL_FORM);
  const [drafts, setDrafts] = useState<Record<string, UnitDraft>>({});
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

  const activeBuildingId = useMemo(() => {
    if (selectedBuildingId !== undefined) {
      const stillValid = buildings?.some((b) => b._id === selectedBuildingId);
      if (stillValid) return selectedBuildingId;
    }
    return buildings?.[0]?._id;
  }, [selectedBuildingId, buildings]);

  const floors = useQuery(
    api.floors.list,
    isAuthenticated && activeBuildingId
      ? { buildingId: activeBuildingId, includeArchived: false }
      : "skip",
  );

  const activeFloorId = useMemo(() => {
    if (selectedFloorId !== undefined) {
      const stillValid = floors?.some((f) => f._id === selectedFloorId);
      if (stillValid) return selectedFloorId;
    }
    return floors?.[0]?._id;
  }, [selectedFloorId, floors]);

  const units = useQuery(
    api.units.list,
    isAuthenticated && activeFloorId
      ? { floorId: activeFloorId, includeArchived: showArchived }
      : "skip",
  );

  const createUnit = useMutation(api.units.create);
  const updateUnit = useMutation(api.units.update);
  const archiveUnit = useMutation(api.units.archive);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!activePropertyId || !activeBuildingId || !activeFloorId) {
      setError("Select a property, building, and floor first.");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);

    try {
      await createUnit({
        propertyId: activePropertyId,
        buildingId: activeBuildingId,
        floorId: activeFloorId,
        code: createForm.code,
        name: createForm.name,
        unitType: createForm.unitType,
        status: createForm.status,
        usageType: createForm.usageType || undefined,
        internalAreaSqm: parseOptionalNumber(createForm.internalAreaSqm),
        externalAreaSqm: parseOptionalNumber(createForm.externalAreaSqm),
        grossAreaSqm: parseOptionalNumber(createForm.grossAreaSqm),
        netAreaSqm: parseOptionalNumber(createForm.netAreaSqm),
        bedrooms: parseOptionalNumber(createForm.bedrooms),
        bathrooms: parseOptionalNumber(createForm.bathrooms),
        parkingSpaces: parseOptionalNumber(createForm.parkingSpaces),
        storageIncluded: createForm.storageIncluded,
        baseRentAmount: parseOptionalNumber(createForm.baseRentAmount),
        serviceChargeAmount: parseOptionalNumber(createForm.serviceChargeAmount),
        currency: createForm.currency.trim() || undefined,
        notes: createForm.notes || undefined,
      });
      setCreateForm(INITIAL_FORM);
      setMessage("Unit created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create unit");
    } finally {
      setIsCreating(false);
    }
  };

  const getDraft = (unit: Doc<"units">): UnitDraft =>
    drafts[unit._id] ?? mapUnitToDraft(unit);

  const setDraftField = <K extends keyof UnitDraft>(
    unitId: Id<"units">,
    field: K,
    value: UnitDraft[K],
  ) => {
    setDrafts((current) => ({
      ...current,
      [String(unitId)]: {
        ...(current[String(unitId)] ?? INITIAL_FORM),
        [field]: value,
      } as UnitDraft,
    }));
  };

  const onUpdate = async (unit: Doc<"units">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    const draft = getDraft(unit);
    const key = String(unit._id);

    setIsUpdating((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await updateUnit({
        unitId: unit._id,
        code: draft.code,
        name: draft.name,
        unitType: draft.unitType,
        status: draft.status,
        usageType: draft.usageType,
        internalAreaSqm: parseOptionalNumber(draft.internalAreaSqm),
        externalAreaSqm: parseOptionalNumber(draft.externalAreaSqm),
        grossAreaSqm: parseOptionalNumber(draft.grossAreaSqm),
        netAreaSqm: parseOptionalNumber(draft.netAreaSqm),
        bedrooms: parseOptionalNumber(draft.bedrooms),
        bathrooms: parseOptionalNumber(draft.bathrooms),
        parkingSpaces: parseOptionalNumber(draft.parkingSpaces),
        storageIncluded: draft.storageIncluded,
        baseRentAmount: parseOptionalNumber(draft.baseRentAmount),
        serviceChargeAmount: parseOptionalNumber(draft.serviceChargeAmount),
        currency: draft.currency.trim() || undefined,
        notes: draft.notes,
      });
      setMessage("Unit updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update unit");
    } finally {
      setIsUpdating((c) => ({ ...c, [key]: false }));
    }
  };

  const onArchive = async (unitId: Id<"units">) => {
    if (!isAuthenticated) {
      setError("Not authenticated. Please refresh.");
      return;
    }
    if (!window.confirm("Archive this unit?")) return;

    const key = String(unitId);
    setIsArchiving((c) => ({ ...c, [key]: true }));
    setError(null);
    setMessage(null);

    try {
      await archiveUnit({ unitId });
      setMessage("Unit archived.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive unit");
    } finally {
      setIsArchiving((c) => ({ ...c, [key]: false }));
    }
  };

  if (isConvexAuthLoading) return <div>Loading secure workspace...</div>;
  if (!isAuthenticated)
    return <div>Not authenticated. Please refresh or sign in again.</div>;
  if (properties === undefined)
    return <p className="text-sm text-slate-500">Loading...</p>;

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
      {/* Cascading selectors */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="property-select">
            Property
          </label>
          <select
            id="property-select"
            className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-56"
            value={String(resolvedPropertyId)}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value as Id<"properties">);
              setSelectedBuildingId(undefined);
              setSelectedFloorId(undefined);
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
              No buildings.{" "}
              <a href="/buildings" className="underline underline-offset-4">
                Add one
              </a>
              .
            </p>
          ) : (
            <select
              id="building-select"
              className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-56"
              value={activeBuildingId ? String(activeBuildingId) : ""}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value as Id<"buildings">);
                setSelectedFloorId(undefined);
              }}
            >
              {buildings.map((b) => (
                <option key={b._id} value={String(b._id)}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="floor-select">
            Floor
          </label>
          {!activeBuildingId ? (
            <p className="text-sm text-slate-500">Select a building first.</p>
          ) : floors === undefined ? (
            <p className="text-sm text-slate-500">Loading floors...</p>
          ) : floors.length === 0 ? (
            <p className="text-sm text-slate-500">
              No floors.{" "}
              <a href="/floors" className="underline underline-offset-4">
                Add one
              </a>
              .
            </p>
          ) : (
            <select
              id="floor-select"
              className="rounded-md border bg-white px-3 py-2 text-sm dark:bg-slate-900 sm:w-56"
              value={activeFloorId ? String(activeFloorId) : ""}
              onChange={(e) =>
                setSelectedFloorId(e.target.value as Id<"floors">)
              }
            >
              {floors.map((f) => (
                <option key={f._id} value={String(f._id)}>
                  {f.name} (L{f.level})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Create form — admins only, after floor selected */}
      {canCreate && activeFloorId && (
        <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Add Unit</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={onCreate}>
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
              <span className="mb-1 block font-medium">Unit Type</span>
              <select
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.unitType}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    unitType: e.target.value as UnitType,
                  }))
                }
              >
                {UNIT_TYPES.map((t) => (
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
                    status: e.target.value as Exclude<UnitStatus, "archived">,
                  }))
                }
              >
                {UNIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Usage Type</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.usageType}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, usageType: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Currency</span>
              <input
                className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                value={createForm.currency}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, currency: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Internal Area (sqm)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.internalAreaSqm}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, internalAreaSqm: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">External Area (sqm)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.externalAreaSqm}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, externalAreaSqm: e.target.value }))
                }
              />
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
            <label className="text-sm">
              <span className="mb-1 block font-medium">Bedrooms</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.bedrooms}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, bedrooms: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Bathrooms</span>
              <input
                type="number"
                min="0"
                step="0.5"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.bathrooms}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, bathrooms: e.target.value }))
                }
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block font-medium">Parking Spaces</span>
              <input
                type="number"
                min="0"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.parkingSpaces}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, parkingSpaces: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Base Rent</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.baseRentAmount}
                onChange={(e) =>
                  setCreateForm((c) => ({ ...c, baseRentAmount: e.target.value }))
                }
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Service Charge</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                value={createForm.serviceChargeAmount}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    serviceChargeAmount: e.target.value,
                  }))
                }
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm md:col-span-3">
              <input
                type="checkbox"
                checked={createForm.storageIncluded}
                onChange={(e) =>
                  setCreateForm((c) => ({
                    ...c,
                    storageIncluded: e.target.checked,
                  }))
                }
              />
              Storage included
            </label>

            <label className="text-sm md:col-span-3">
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

            <div className="md:col-span-3">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Add Unit"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Unit list */}
      <section className="rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Units</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>

        {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        {!activeFloorId ? (
          <p className="text-sm text-slate-500">
            Select a floor to view its units.
          </p>
        ) : units === undefined ? (
          <p className="text-sm text-slate-500">Loading units...</p>
        ) : units.length === 0 ? (
          <p className="text-sm text-slate-500">
            No units found for this floor.
            {canCreate ? " Add the first unit above." : ""}
          </p>
        ) : (
          <div className="space-y-4">
            {units.map((unit) => {
              const draft = getDraft(unit);
              const uKey = String(unit._id);

              return (
                <article
                  key={unit._id}
                  className="rounded-md border p-4 dark:border-slate-700"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium">
                      {unit.name}
                      <span className="ml-2 text-sm font-normal text-slate-500">
                        {unit.code}
                      </span>
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
                      {unit.status}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Code</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                        value={draft.code}
                        onChange={(e) =>
                          setDraftField(unit._id, "code", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Name</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.name}
                        onChange={(e) =>
                          setDraftField(unit._id, "name", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Unit Type</span>
                      <select
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.unitType}
                        onChange={(e) =>
                          setDraftField(
                            unit._id,
                            "unitType",
                            e.target.value as UnitType,
                          )
                        }
                        disabled={!canUpdate}
                      >
                        {UNIT_TYPES.map((t) => (
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
                          setDraftField(
                            unit._id,
                            "status",
                            e.target.value as Exclude<UnitStatus, "archived">,
                          )
                        }
                        disabled={!canUpdate}
                      >
                        {UNIT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="archived">archived</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Usage Type</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.usageType}
                        onChange={(e) =>
                          setDraftField(unit._id, "usageType", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Currency</span>
                      <input
                        className="w-full rounded-md border bg-white px-3 py-2 uppercase dark:bg-slate-950"
                        value={draft.currency}
                        onChange={(e) =>
                          setDraftField(unit._id, "currency", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Internal Area</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.internalAreaSqm}
                        onChange={(e) =>
                          setDraftField(unit._id, "internalAreaSqm", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">External Area</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.externalAreaSqm}
                        onChange={(e) =>
                          setDraftField(unit._id, "externalAreaSqm", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Gross Area</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.grossAreaSqm}
                        onChange={(e) =>
                          setDraftField(unit._id, "grossAreaSqm", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Net Area</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.netAreaSqm}
                        onChange={(e) =>
                          setDraftField(unit._id, "netAreaSqm", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Bedrooms</span>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.bedrooms}
                        onChange={(e) =>
                          setDraftField(unit._id, "bedrooms", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Bathrooms</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.bathrooms}
                        onChange={(e) =>
                          setDraftField(unit._id, "bathrooms", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Parking</span>
                      <input
                        type="number"
                        min="0"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.parkingSpaces}
                        onChange={(e) =>
                          setDraftField(unit._id, "parkingSpaces", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Base Rent</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.baseRentAmount}
                        onChange={(e) =>
                          setDraftField(unit._id, "baseRentAmount", e.target.value)
                        }
                        disabled={!canUpdate}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block font-medium">Service Charge</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        value={draft.serviceChargeAmount}
                        onChange={(e) =>
                          setDraftField(
                            unit._id,
                            "serviceChargeAmount",
                            e.target.value,
                          )
                        }
                        disabled={!canUpdate}
                      />
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm md:col-span-3">
                      <input
                        type="checkbox"
                        checked={draft.storageIncluded}
                        onChange={(e) =>
                          setDraftField(
                            unit._id,
                            "storageIncluded",
                            e.target.checked,
                          )
                        }
                        disabled={!canUpdate}
                      />
                      Storage included
                    </label>

                    <label className="text-sm md:col-span-3">
                      <span className="mb-1 block font-medium">Notes</span>
                      <textarea
                        className="w-full rounded-md border bg-white px-3 py-2 dark:bg-slate-950"
                        rows={2}
                        value={draft.notes}
                        onChange={(e) =>
                          setDraftField(unit._id, "notes", e.target.value)
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
                        onClick={() => onUpdate(unit)}
                        disabled={isUpdating[uKey]}
                      >
                        {isUpdating[uKey] ? "Saving..." : "Save changes"}
                      </button>
                    )}
                    {canArchive && (
                      <button
                        type="button"
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        onClick={() => onArchive(unit._id)}
                        disabled={
                          isArchiving[uKey] || unit.status === "archived"
                        }
                      >
                        {isArchiving[uKey] ? "Archiving..." : "Archive"}
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
