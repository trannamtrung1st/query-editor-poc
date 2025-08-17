import React, { memo } from 'react';
import { Table, Card, Tag, Space, Typography, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { IExecuteDataQueryResponse, ITableRecord } from '../models/IExecuteDataQueryResponse';

const { Title, Text } = Typography;

interface QueryResultTableProps {
    data: IExecuteDataQueryResponse | null;
    loading?: boolean;
}

const QueryResultTable: React.FC<QueryResultTableProps> = ({ data, loading = false }) => {
    if (!data) {
        return null;
    }

    // Transform records to objects with column names as keys
    const tableData: ITableRecord[] = data.records.map((record, index) => {
        const row: ITableRecord = { key: index };
        data.columns.forEach((column, colIndex) => {
            row[column.name] = record[colIndex];
        });
        return row;
    });

    // Generate dynamic columns
    const columns: ColumnsType<ITableRecord> = data.columns.map((column) => ({
        title: (
            <Tooltip title={`Type: ${column.genericDataType} (${column.underlyingDataType})`}>
                <Space direction="vertical" size={0}>
                    <Text strong>{column.name}</Text>
                    <Tag color="blue" style={{ fontSize: '10px', padding: '0 6px' }}>{column.genericDataType}</Tag>
                </Space>
            </Tooltip>
        ),
        dataIndex: column.name,
        key: column.name,
        render: (value: any) => {
            if (value === null || value === undefined) {
                return <Text type="secondary" italic>null</Text>;
            }

            // Format based on data type
            switch (column.genericDataType.toLowerCase()) {
                case 'int':
                case 'integer':
                case 'bigint':
                    return <Text code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>{value}</Text>;
                case 'decimal':
                case 'numeric':
                case 'float':
                case 'double':
                    return <Text code style={{ backgroundColor: '#f0f0f0', padding: '2px 4px', borderRadius: '3px' }}>{Number(value).toLocaleString()}</Text>;
                case 'date':
                case 'datetime':
                case 'timestamp':
                    return <Text style={{ color: '#1890ff' }}>{new Date(value).toLocaleString()}</Text>;
                case 'boolean':
                    return (
                        <Tag color={value ? 'success' : 'error'} style={{ fontWeight: 'bold' }}>
                            {value ? 'true' : 'false'}
                        </Tag>
                    );
                default:
                    return <Text>{String(value)}</Text>;
            }
        },
        sorter: (a, b) => {
            const aVal = a[column.name];
            const bVal = b[column.name];

            if (aVal === null || aVal === undefined) return -1;
            if (bVal === null || bVal === undefined) return 1;

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return aVal - bVal;
            }

            return String(aVal).localeCompare(String(bVal));
        },
        filters: Array.from(new Set(tableData.map(row => row[column.name])))
            .filter(val => val !== null && val !== undefined)
            .map(val => ({ text: String(val), value: val })),
        onFilter: (value, record) => record[column.name] === value,
        ellipsis: true,
        width: 150,
        showSorterTooltip: false
    }));

    return (
        <Card
            title={
                <Space>
                    <Title level={4} style={{ margin: 0, color: '#1e3c72' }}>Query Results</Title>
                    <Tag color="success" style={{ fontWeight: 'bold' }}>{tableData.length} rows</Tag>
                    <Tag color="processing" style={{ fontWeight: 'bold' }}>{data.columns.length} columns</Tag>
                </Space>
            }
            style={{ marginTop: 16 }}
        >
            <Table
                columns={columns}
                dataSource={tableData}
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                        `${range[0]}-${range[1]} of ${total} items`,
                }}
                scroll={{ x: 'max-content' }}
                size="small"
                bordered
                rowKey="key"
                expandable={{
                    expandedRowRender: (record) => (
                        <div style={{ padding: '8px 16px' }}>
                            <Text type="secondary">Row Data:</Text>
                            <pre style={{ marginTop: 8, fontSize: 12 }}>
                                {JSON.stringify(record, null, 2)}
                            </pre>
                        </div>
                    ),
                }}
            />
        </Card>
    );
};

export default memo(QueryResultTable, (prevProps, nextProps) => {
    return prevProps.data === nextProps.data
        && prevProps.loading === nextProps.loading;
});