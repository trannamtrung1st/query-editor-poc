export interface IColumn {
  name: string;
  underlyingDataType: string;
  genericDataType: string;
}

export interface IExecuteDataQueryResponse {
  columns: IColumn[];
  records: any[][];
}

// Utility type for table data
export interface ITableRecord {
  [key: string]: any;
}
