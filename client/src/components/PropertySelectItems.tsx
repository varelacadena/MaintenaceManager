import type { ReactNode } from "react";
import { SelectItem } from "@/components/ui/select";
import {
  formatSpaceLabel,
  sortByName,
  type PropertyLike,
} from "@/lib/propertyDisplayUtils";

export function PropertySelectLabel({ property }: { property: PropertyLike }) {
  return (
    <>
      {property.name}
      {property.address ? (
        <span className="text-muted-foreground ml-1">({property.address})</span>
      ) : null}
    </>
  );
}

interface PropertySelectItemsProps {
  properties: PropertyLike[];
  noneValue?: string | false;
  noneLabel?: string;
}

export function PropertySelectItems({
  properties,
  noneValue = "__none__",
  noneLabel = "None",
}: PropertySelectItemsProps) {
  const sorted = sortByName(properties);
  return (
    <>
      {noneValue !== false && (
        <SelectItem value={noneValue}>{noneLabel}</SelectItem>
      )}
      {sorted.map((property) => (
        <SelectItem key={property.id} value={property.id}>
          <PropertySelectLabel property={property} />
        </SelectItem>
      ))}
    </>
  );
}

interface NameSelectItemsProps<T extends { id: string; name: string }> {
  items: T[];
  noneValue?: string | false;
  noneLabel?: string;
  formatLabel?: (item: T) => ReactNode;
}

export function NameSelectItems<T extends { id: string; name: string }>({
  items,
  noneValue = "__none__",
  noneLabel = "None",
  formatLabel = (item) => item.name,
}: NameSelectItemsProps<T>) {
  const sorted = sortByName(items);
  return (
    <>
      {noneValue !== false && (
        <SelectItem value={noneValue}>{noneLabel}</SelectItem>
      )}
      {sorted.map((item) => (
        <SelectItem key={item.id} value={item.id}>
          {formatLabel(item)}
        </SelectItem>
      ))}
    </>
  );
}

export function SpaceSelectItems({
  spaces,
  noneValue = "__none__",
  noneLabel = "None",
}: {
  spaces: { id: string; name: string; floor?: string | null }[];
  noneValue?: string | false;
  noneLabel?: string;
}) {
  return (
    <NameSelectItems
      items={spaces}
      noneValue={noneValue}
      noneLabel={noneLabel}
      formatLabel={(space) => formatSpaceLabel(space)}
    />
  );
}
