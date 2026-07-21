import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';

StellarWalletsKit.init({
  network: 'TESTNET' as any,
  selectedWalletId: 'freighter',
  modules: [new FreighterModule()],
});

export const kit = StellarWalletsKit;

export async function signTransaction(xdr: string, opts?: { address?: string, networkPassphrase?: string }) {
  try {
    const response = await kit.signTransaction(xdr, {
      address: opts?.address,
      networkPassphrase: opts?.networkPassphrase
    });
    return { signedTxXdr: response.signedTxXdr, error: undefined, signerAddress: response.signerAddress };
  } catch (error: any) {
    return { signedTxXdr: undefined, error: error.message || 'Signature rejected' };
  }
}

export async function getNetwork() {
  try {
    const result = await kit.getNetwork();
    return { network: result.network, networkPassphrase: result.networkPassphrase, error: undefined };
  } catch (e: any) {
    return { network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015', error: undefined };
  }
}

export async function getAddress() {
  try {
    const { address } = await kit.getAddress();
    return { address, error: undefined };
  } catch (e: any) {
    return { address: undefined, error: e.message };
  }
}

