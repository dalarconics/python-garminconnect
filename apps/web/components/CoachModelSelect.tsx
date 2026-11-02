"use client";

type Props = {
  models?: string[];
  value?: string;
  onChange?: (model: string) => void;
  disabled?: boolean;
};

export function CoachModelSelect(_props: Props = {}) {
  return (
    <div
      className="coach-model-select coach-model-static"
      aria-label="Modelo exclusivo"
      title="Modelo exclusivo de entrenamiento: Meta Muse Spark"
    >
      <span className="coach-model-icon" aria-hidden="true">✦</span>
      <span className="coach-model-badge">Meta Muse · Spark</span>
    </div>
  );
}
