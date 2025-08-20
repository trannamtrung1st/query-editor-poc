import type { IRange } from "monaco-editor";
import { QuerySource, TimeseriesMode } from "../constants";

export interface IRawQuerySource {
    markup: string;
    markupRange?: IRange; // [NOTE] only when submit create/update
    sourceType: QuerySource;
    sourceId: string;
    sourceConfig?: any;
}

export class RawQuerySourceVM implements IRawQuerySource {
    #decorationIds: string[];
    #rangeContent: string;

    markup: string;
    markupRange?: IRange;
    sourceType: QuerySource;
    sourceId: string;
    sourceConfig?: any;

    constructor(source: IRawQuerySource, decorationIds: string[], rangeContent: string) {
        this.markup = source.markup;
        this.markupRange = source.markupRange;
        this.sourceType = source.sourceType;
        this.sourceId = source.sourceId;
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
        sourceType: QuerySource.ASSET_TABLE,
        sourceId: tableId,
        sourceConfig: {
            tableId
        }
    }
}

export const newTimeseriesQuerySource = (markup: string, assetId: string, target?: string): IRawQuerySource => {
    return {
        markup,
        sourceType: QuerySource.TIMESERIES,
        sourceId: assetId,
        sourceConfig: {
            assetId,
            target,
            mode: target ? TimeseriesMode.SINGLE : TimeseriesMode.MULTIPLE
        }
    }
}
