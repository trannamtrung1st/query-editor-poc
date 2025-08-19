import type { IDataQueryParam } from "./IDataQueryParam";

export interface IDataQueryArgument {
    parameterName: string;
    value: any;
}

export class DataQueryArgumentVM implements IDataQueryArgument {
    #parameter: IDataQueryParam;

    parameterName: string;
    value: any;

    constructor(parameter: IDataQueryParam) {
        this.#parameter = parameter;
        this.parameterName = parameter.name;
    }

    get parameter() { return this.#parameter; }

    set parameter(parameter: IDataQueryParam) {
        this.#parameter = parameter;
        this.parameterName = parameter.name;
    }
}