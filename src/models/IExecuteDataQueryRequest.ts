import type { IRawQuerySource } from "./IRawQuerySource";

export interface IExecuteDataQueryRequest {
    query: string;
    sources: IRawQuerySource[];
}
