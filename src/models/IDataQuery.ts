import type { IDataQueryParam } from "./IDataQueryParam";
import type { IRawQuerySource } from "./IRawQuerySource";

export interface IDataQuery {
    query: string;
    sources: IRawQuerySource[];
    parameters: IDataQueryParam[];
}