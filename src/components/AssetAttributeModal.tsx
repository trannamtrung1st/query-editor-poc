import React, { useEffect } from 'react';
import { Modal, Form, Input, Table } from 'antd';
import type { IRawQuerySource } from '../models/IRawQuerySource';

interface AssetAttributeModalProps {
  visible: boolean;
  onCancel: () => void;
  querySource: IRawQuerySource | null;
}

const AssetAttributeModal: React.FC<AssetAttributeModalProps> = ({
  visible,
  onCancel,
  querySource
}) => {
  const [form] = Form.useForm();

  // Available attribute names for selection
  const availableAttributeNames = [
    'id', 'name', 'temperature', 'humidity', 'pressure',
    'voltage', 'current', 'power', 'frequency', 'status',
    'timestamp', 'quality', 'unit', 'description', 'location'
  ];
  const selectedTarget = querySource?.sourceConfig?.target;

  useEffect(() => {
    if (visible && querySource) {
      // Initialize form with current values
      form.setFieldsValue({
        assetName: querySource.sourceId,
        attributeName: selectedTarget
      });
    }
  }, [visible, querySource, form]);

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      title="Asset Information"
      open={visible}
      onCancel={handleCancel}
      okButtonProps={{ hidden: true }}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ assetName: '', attributeName: '' }}
      >
        <Form.Item
          name="assetName"
          label="Asset Name"
        >
          <Input readOnly placeholder="Enter asset name" />
        </Form.Item>

        {selectedTarget ? (
          <Form.Item
            name="attributeName"
            label="Attribute Name"
          >
            <Input readOnly placeholder="Enter attribute name" />
          </Form.Item>
        ) : (
          <Table
            dataSource={availableAttributeNames.map(name => ({ key: name, name }))}
            columns={[{ title: 'Attribute', dataIndex: 'name', key: 'name' }]}
            pagination={false}
            size="small"
            scroll={{ y: 180 }}
          />
        )}
      </Form>
    </Modal>
  );
};

export default AssetAttributeModal;
