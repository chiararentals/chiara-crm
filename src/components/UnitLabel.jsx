// Ime jedinice je glavno (npr. "Mascagni 1"), a objekt je sitnije ispod/pokraj njega.
export default function UnitLabel({ unit, className = '', stacked }) {
  if (!unit) return <span className="text-mute">—</span>;
  const showProperty = unit.property && unit.property.name !== unit.name;
  return (
    <span className={`${stacked ? 'block' : ''} ${className}`}>
      <span className="font-semibold">{unit.name}</span>
      {showProperty && <span className={`${stacked ? 'block text-xs' : 'ml-1.5 text-xs'} font-normal text-mute`}>{unit.property.name}</span>}
    </span>
  );
}
