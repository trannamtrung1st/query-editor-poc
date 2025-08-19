import type { IDataQueryArgument } from "./IDataQueryArgument";
import type { IDataQueryParam } from "./IDataQueryParam";
import type { IRawQuerySource } from "./IRawQuerySource";

export interface IExecuteDataQueryRequest {
    query: string;
    sources: IRawQuerySource[];
    parameters: IDataQueryParam[];
    arguments: IDataQueryArgument[];
}
