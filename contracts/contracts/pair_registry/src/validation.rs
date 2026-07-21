use crate::{AssetInfo, Error, Pair};
use soroban_sdk::{Env, Symbol};

pub(crate) fn validate_pair_id(env: &Env, id: &Symbol) -> Result<(), Error> {
    if id == &Symbol::new(env, "") {
        Err(Error::EmptyPairId)
    } else {
        Ok(())
    }
}
fn validate_asset(asset: &AssetInfo) -> Result<(), Error> {
    if asset.code.len() == 0 {
        return Err(Error::EmptyAssetCode);
    }
    if asset.is_native {
        if asset.issuer.is_some() {
            return Err(Error::InvalidNativeAsset);
        }
    } else if asset.issuer.is_none() {
        return Err(Error::InvalidCreditAsset);
    }
    Ok(())
}
pub(crate) fn validate_pair(env: &Env, pair: &Pair) -> Result<(), Error> {
    validate_pair_id(env, &pair.pair_id)?;
    validate_asset(&pair.base)?;
    validate_asset(&pair.quote)?;
    if pair.base == pair.quote {
        return Err(Error::IdenticalAssets);
    }
    if !(1..=5000).contains(&pair.max_slippage_bps) {
        return Err(Error::InvalidSlippage);
    }
    Ok(())
}
