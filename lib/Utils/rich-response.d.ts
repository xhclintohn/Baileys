import type { proto } from '../../WAProto/index.js';
export declare function sendHtml(sockOrJid: any, jidOrHtml: any, htmlOrOpts?: any, maybeOpts?: any): Promise<any>;
export type MarkdownTableOptions = {
    title?: string;
};
export declare const parseMarkdownTables: (markdown: string, options?: MarkdownTableOptions) => proto.IAIRichResponseSubMessage[];
export declare const markdownToAIRichResponse: (markdown: string, options?: MarkdownTableOptions) => proto.IAIRichResponseMessage;
//# sourceMappingURL=rich-response.d.ts.map
