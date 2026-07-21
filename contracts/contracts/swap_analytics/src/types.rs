use soroban_sdk::{contracttype, Address, BytesN, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapRecord {
    pub user: Address,
    pub transaction_hash: BytesN<32>,
    pub pair_id: Symbol,
    pub sent_amount: i128,
    pub received_amount: i128,
    pub timestamp: u64,
}
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserStats {
    pub swap_count: u64,
    pub total_sent: i128,
    pub total_received: i128,
    pub favorite_pair: Option<Symbol>,
}
#[contracttype]
pub(crate) enum InstanceKey {
    Admin,
    Registry,
}
#[contracttype]
pub(crate) enum DataKey {
    Swap(Address, BytesN<32>),
    Stats(Address),
}
