export type Slippage = '0.5' | '1' | '2'
export function SlippageSelector({ value, onChange, maxBps }: { value: Slippage; onChange: (value: Slippage) => void; maxBps?: number }) {
  return <fieldset className="slippage-selector"><legend>Slippage protection</legend>{(['0.5', '1', '2'] as const).map((option) => { const disabled = maxBps != null && Number(option) * 100 > maxBps; return <label key={option}><input type="radio" name="slippage" value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)} /><span>{option}%</span></label> })}</fieldset>
}
