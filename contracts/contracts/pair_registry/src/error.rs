use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    PairNotFound = 1,
    PairAlreadyExists = 2,
    EmptyPairId = 3,
    IdenticalAssets = 4,
    InvalidNativeAsset = 5,
    InvalidCreditAsset = 6,
    InvalidSlippage = 7,
    EmptyAssetCode = 8,
    PairInactive = 9,
}
