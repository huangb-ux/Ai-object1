"use client";

interface CommandBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string;
  examples: string[];
  onExample: (text: string) => void;
}

export default function CommandBar({ value, onChange, onSubmit, pending, error, examples, onExample }: CommandBarProps) {
  return (
    <div className="cmdbar">
      <form
        className="cmd-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <span className="cmd-prefix">›</span>
        <input
          className="cmd-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="我回家了 / 把主灯调到 60% / 有点冷"
          maxLength={120}
          aria-label="对屋子说一句话"
          disabled={pending}
        />
        <button className="cmd-send" type="submit" disabled={pending || value.trim().length === 0}>
          {pending ? "解析中" : "执行 ↵"}
        </button>
      </form>

      <div className="cmd-hint">
        {error ? <span className="error-line">{error}</span> : <span>一句话就行。场景词（回家、看电影、睡觉）会同时动好几台设备。</span>}
      </div>

      <div className="examples">
        {examples.map((example) => (
          <button key={example} className="ex-chip" type="button" onClick={() => onExample(example)} disabled={pending}>
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
