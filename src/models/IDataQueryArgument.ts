import { DataQueryParamVM } from "./IDataQueryParam";

export interface IDataQueryArgument {
    paramName: string;
    value: any;
}

export class DataQueryArgumentVM implements IDataQueryArgument {
    #parameter: DataQueryParamVM;

    paramName: string;
    value: any;

    constructor(parameter: DataQueryParamVM) {
        this.#parameter = parameter;
        this.paramName = parameter.name;
    }

    get parameter() { return this.#parameter; }

    set parameter(parameter: DataQueryParamVM) {
        this.#parameter = parameter;
        this.paramName = parameter.name;
    }
}