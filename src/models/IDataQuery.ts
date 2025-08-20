import type { IDataQueryParam } from "./IDataQueryParam";
import type { IDataQuerySourceDto } from "./IDataQuerySourceDto";

export interface IDataQuery {
    query: string;
    sources: IDataQuerySourceDto[];
    parameters: IDataQueryParam[];
}