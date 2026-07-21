use soroban_sdk::{contracttype, Address, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AssetInfo {
    pub code: String,
    pub issuer: Option<Address>,
    pub is_native: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Pair {
    pub pair_id: Symbol,
    pub base: AssetInfo,
    pub quote: AssetInfo,
    pub active: bool,
    pub max_slippage_bps: u32,
    pub created_at: u64,
    pub updated_at: u64,
}

#[contracttype]
pub(crate) enum InstanceKey {
    Admin,
    PairIds,
}
#[contracttype]
pub(crate) enum DataKey {
    Pair(Symbol),
}
