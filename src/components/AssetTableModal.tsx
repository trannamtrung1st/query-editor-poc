import React, { useEffect } from 'react';
import { Modal, Form, Input, Table } from 'antd';
import type { IDataQuerySourceDto } from '../models/IDataQuerySourceDto';

interface TableColumn {
  name: string;
  dataType: string;
  key: string;
}

interface AssetTableModalProps {
  visible: boolean;
  onCancel: () => void;
  querySource: IDataQuerySourceDto | null;
}

const AssetTableModal: React.FC<AssetTableModalProps> = ({
  visible,
  onCancel,
  querySource
}) => {
  const [form] = Form.useForm();

  // Default table columns (read-only)
  const defaultColumns: TableColumn[] = [
    { name: 'id', dataType: 'int', key: '1' },
    { name: 'name', dataType: 'text', key: '2' },
    { name: 'description', dataType: 'text', key: '3' }
  ];

  useEffect(() => {
    if (visible && querySource) {
      // Initialize form with current table name only
      form.setFieldsValue({
        tableName: querySource.sourceId
      });
    }
  }, [visible, querySource, form]);

  const handleCancel = () => {
    onCancel();
  };

  const columnsConfig = [
    {
      title: 'Column Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      )
    },
    {
      title: 'Data Type',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (text: string) => (
        <span style={{ color: '#1890ff', fontFamily: 'monospace' }}>{text}</span>
      )
    }
  ];

  return (
    <Modal
      title="Table Information"
      open={visible}
      onCancel={handleCancel}
      width={800}
      okButtonProps={{
        hidden: true
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          tableName: '',
          columns: []
        }}
      >
        <Form.Item
          name="tableName"
          label="Table Name"
        >
          <Input readOnly placeholder="Enter table name" />
        </Form.Item>

        <Form.Item
          label="Table Columns (Read-only)"
        >
          <Table
            dataSource={defaultColumns}
            columns={columnsConfig}
            pagination={false}
            size="small"
            rowKey="key"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssetTableModal;
