import { proto } from '../../WAProto/index.js';
import type { PaymentInviteOptions, PaymentResult, RequestPaymentOptions, SendPaymentOptions } from '../Types/index.js';
import type { WAMessageKey } from '../Types/index.js';
export type PaymentDeps = {
    relayMessage: (jid: string, message: proto.IMessage, opts: {
        messageId: string;
    }) => Promise<unknown>;
    userJid?: string;
    meJid?: string;
};
export declare const requestPayment: (jid: string, options: RequestPaymentOptions, deps: PaymentDeps) => Promise<PaymentResult>;
export declare const sendPayment: (jid: string, options: SendPaymentOptions, deps: PaymentDeps) => Promise<PaymentResult>;
export declare const declinePaymentRequest: (jid: string, requestMessageKey: WAMessageKey, deps: PaymentDeps) => Promise<PaymentResult>;
export declare const cancelPaymentRequest: (jid: string, requestMessageKey: WAMessageKey, deps: PaymentDeps) => Promise<PaymentResult>;
export declare const sendPaymentInvite: (jid: string, options: PaymentInviteOptions | undefined, deps: PaymentDeps) => Promise<PaymentResult>;
//# sourceMappingURL=payment.d.ts.map
