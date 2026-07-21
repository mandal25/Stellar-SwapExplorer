use crate::SwapRecord;
use soroban_sdk::{contractevent, Address, Env, Symbol};

#[contractevent(topics = ["swap"])]
struct SwapRecorded {
    #[topic]
    user: Address,
    record: SwapRecord,
}
#[contractevent(topics = ["favorite"])]
struct FavoriteChanged {
    #[topic]
    user: Address,
    pair_id: Symbol,
}
#[contractevent(topics = ["registry"])]
struct RegistryChanged {
    #[topic]
    old_registry: Address,
    new_registry: Address,
}
#[contractevent(topics = ["admin"])]
struct AdminTransferred {
    #[topic]
    old_admin: Address,
    new_admin: Address,
}

pub(crate) fn swap_recorded(env: &Env, record: &SwapRecord) {
    SwapRecorded {
        user: record.user.clone(),
        record: record.clone(),
    }
    .publish(env);
}
pub(crate) fn favorite_changed(env: &Env, user: &Address, pair: &Symbol) {
    FavoriteChanged {
        user: user.clone(),
        pair_id: pair.clone(),
    }
    .publish(env);
}
pub(crate) fn registry_changed(env: &Env, old: &Address, new: &Address) {
    RegistryChanged {
        old_registry: old.clone(),
        new_registry: new.clone(),
    }
    .publish(env);
}
pub(crate) fn admin_transferred(env: &Env, old: &Address, new: &Address) {
    AdminTransferred {
        old_admin: old.clone(),
        new_admin: new.clone(),
    }
    .publish(env);
}
