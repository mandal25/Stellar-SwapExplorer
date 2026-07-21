import { StellarWalletsKit, allowAllModules, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';

export const kit = new StellarWalletsKit({
  network: 'TESTNET' as any,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
});

export async function signTransaction(xdr: string, opts?: { address?: string, networkPassphrase?: string }) {
  try {
    const response = await kit.signTx({
      xdr,
      publicKeys: opts?.address ? [opts.address] : undefined,
      network: 'TESTNET' as any
    });
    return { signedTxXdr: (response as any).signedXDR || (response as any).result || response, error: undefined, signerAddress: opts?.address };
  } catch (error: any) {
    return { signedTxXdr: undefined, error: error.message || 'Signature rejected' };
  }
}

export async function getNetwork() {
  return { network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015', error: undefined };
}

export async function getAddress() {
  try {
    const { address } = await kit.getAddress();
    return { address, error: undefined };
  } catch (e: any) {
    return { address: undefined, error: e.message };
  }
}

