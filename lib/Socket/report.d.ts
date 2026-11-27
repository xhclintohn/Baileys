import type { WAMessage } from '../Types/index.js';
import { type SpamReportOptions, type SpamReportResult, type SpamReportTargetResult } from '../Types/Report.js';
import { type BinaryNode } from '../WABinary/index.js';
export type ReportDeps = {
    query: (node: BinaryNode) => Promise<BinaryNode>;
    meJid?: string;
    updateBlockStatus?: (jid: string, action: 'block' | 'unblock') => Promise<void>;
};
export declare const buildSpamReportNode: (message: WAMessage, options: SpamReportOptions, meJid?: string) => BinaryNode;
export declare const buildTargetReportNode: (jid: string, options?: SpamReportOptions, meJid?: string) => BinaryNode;
export declare const reportSpam: (messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportTarget: (jid: string, deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportTargetResult>;
export declare const reportContact: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportGroup: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportStatus: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportNewsletter: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportChannelStatus: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportEvent: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
export declare const reportAndBlock: (jid: string, messages: WAMessage[], deps: ReportDeps, options?: SpamReportOptions) => Promise<SpamReportResult[]>;
//# sourceMappingURL=report.d.ts.map