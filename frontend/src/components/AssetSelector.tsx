import { SUPPORTED_ASSETS, type AssetConfig } from '../config/assets'

export function AssetSelector({ id, label, value, excluded, onChange }: { id: string; label: string; value: AssetConfig; excluded: AssetConfig; onChange: (asset: AssetConfig) => void }) {
  return <label className="asset-selector" htmlFor={id}><span>{label}</span><select id={id} value={value.id} onChange={(event) => {
    const asset = SUPPORTED_ASSETS.find((candidate) => candidate.id === event.target.value)
    if (asset && asset.id !== excluded.id) onChange(asset)
  }}>{SUPPORTED_ASSETS.map((asset) => <option key={asset.id} value={asset.id} disabled={asset.id === excluded.id}>{asset.code} · {asset.displayName}</option>)}</select></label>
}
