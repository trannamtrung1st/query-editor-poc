import React from 'react';
import { Modal, Input, notification } from 'antd';
import type { IDataQuery } from '../models/IDataQuery';

interface JsonModelModalProps {
  visible: boolean;
  onCancel: () => void;
  onLoad: (model: IDataQuery) => void;
}

const JsonModelModal: React.FC<JsonModelModalProps> = ({
  visible,
  onCancel,
  onLoad
}) => {
  const [jsonModelInput, setJsonModelInput] = React.useState('');

  const handleOk = async () => {
    try {
      if (!jsonModelInput.trim()) {
        notification.error({
          message: 'Invalid Input',
          description: 'Please enter a valid JSON model',
          duration: 4,
        });
        return;
      }

      const model: IDataQuery = JSON.parse(jsonModelInput);

      // Validate the model structure
      if (!model.query || !model.sources || !model.parameters) {
        notification.error({
          message: 'Invalid Model',
          description: 'JSON model must contain query, sources, and parameters',
          duration: 4,
        });
        return;
      }

      // Call the parent's onLoad function
      onLoad(model);

      notification.success({
        message: 'JSON Model Loaded',
        description: 'Model loaded successfully. Note: Visual decorations may need manual reconstruction.',
        duration: 4,
      });

      // Reset and close
      setJsonModelInput('');
    } catch (error) {
      notification.error({
        message: 'JSON Parse Error',
        description: 'Please enter valid JSON format',
        duration: 4,
      });
    }
  };

  const handleCancel = () => {
    setJsonModelInput('');
    onCancel();
  };

  return (
    <Modal
      title="Load JSON Model"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      width={600}
      okText="Load Model"
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <p>Please paste your JSON model below:</p>
      </div>
      <Input.TextArea
        value={jsonModelInput}
        onChange={(e) => setJsonModelInput(e.target.value)}
        placeholder="Paste your JSON model here..."
        rows={12}
        style={{ fontFamily: 'monospace' }}
      />
    </Modal>
  );
};

export default JsonModelModal;
