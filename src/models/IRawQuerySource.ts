import type { IRange } from "monaco-editor";
import { QuerySource, TimeseriesMode } from "../constants";

export interface IRawQuerySource {
    markup: string;
    range?: IRange; // [NOTE] only when submit create/update
    type: QuerySource;
    sourceId: string;
    sourceIdUuid?: string;
    sourceConfig?: any;
}

export class RawQuerySourceVM implements IRawQuerySource {
    #decorationIds: string[];
    #rangeContent: string;

    markup: string;
    range?: IRange;
    type: QuerySource;
    sourceId: string;
    sourceIdUuid?: string;
    sourceConfig?: any;

    constructor(source: IRawQuerySource, decorationIds: string[], rangeContent: string) {
        this.markup = source.markup;
        this.range = source.range;
        this.type = source.type;
        this.sourceId = source.sourceId;
        this.sourceIdUuid = source.sourceIdUuid;
        this.sourceConfig = source.sourceConfig;
        this.#decorationIds = decorationIds;
        this.#rangeContent = rangeContent;
    }

    get decorationIds() { return this.#decorationIds; }
    set decorationIds(decorationIds: string[]) { this.#decorationIds = decorationIds; }

    get rangeContent() { return this.#rangeContent; }
    set rangeContent(rangeContent: string) { this.#rangeContent = rangeContent; }
}

export const newAssetTableQuerySource = (markup: string, tableId: string): IRawQuerySource => {
    return {
        markup,
        type: QuerySource.ASSET_TABLE,
        sourceId: tableId,
        sourceIdUuid: tableId,
        sourceConfig: {
            tableId
        }
    }
}

export const newTimeseriesQuerySource = (markup: string, assetId: string, attributeName?: string): IRawQuerySource => {
    return {
        markup,
        type: QuerySource.TIMESERIES,
        sourceId: assetId,
        sourceIdUuid: assetId,
        sourceConfig: {
            assetId,
            attributeName,
            mode: attributeName ? TimeseriesMode.SINGLE : TimeseriesMode.MULTIPLE
        }
    }
}
