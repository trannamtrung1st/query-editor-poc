import type { IDataColumn } from "./IDataColumn";

export interface IExecuteDataQueryResponse {
  columns: IDataColumn[];
  records: any[][];
}

// Utility type for table data
export interface ITableRecord {
  [key: string]: any;
}
