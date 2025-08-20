import type { IDataQueryArgument } from "./IDataQueryArgument";
import type { IDataQueryParam } from "./IDataQueryParam";
import type { IDataQuerySourceDto } from "./IDataQuerySourceDto";

export interface IExecuteDataQueryRequest {
    query: string;
    sources: IDataQuerySourceDto[];
    parameters: IDataQueryParam[];
    arguments: IDataQueryArgument[];
}
