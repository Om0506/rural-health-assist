export default function VillagerSectionHeader({ title, subtitle }) {
  return (
    <header className="villager-section-header">
      <h2 className="villager-section-header-title">{title}</h2>
      {subtitle && <p className="villager-section-header-sub">{subtitle}</p>}
    </header>
  );
}
