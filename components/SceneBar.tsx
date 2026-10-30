"use client";

interface SceneBarProps {
  scenes: { id: string; name: string; hint: string }[];
  onPick: (id: string) => void;
  pending: boolean;
}

export default function SceneBar({ scenes, onPick, pending }: SceneBarProps) {
  return (
    <div className="scenes">
      <span className="scenes-label">场景</span>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          type="button"
          className="scene-chip"
          title={scene.hint}
          onClick={() => onPick(scene.id)}
          disabled={pending}
        >
          {scene.name}
        </button>
      ))}
      <span className="scenes-hint">点一下，等于说出这句话</span>
    </div>
  );
}
