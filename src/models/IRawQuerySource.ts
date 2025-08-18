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

export interface IRawQuerySourceVM extends IRawQuerySource {
    decorationIds: string[];
    rangeContent: string;
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
