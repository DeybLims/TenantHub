import type { PropertyOccupancy } from "@/types/dashboard";

interface PropertiesCardProps {
  properties: PropertyOccupancy[];
}

export function PropertiesCard({ properties }: PropertiesCardProps) {
  return (
    <div className="space-y-6">
      {properties.map((property) => {
        const percent = property.total
          ? (property.occupied / property.total) * 100
          : 0;
        const showLabel = property.occupied > 0;

        return (
          <div key={property.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-navy">{property.label}</span>
              <span className="font-medium text-gray-500">
                {property.occupied}/{property.total}
              </span>
            </div>
            <div className="relative h-9 overflow-hidden rounded-lg bg-gray-100">
              <div
                className="flex h-full min-w-[4.5rem] items-center rounded-lg bg-gradient-to-r from-brand-blue to-brand-blue-dark px-3 transition-all duration-300"
                style={{ width: `${Math.max(percent, showLabel ? 28 : 0)}%` }}
              >
                {showLabel && (
                  <span className="whitespace-nowrap text-xs font-semibold text-white">
                    Occupied
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
