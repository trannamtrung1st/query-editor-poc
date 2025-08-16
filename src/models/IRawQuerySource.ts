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
