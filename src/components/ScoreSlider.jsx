import { useId } from 'react';
import { motion } from 'framer-motion';
import { SCORE_STEP } from '../utils/constants';

export default function ScoreSlider({
  label,
  value,
  onChange,
  animated = false,
  readOnly = false,
}) {
  const pct = (value / 10) * 100;
  const labelId = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span id={labelId} className="text-sm text-text-muted font-medium">{label}</span>
        <motion.span
          key={value}
          initial={animated ? { scale: 1.4, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          className="text-lg font-bold tabular-nums text-text-primary"
        >
          {value.toFixed(1)}
        </motion.span>
      </div>

      <div className="relative pt-1 pb-1">
        {readOnly ? (
          <meter
            min={0}
            max={10}
            value={value}
            aria-labelledby={labelId}
            className="score-meter"
          >
            {value} / 10
          </meter>
        ) : (
          <input
            type="range"
            min={0}
            max={10}
            step={SCORE_STEP}
            value={value}
            aria-labelledby={labelId}
            onChange={(e) => { onChange?.(parseFloat(e.target.value)); if (navigator.vibrate) navigator.vibrate(3); }}
            className="relative z-10 w-full cursor-pointer"
            style={{
              background: 'var(--color-text-primary)',
              backgroundSize: `${pct}% 100%`,
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'var(--color-border-subtle)'
            }}
          />
        )}
      </div>
    </div>
  );
}
