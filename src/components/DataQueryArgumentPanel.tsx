import React, { useState } from 'react';
import { Card, Input, Select, Button, Table, InputNumber, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { IDataQueryParam } from '../models/IDataQueryParam';
import type { IDataQueryArgument } from '../models/IDataQueryArgument';
import { GenericDataTypes } from '../constants';

interface DataQueryParamWithKey extends IDataQueryParam {
  key: string;
}

interface DataQueryArgumentPanelProps {
  _arguments: IDataQueryArgument[];
  setArguments: (_arguments: IDataQueryArgument[]) => void;
}

// Available data types for selection
const availableDataTypes = [
  { label: 'Text', value: GenericDataTypes.Text },
  { label: 'Integer', value: GenericDataTypes.Int },
  { label: 'Double', value: GenericDataTypes.Double },
  { label: 'Boolean', value: GenericDataTypes.Boolean },
  { label: 'DateTime', value: GenericDataTypes.DateTime }
];

const DataQueryArgumentPanel: React.FC<DataQueryArgumentPanelProps> = ({
  _arguments,
  setArguments
}) => {
  const [params, setParams] = useState<DataQueryParamWithKey[]>([]);

  const handleAddParam = () => {
    const newKey = (params.length + 1).toString();
    const newParam: DataQueryParamWithKey = {
      name: '',
      dataType: GenericDataTypes.Text,
      key: newKey
    };
    const newParams = [...params, newParam];
    setParams(newParams);

    // Create corresponding argument with empty value
    const newArgument: IDataQueryArgument = {
      param: { name: '', dataType: GenericDataTypes.Text },
      value: ''
    };
    const newArguments = [..._arguments, newArgument];
    setArguments(newArguments);
  };

  const handleDeleteParam = (key: string) => {
    const index = params.findIndex(p => p.key === key);
    if (index !== -1) {
      const newParams = params.filter(param => param.key !== key);
      const newArguments = _arguments.filter((_, i) => i !== index);

      setParams(newParams);
      setArguments(newArguments);
    }
  };

  const handleParamChange = (key: string, field: keyof IDataQueryParam, value: any) => {
    const newParams = params.map(param =>
      param.key === key ? { ...param, [field]: value } : param
    );
    setParams(newParams);

    // Update corresponding argument name
    const index = params.findIndex(p => p.key === key);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index] = {
        ...newArguments[index],
        param: { ...newArguments[index].param, [field]: value }
      };
      setArguments(newArguments);
    }
  };

  const handleArgumentChange = (key: string, value: any) => {
    const index = params.findIndex(p => p.key === key);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index] = { ...newArguments[index], value };
      setArguments(newArguments);
    }
  };

  const renderValueInput = (param: DataQueryParamWithKey) => {
    const argument = _arguments[params.findIndex(p => p.key === param.key)];
    if (!argument) return null;

    switch (param.dataType) {
      case GenericDataTypes.Text:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.key, e.target.value)}
            placeholder="Enter string value"
            size="small"
          />
        );
      case GenericDataTypes.Int:
        return (
          <InputNumber
            value={argument.value}
            onChange={(value) => handleArgumentChange(param.key, value)}
            placeholder="Enter integer value"
            style={{ width: '100%' }}
            size="small"
          />
        );
      case GenericDataTypes.Double:
        return (
          <InputNumber
            value={argument.value}
            onChange={(value) => handleArgumentChange(param.key, value)}
            placeholder="Enter float value"
            step={0.01}
            style={{ width: '100%' }}
            size="small"
          />
        );
      case GenericDataTypes.Boolean:
        return (
          <Switch
            checked={argument.value}
            onChange={(checked) => handleArgumentChange(param.key, checked)}
            size="small"
          />
        );
      case GenericDataTypes.DateTime:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.key, e.target.value)}
            placeholder="yyyy-MM-ddTHH:mm:ss.sssZ"
            size="small"
          />
        );
      default:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.key, e.target.value)}
            placeholder="Enter value"
            size="small"
          />
        );
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (text: string, record: DataQueryParamWithKey) => (
        <Input
          value={text}
          onChange={(e) => handleParamChange(record.key, 'name', e.target.value)}
          placeholder="Parameter name"
          size="small"
        />
      )
    },
    {
      title: 'Data Type',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (text: string, record: DataQueryParamWithKey) => (
        <Select
          value={text}
          onChange={(value) => {
            handleParamChange(record.key, 'dataType', value);
          }}
          style={{ width: '100%' }}
          options={availableDataTypes}
          size="small"
        />
      )
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      render: (_: any, record: DataQueryParamWithKey) => renderValueInput(record)
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      render: (_: any, record: DataQueryParamWithKey) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleDeleteParam(record.key)}
        />
      )
    }
  ];

  return (
    <Card
      title="Query Arguments"
      size="small"
      style={{ height: '100%' }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          onClick={handleAddParam}
          icon={<PlusOutlined />}
          style={{ width: '100%' }}
        >
          Add Parameter
        </Button>
      </div>

      <Table
        dataSource={params}
        columns={columns}
        pagination={false}
        size="small"
        rowKey="key"
        scroll={{ x: 400, y: 300 }}
        style={{ overflow: 'auto' }}
      />
    </Card>
  );
};

export default DataQueryArgumentPanel;
