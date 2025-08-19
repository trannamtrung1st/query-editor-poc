import React, { useMemo } from 'react';
import { Card, Input, Select, Button, Table, InputNumber, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { DataQueryParamVM } from '../models/IDataQueryParam';
import { DataQueryArgumentVM } from '../models/IDataQueryArgument';
import { GenericDataTypes } from '../constants';

interface DataQueryArgumentPanelProps {
  _arguments: DataQueryArgumentVM[];
  setArguments: (_arguments: DataQueryArgumentVM[]) => void;
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
  const params = useMemo(() => _arguments.map(a => a.parameter), [_arguments]);

  const handleAddParam = () => {
    const newParam = new DataQueryParamVM({ name: '', dataType: GenericDataTypes.Text });
    const newArgument = new DataQueryArgumentVM(newParam);
    const newArguments = [..._arguments, newArgument];
    setArguments(newArguments);
  };

  const handleDeleteParam = (key: string) => {
    const argument = _arguments.find(p => p.parameter.key === key);
    if (argument) {
      const newArguments = _arguments.filter(p => p !== argument);
      setArguments(newArguments);
    }
  };

  const handleParamChange = (key: string, field: keyof DataQueryParamVM, value: any) => {
    const index = _arguments.findIndex(p => p.parameter.key === key);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index].parameter = new DataQueryParamVM({ ...newArguments[index].parameter, [field]: value });
      setArguments(newArguments);
    }
  };

  const handleArgumentChange = (key: string, value: any) => {
    const index = _arguments.findIndex(p => p.parameter.key === key);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index].value = value;
      setArguments(newArguments);
    }
  };

  const renderValueInput = (param: DataQueryParamVM) => {
    const argument = _arguments.find(p => p.parameter.key === param.key);
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
      render: (text: string, record: DataQueryParamVM) => (
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
      render: (text: string, record: DataQueryParamVM) => (
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
      render: (_: any, record: DataQueryParamVM) => renderValueInput(record)
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      render: (_: any, record: DataQueryParamVM) => (
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
      styles={{ body: { padding: '12px' } }}
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
