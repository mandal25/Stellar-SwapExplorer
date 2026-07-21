#![no_std]

//! User-authorized analytics for swaps settled on Stellar Classic.
//! This contract never executes, routes, escrows, or settles a swap.

mod error;
mod events;
mod types;

pub use error::Error;
pub use types::{SwapRecord, UserStats};

use soroban_sdk::{contract, contractclient, contractimpl, Address, BytesN, Env, Symbol};

const INSTANCE_TTL_THRESHOLD: u32 = 30 * 24 * 60 * 60 / 5;
const INSTANCE_TTL_BUMP: u32 = 120 * 24 * 60 * 60 / 5;
const PERSISTENT_TTL_THRESHOLD: u32 = 60 * 24 * 60 * 60 / 5;
const PERSISTENT_TTL_BUMP: u32 = 365 * 24 * 60 * 60 / 5;

#[contractclient(name = "PairRegistryClient")]
pub trait PairRegistryInterface {
    fn assert_pair_active(env: Env, pair_id: Symbol);
}

#[contract]
pub struct SwapAnalytics;

#[contractimpl]
impl SwapAnalytics {
    pub fn __constructor(env: Env, admin: Address, pair_registry: Address) {
        env.storage()
            .instance()
            .set(&types::InstanceKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&types::InstanceKey::Registry, &pair_registry);
        bump_instance(&env);
    }

    /// Records analytics only after a Classic transaction has settled off-contract.
    pub fn record_swap(
        env: Env,
        user: Address,
        transaction_hash: BytesN<32>,
        pair_id: Symbol,
        sent_amount: i128,
        received_amount: i128,
        timestamp: u64,
    ) -> Result<(), Error> {
        user.require_auth();
        if sent_amount <= 0 || received_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = types::DataKey::Swap(user.clone(), transaction_hash.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::DuplicateSwap);
        }
        assert_active(&env, &pair_id);
        let record = SwapRecord {
            user: user.clone(),
            transaction_hash,
            pair_id: pair_id.clone(),
            sent_amount,
            received_amount,
            timestamp,
        };
        env.storage().persistent().set(&key, &record);
        bump_persistent(&env, &key);
        let stats_key = types::DataKey::Stats(user.clone());
        let mut stats: UserStats =
            env.storage()
                .persistent()
                .get(&stats_key)
                .unwrap_or(UserStats {
                    swap_count: 0,
                    total_sent: 0,
                    total_received: 0,
                    favorite_pair: None,
                });
        stats.swap_count = stats
            .swap_count
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
        stats.total_sent = stats
            .total_sent
            .checked_add(sent_amount)
            .ok_or(Error::ArithmeticOverflow)?;
        stats.total_received = stats
            .total_received
            .checked_add(received_amount)
            .ok_or(Error::ArithmeticOverflow)?;
        env.storage().persistent().set(&stats_key, &stats);
        bump_persistent(&env, &stats_key);
        events::swap_recorded(&env, &record);
        Ok(())
    }

    pub fn get_swap(
        env: Env,
        user: Address,
        transaction_hash: BytesN<32>,
    ) -> Result<SwapRecord, Error> {
        let key = types::DataKey::Swap(user, transaction_hash);
        let value = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SwapNotFound)?;
        bump_persistent(&env, &key);
        Ok(value)
    }

    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        let key = types::DataKey::Stats(user);
        let value = env.storage().persistent().get(&key).unwrap_or(UserStats {
            swap_count: 0,
            total_sent: 0,
            total_received: 0,
            favorite_pair: None,
        });
        if env.storage().persistent().has(&key) {
            bump_persistent(&env, &key);
        }
        value
    }

    pub fn set_favorite_pair(env: Env, user: Address, pair_id: Symbol) {
        user.require_auth();
        assert_active(&env, &pair_id);
        let key = types::DataKey::Stats(user.clone());
        let mut stats = Self::get_user_stats(env.clone(), user.clone());
        stats.favorite_pair = Some(pair_id.clone());
        env.storage().persistent().set(&key, &stats);
        bump_persistent(&env, &key);
        events::favorite_changed(&env, &user, &pair_id);
    }

    pub fn get_registry(env: Env) -> Address {
        bump_instance(&env);
        env.storage()
            .instance()
            .get(&types::InstanceKey::Registry)
            .unwrap()
    }

    pub fn set_registry(env: Env, new_registry: Address) {
        require_admin(&env);
        let old = Self::get_registry(env.clone());
        env.storage()
            .instance()
            .set(&types::InstanceKey::Registry, &new_registry);
        events::registry_changed(&env, &old, &new_registry);
        bump_instance(&env);
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

fn assert_active(env: &Env, pair_id: &Symbol) {
    PairRegistryClient::new(env, &SwapAnalytics::get_registry(env.clone()))
        .assert_pair_active(pair_id);
}
fn require_admin(env: &Env) {
    SwapAnalytics::get_admin(env.clone()).require_auth();
}
fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_TTL_THRESHOLD, INSTANCE_TTL_BUMP);
}
fn bump_persistent(env: &Env, key: &types::DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_TTL_THRESHOLD, PERSISTENT_TTL_BUMP);
}

#[cfg(test)]
mod test;
