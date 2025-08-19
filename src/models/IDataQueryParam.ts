import { uniqueId } from "lodash";

export interface IDataQueryParam {
    name: string;
    dataType: string;
    defaultValue?: any;
}

export class DataQueryParamVM implements IDataQueryParam {
    readonly #key: string;
    name: string;
    dataType: string;
    defaultValue?: any;

    constructor(param: IDataQueryParam) {
        this.#key = uniqueId();
        this.name = param.name;
        this.dataType = param.dataType;
        this.defaultValue = param.defaultValue;
    }

    get key() { return this.#key; }
}