use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    DuplicateSwap = 2,
    SwapNotFound = 3,
    ArithmeticOverflow = 4,
}
