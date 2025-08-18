import React, { useMemo } from 'react';
import { Card, Input, Select, Button, Table, InputNumber, Switch } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { IDataQueryParam } from '../models/IDataQueryParam';
import type { IDataQueryArgument } from '../models/IDataQueryArgument';
import { GenericDataTypes } from '../constants';

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
  const params = useMemo(() => _arguments.map(a => a.param), [_arguments]);

  const handleAddParam = () => {
    const newKey = (_arguments.length + 1).toString();
    const newParam: IDataQueryParam = {
      id: newKey,
      name: '',
      dataType: GenericDataTypes.Text
    };

    const newArgument: IDataQueryArgument = {
      param: newParam,
      value: undefined
    };
    const newArguments = [..._arguments, newArgument];
    setArguments(newArguments);
  };

  const handleDeleteParam = (id: string) => {
    const index = _arguments.findIndex(p => p.param.id === id);
    if (index !== -1) {
      const newArguments = _arguments.filter((_, i) => i !== index);
      setArguments(newArguments);
    }
  };

  const handleParamChange = (id: string, field: keyof IDataQueryParam, value: any) => {
    const index = params.findIndex(p => p.id === id);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index] = {
        ...newArguments[index],
        param: { ...newArguments[index].param, [field]: value }
      };
      setArguments(newArguments);
    }
  };

  const handleArgumentChange = (id: string, value: any) => {
    const index = _arguments.findIndex(p => p.param.id === id);
    if (index !== -1) {
      const newArguments = [..._arguments];
      newArguments[index] = { ...newArguments[index], value };
      setArguments(newArguments);
    }
  };

  const renderValueInput = (param: IDataQueryParam) => {
    const argument = _arguments.find(p => p.param.id === param.id);
    if (!argument) return null;

    switch (param.dataType) {
      case GenericDataTypes.Text:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.id, e.target.value)}
            placeholder="Enter string value"
            size="small"
          />
        );
      case GenericDataTypes.Int:
        return (
          <InputNumber
            value={argument.value}
            onChange={(value) => handleArgumentChange(param.id, value)}
            placeholder="Enter integer value"
            style={{ width: '100%' }}
            size="small"
          />
        );
      case GenericDataTypes.Double:
        return (
          <InputNumber
            value={argument.value}
            onChange={(value) => handleArgumentChange(param.id, value)}
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
            onChange={(checked) => handleArgumentChange(param.id, checked)}
            size="small"
          />
        );
      case GenericDataTypes.DateTime:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.id, e.target.value)}
            placeholder="yyyy-MM-ddTHH:mm:ss.sssZ"
            size="small"
          />
        );
      default:
        return (
          <Input
            value={argument.value}
            onChange={(e) => handleArgumentChange(param.id, e.target.value)}
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
      render: (text: string, record: IDataQueryParam) => (
        <Input
          value={text}
          onChange={(e) => handleParamChange(record.id, 'name', e.target.value)}
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
      render: (text: string, record: IDataQueryParam) => (
        <Select
          value={text}
          onChange={(value) => {
            handleParamChange(record.id, 'dataType', value);
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
      render: (_: any, record: IDataQueryParam) => renderValueInput(record)
    },
    {
      title: 'Action',
      key: 'action',
      width: 60,
      render: (_: any, record: IDataQueryParam) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleDeleteParam(record.id)}
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
        rowKey="id"
        scroll={{ x: 400, y: 300 }}
        style={{ overflow: 'auto' }}
      />
    </Card>
  );
};

export default DataQueryArgumentPanel;
