import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import type { IRawQuerySource } from '../models/IRawQuerySource';

interface AssetAttributeModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (querySource: IRawQuerySource) => void;
  querySource: IRawQuerySource | null;
}

const AssetAttributeModal: React.FC<AssetAttributeModalProps> = ({
  visible,
  onCancel,
  onSave,
  querySource
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Available attribute names for selection
  const availableAttributeNames = [
    'id', 'name', 'temperature', 'humidity', 'pressure',
    'voltage', 'current', 'power', 'frequency', 'status',
    'timestamp', 'quality', 'unit', 'description', 'location'
  ];

  useEffect(() => {
    if (visible && querySource) {
      // Initialize form with current values
      form.setFieldsValue({
        assetName: querySource.sourceId,
        attributeNames: querySource.sourceConfig?.attributeNames || []
      });
    }
  }, [visible, querySource, form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      if (!querySource) return;

      // Create updated query source
      const updatedQuerySource: IRawQuerySource = {
        ...querySource,
        sourceId: values.assetName,
        sourceIdUuid: values.assetName,
        sourceConfig: {
          ...querySource.sourceConfig,
          assetId: values.assetName,
          attributeNames: values.attributeNames
        }
      };

      onSave(updatedQuerySource);
      message.success('Asset attributes updated successfully');
      form.resetFields();
    } catch (error) {
      console.error('Form validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Edit Asset Attributes"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSave}
        >
          Save
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          assetName: '',
          attributeNames: []
        }}
      >
        <Form.Item
          name="assetName"
          label="Asset Name"
          rules={[
            { required: true, message: 'Please enter asset name' },
            { min: 1, message: 'Asset name must be at least 1 character' }
          ]}
        >
          <Input placeholder="Enter asset name" />
        </Form.Item>

        <Form.Item
          name="attributeNames"
          label="Attribute Names"
          rules={[
            { required: true, message: 'Please select at least one attribute' },
            { type: 'array', min: 1, message: 'Please select at least one attribute' }
          ]}
        >
          <Select
            mode="multiple"
            placeholder="Select attribute names"
            options={availableAttributeNames.map(name => ({
              label: name,
              value: name
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AssetAttributeModal;
