use crate::Pair;
use soroban_sdk::{contractevent, Address, Env, Symbol};

#[contractevent(topics = ["register"])]
struct PairRegistered {
    #[topic]
    pair_id: Symbol,
    pair: Pair,
}
#[contractevent(topics = ["updated"])]
struct PairUpdated {
    #[topic]
    pair_id: Symbol,
    pair: Pair,
}
#[contractevent(topics = ["status"])]
struct PairStatusChanged {
    #[topic]
    pair_id: Symbol,
    active: bool,
}
#[contractevent(topics = ["admin"])]
struct AdminTransferred {
    #[topic]
    old_admin: Address,
    new_admin: Address,
}

pub(crate) fn pair_registered(env: &Env, pair: &Pair) {
    PairRegistered {
        pair_id: pair.pair_id.clone(),
        pair: pair.clone(),
    }
    .publish(env);
}
pub(crate) fn pair_updated(env: &Env, pair: &Pair) {
    PairUpdated {
        pair_id: pair.pair_id.clone(),
        pair: pair.clone(),
    }
    .publish(env);
}
pub(crate) fn pair_status_changed(env: &Env, id: &Symbol, active: bool) {
    PairStatusChanged {
        pair_id: id.clone(),
        active,
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
