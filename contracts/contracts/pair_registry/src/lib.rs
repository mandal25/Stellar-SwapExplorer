#![no_std]

mod error;
mod events;
mod types;
mod validation;

pub use error::Error;
pub use types::{AssetInfo, Pair};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

const INSTANCE_TTL_THRESHOLD: u32 = 30 * 24 * 60 * 60 / 5;
const INSTANCE_TTL_BUMP: u32 = 120 * 24 * 60 * 60 / 5;
const PERSISTENT_TTL_THRESHOLD: u32 = 60 * 24 * 60 * 60 / 5;
const PERSISTENT_TTL_BUMP: u32 = 365 * 24 * 60 * 60 / 5;

#[contract]
pub struct PairRegistry;

#[contractimpl]
impl PairRegistry {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage()
            .instance()
            .set(&types::InstanceKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&types::InstanceKey::PairIds, &Vec::<Symbol>::new(&env));
        bump_instance(&env);
    }

    pub fn register_pair(env: Env, pair: Pair) -> Result<(), Error> {
        require_admin(&env);
        validation::validate_pair(&env, &pair)?;
        if env
            .storage()
            .persistent()
            .has(&types::DataKey::Pair(pair.pair_id.clone()))
        {
            return Err(Error::PairAlreadyExists);
        }
        let now = env.ledger().timestamp();
        let mut stored = pair;
        stored.created_at = now;
        stored.updated_at = now;
        let key = types::DataKey::Pair(stored.pair_id.clone());
        env.storage().persistent().set(&key, &stored);
        bump_pair(&env, &key);
        let mut ids: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&types::InstanceKey::PairIds)
            .unwrap_or(Vec::new(&env));
        ids.push_back(stored.pair_id.clone());
        env.storage()
            .instance()
            .set(&types::InstanceKey::PairIds, &ids);
        events::pair_registered(&env, &stored);
        bump_instance(&env);
        Ok(())
    }

    pub fn update_pair(env: Env, pair: Pair) -> Result<(), Error> {
        require_admin(&env);
        validation::validate_pair(&env, &pair)?;
        let key = types::DataKey::Pair(pair.pair_id.clone());
        let old: Pair = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::PairNotFound)?;
        let mut stored = pair;
        stored.created_at = old.created_at;
        stored.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &stored);
        bump_pair(&env, &key);
        events::pair_updated(&env, &stored);
        Ok(())
    }

    pub fn set_pair_status(env: Env, pair_id: Symbol, active: bool) -> Result<(), Error> {
        require_admin(&env);
        validation::validate_pair_id(&env, &pair_id)?;
        let key = types::DataKey::Pair(pair_id.clone());
        let mut pair: Pair = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::PairNotFound)?;
        pair.active = active;
        pair.updated_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &pair);
        bump_pair(&env, &key);
        events::pair_status_changed(&env, &pair_id, active);
        Ok(())
    }

    pub fn get_pair(env: Env, pair_id: Symbol) -> Result<Pair, Error> {
        let key = types::DataKey::Pair(pair_id);
        let pair = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::PairNotFound)?;
        bump_pair(&env, &key);
        Ok(pair)
    }

    pub fn assert_pair_active(env: Env, pair_id: Symbol) -> Result<(), Error> {
        let pair = Self::get_pair(env, pair_id)?;
        if !pair.active {
            return Err(Error::PairInactive);
        }
        Ok(())
    }

    pub fn list_pair_ids(env: Env) -> Vec<Symbol> {
        bump_instance(&env);
        env.storage()
            .instance()
            .get(&types::InstanceKey::PairIds)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_admin(env: Env) -> Address {
        bump_instance(&env);
        env.storage()
            .instance()
            .get(&types::InstanceKey::Admin)
            .unwrap()
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        let old = Self::get_admin(env.clone());
        old.require_auth();
        env.storage()
            .instance()
            .set(&types::InstanceKey::Admin, &new_admin);
        events::admin_transferred(&env, &old, &new_admin);
        bump_instance(&env);
    }
}

fn require_admin(env: &Env) {
    PairRegistry::get_admin(env.clone()).require_auth();
}
fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_BUMP);
}
fn bump_pair(env: &Env, key: &types::DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP);
}

#[cfg(test)]
mod test;
