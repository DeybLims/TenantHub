import type { PropertyOccupancy } from "@/types/dashboard";

interface PropertiesCardProps {
  properties: PropertyOccupancy[];
}

export function PropertiesCard({ properties }: PropertiesCardProps) {
  return (
    <div className="space-y-8">
      {properties.map((property) => {
        const percent = property.total
          ? (property.occupied / property.total) * 100
          : 0;
        const percentLabel =
          percent % 1 === 0 ? `${percent}%` : `${percent.toFixed(1)}%`;
        const showOccupiedLabel = property.occupied > 0 && percent >= 18;

        return (
          <div key={property.label}>
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-navy">
                  {property.label}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {property.occupied}/{property.total} Units Occupied
                </p>
              </div>
            </div>
            <div className="relative h-8 overflow-hidden rounded-full bg-gray-100">
              <div
                className="relative flex h-full items-center rounded-full bg-gradient-to-r from-brand-blue to-brand-blue-dark transition-all duration-300"
                style={{ width: `${Math.max(percent, 0)}%` }}
              >
                {showOccupiedLabel && (
                  <span className="pl-4 text-xs font-semibold text-white">
                    Occupied
                  </span>
                )}
              </div>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-navy">
                {percentLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
