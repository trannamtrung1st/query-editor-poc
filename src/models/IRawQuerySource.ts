import { QuerySource } from "../constants";

export interface IRawQuerySource {
    markup: string;
    type: QuerySource;
    sourceId: string;
    sourceIdUuid?: string;
    sourceConfig?: any;
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

export const newTimeseriesQuerySource = (markup: string, assetId: string, attributeNames: string[]): IRawQuerySource => {
    return {
        markup,
        type: QuerySource.TIMESERIES,
        sourceId: assetId,
        sourceIdUuid: assetId,
        sourceConfig: {
            assetId,
            attributeNames
        }
    }
}
