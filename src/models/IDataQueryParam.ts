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

    constructor(key: string, name: string, dataType: string, defaultValue?: any) {
        this.#key = key;
        this.name = name;
        this.dataType = dataType;
        this.defaultValue = defaultValue;
    }

    get key() { return this.#key; }

    clone() {
        return new DataQueryParamVM(this.#key, this.name, this.dataType, this.defaultValue);
    }

    static from(param: IDataQueryParam) {
        return DataQueryParamVM.new(param.name, param.dataType, param.defaultValue);
    }

    static new(name: string, dataType: string, defaultValue?: any) {
        return new DataQueryParamVM(uniqueId(), name, dataType, defaultValue);
    }
}