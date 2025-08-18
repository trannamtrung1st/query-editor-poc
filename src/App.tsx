import { useRef, useState } from 'react'
import Editor, { useMonaco, type Monaco } from '@monaco-editor/react'
import { editor as MonacoEditor } from 'monaco-editor';
import './App.css'
import { APP_DECORATION_PREFIX, DEFAULT_ATTRIBUTE_NAMES, DEFAULT_UUID, QuerySource } from './constants';
import { debounce, uniqueId } from 'lodash';
import { newAssetTableQuerySource, newTimeseriesQuerySource, type IRawQuerySourceVM } from "./models/IRawQuerySource";
import type { IExecuteDataQueryResponse } from './models/IExecuteDataQueryResponse';
import QueryResultTable from './components/QueryResultTable';
import AssetAttributeModal from './components/AssetAttributeModal';
import AssetTableModal from './components/AssetTableModal';
import DataQueryArgumentPanel from './components/DataQueryArgumentPanel';
import type { IDataQueryArgument } from './models/IDataQueryArgument';
import { Button, notification } from 'antd';
import HiddenConvertEditor, { type IHiddenConvertCommand, type IHiddenConvertResult } from './components/HiddenConvertEditor';

const { TrackedRangeStickiness } = MonacoEditor;

type DecorationSourceRef = {
  [key: string]: IRawQuerySourceVM
}

type QuerySourceRef = {
  [key: string]: IRawQuerySourceVM;
}

function App() {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco()!;
  const decorationsSourceRef = useRef<DecorationSourceRef>({});
  const querySourcesRef = useRef<QuerySourceRef>({});
  const [noti, contextHolder] = notification.useNotification();

  const [sqlQuery, setSqlQuery] = useState(``)
  const [queryResults, setQueryResults] = useState<IExecuteDataQueryResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAssetModalVisible, setIsAssetModalVisible] = useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [selectedQuerySource, setSelectedQuerySource] = useState<IRawQuerySourceVM | null>(null);
  const [queryArguments, setQueryArguments] = useState<IDataQueryArgument[]>([]);

  const _removeAffectedSources = (ev: MonacoEditor.IModelContentChangedEvent) => {
    const editor = editorRef.current!;
    const model = editor.getModel()!;
    ev.changes.forEach(change => {
      const changedRange = new monaco.Range(change.range.startLineNumber, change.range.startColumn, change.range.endLineNumber, change.range.endColumn);
      const affectedSources = (editor.getDecorationsInRange(changedRange) || [])
        .filter(d => d.options?.inlineClassName?.startsWith(APP_DECORATION_PREFIX))
        .map(d => {
          const querySource = decorationsSourceRef.current[d.id];
          const range = model.getDecorationRange(querySource.decorationIds[0])!;
          const currentRangeContent = model.getValueInRange(range);
          return { querySource, currentRangeContent };
        })
        .filter(({ querySource, currentRangeContent }) => querySource.rangeContent !== currentRangeContent);

      if (affectedSources.length) {
        affectedSources.forEach(source => {
          const sourceRef = querySourcesRef.current[source.querySource.markup];
          if (!sourceRef) return;
          editor.removeDecorations(sourceRef.decorationIds);
          sourceRef.decorationIds.forEach(decorationId => delete decorationsSourceRef.current[decorationId]);
          delete querySourcesRef.current[source.querySource.markup];
        });
      }
    });
  }

  const componentRef = useRef<{
    hiddenConvert: (command: IHiddenConvertCommand) => Promise<IHiddenConvertResult>;
    _removeAffectedSources: typeof _removeAffectedSources;
    removeAffectedSources: typeof _removeAffectedSources;
  }>({
    hiddenConvert: async () => ({ query: '', sourceRangeMap: {} }),
    _removeAffectedSources,
    removeAffectedSources: debounce((ev) => componentRef.current._removeAffectedSources(ev), 100)
  });
  componentRef.current._removeAffectedSources = _removeAffectedSources;

  const handleEditorChange = (value: string | undefined, ev: MonacoEditor.IModelContentChangedEvent) => {
    // console.log(ev);
    componentRef.current.removeAffectedSources(ev);
    if (value !== undefined)
      setSqlQuery(value)
  }

  const handleClickQuerySource = (querySource: IRawQuerySourceVM) => {
    // console.log('Clicked on a clickable decoration:', querySource);
    setSelectedQuerySource(querySource);

    switch (querySource.type) {
      case QuerySource.ASSET_TABLE:
        setIsTableModalVisible(true);
        break;
      case QuerySource.TIMESERIES:
        setIsAssetModalVisible(true);
        break;
    }
  }

  const handleEditorDidMount = (editor: MonacoEditor.IStandaloneCodeEditor, _: Monaco) => {
    editorRef.current = editor;
    const model = editor.getModel()!;
    editor.onMouseDown((e) => {
      if (
        !('detail' in e.target)
        || typeof e.target.detail !== 'object' || !('injectedText' in e.target.detail)
        || !e.target.range
      ) return;

      const classList = e.target.element?.classList;
      const hasAppClass = classList && Array.from(classList).some(c => c.startsWith(APP_DECORATION_PREFIX));
      if (!hasAppClass) return;

      const decoration = model.getDecorationsInRange(e.target.range)
        ?.find(d => d.options?.inlineClassName?.startsWith(APP_DECORATION_PREFIX)
          && d?.options?.after?.attachedData);

      const attachedData = decoration?.options?.after?.attachedData as IRawQuerySourceVM;
      if (!attachedData) return;

      handleClickQuerySource(attachedData);
    });
  }

  const onInsertTable = (tableName: string, tableId: string) => () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const SQL_TABLE_NAME = `"${tableName}"`;
    // Execute the edit to insert the table name
    editor.executeEdits('insert-table', [{
      range: selection,
      text: SQL_TABLE_NAME,
      forceMoveMarkers: true
    }]);

    // After inserting, create decoration to highlight the inserted text
    const insertedRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + SQL_TABLE_NAME.length
    );

    // [IMPORTANT] must reconstruct range after loading query from BE, so range is tracked automatically
    const decorationIds: string[] = [];
    const querySource = {
      ...newAssetTableQuerySource(uniqueId('markup_'), tableId),
      decorationIds,
      rangeContent: SQL_TABLE_NAME
    };
    querySourcesRef.current[querySource.markup] = querySource;

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-table-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `**Table:** ${tableName}\n\n**Columns:**\n- id (int)\n- name (text)\n- description (text)`
          },
          after: {
            attachedData: querySource,
            content: ''
          }
        }
      }
    ]);

    const range = decorations.getRange(0);
    if (range) {
      const decorationId = (decorations as any)._decorationIds[0];
      decorationIds.push(decorationId);
      decorationsSourceRef.current[decorationId] = querySource;
    }

    editor.focus();
    // console.log('Table name inserted and highlighted:', tableName, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const onInsertAssetTimeseries = () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const ASSET_NAME = `asset_1`;
    const SQL_ASSET_NAME = `"${ASSET_NAME}"`;
    // Execute the edit to insert the table name
    editor.executeEdits('insert-asset', [{
      range: selection,
      text: SQL_ASSET_NAME,
      forceMoveMarkers: true
    }]);

    // After inserting, create decoration to highlight the inserted text
    const insertedRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length
    );

    // [IMPORTANT] must reconstruct range after loading query from BE, so range is tracked automatically
    const decorationIds: string[] = [];
    const querySource = {
      ...newTimeseriesQuerySource(uniqueId('markup_'), DEFAULT_UUID),
      decorationIds,
      rangeContent: SQL_ASSET_NAME
    };
    querySourcesRef.current[querySource.markup] = querySource;

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value:
              `**Asset:** ${ASSET_NAME}`
              + '\n\n**Attribute**: temperature, humidity, pressure'
              + '\n\n**Parent**: Level 1 / Level 2'
          },
          after: {
            attachedData: querySource,
            content: ''
          }
        }
      }
    ]);

    const range = decorations.getRange(0);
    if (range) {
      const decorationId = (decorations as any)._decorationIds[0];
      decorationIds.push(decorationId);
      decorationsSourceRef.current[decorationId] = querySource;
    }

    editor.focus();
    // console.log('Asset timeseries inserted and highlighted:', ASSET_NAME, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const onInsertSingleTimeseries = () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const ASSET_NAME = `asset_1`;
    const ATTRIBUTE_NAME = DEFAULT_ATTRIBUTE_NAMES[2];
    const SQL_ASSET_NAME = `"${ASSET_NAME}"`;
    const SQL_ATTRIBUTE_NAME = `"${ATTRIBUTE_NAME}"`;
    const INSERT_TEXT = SQL_ASSET_NAME + '.' + SQL_ATTRIBUTE_NAME;
    // Execute the edit to insert the table name
    editor.executeEdits('insert-asset-attribute', [{
      range: selection,
      text: INSERT_TEXT,
      forceMoveMarkers: true
    }]);

    // After inserting, create decoration to highlight the inserted text
    const insertedRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + INSERT_TEXT.length
    );

    const assetRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length
    );

    const dotRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length,
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length + 1
    );

    const attributeRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length + 1,
      selection.startLineNumber,
      selection.startColumn + INSERT_TEXT.length
    );

    // [IMPORTANT] must reconstruct range after loading query from BE, so range is tracked automatically
    const decorationIds: string[] = [];
    const querySource = {
      ...newTimeseriesQuerySource(uniqueId('markup_'), DEFAULT_UUID, ATTRIBUTE_NAME),
      decorationIds,
      rangeContent: INSERT_TEXT
    };
    querySourcesRef.current[querySource.markup] = querySource;

    const hoverMessage = {
      value:
        `**Asset:** ${ASSET_NAME}`
        + `\n\n**Attribute**: ${ATTRIBUTE_NAME}`
        + '\n\n**Parent**: Level 1 / Level 2'
    };

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-container`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          after: {
            attachedData: querySource,
            content: ''
          }
        }
      },
      {
        range: assetRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage
        }
      },
      {
        range: dotRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-dot`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      },
      {
        range: attributeRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-attribute-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage
        }
      }
    ]);

    const ranges = decorations.getRanges();
    if (ranges) {
      ranges.forEach((_, index) => {
        const decorationId = (decorations as any)._decorationIds[index];
        decorationIds.push(decorationId);
        decorationsSourceRef.current[decorationId] = querySource;
      });
    }

    editor.focus();
    // console.log('Asset timeseries inserted and highlighted:', ASSET_NAME, ATTRIBUTE_NAME, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const getConvertedQuery = async () => {
    const model = editorRef.current!.getModel()!;
    const sources = Object.values(querySourcesRef.current);
    const decorations = model.getAllDecorations();
    const decorationsMap: { [key: string]: MonacoEditor.IModelDecoration } = {};
    decorations.forEach(d => decorationsMap[d.id] = d);

    const { query, sourceRangeMap } = await componentRef.current.hiddenConvert({
      decorationsMap,
      sources,
      query: sqlQuery
    });

    sources.forEach(source => {
      const range = sourceRangeMap[source.markup];
      if (range) source.range = range;
    });

    return { query, sources };
  }

  const onCopyConvertedQuery = async () => {
    const { query } = await getConvertedQuery();
    // console.log('Converted query:', query);
    navigator.clipboard.writeText(query);
  }

  const onExecuteQuery = async () => {
    try {
      setIsExecuting(true);
      setQueryResults(null);

      const { query, sources } = await getConvertedQuery();
      const _arguments = convertArgumentsToDict(queryArguments);
      const requestBody: any = { query, sources, arguments: _arguments };

      const response = await fetch('http://localhost:5053/dqry/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Query executed:', data);
        const queryResponse = data as IExecuteDataQueryResponse;
        setQueryResults(queryResponse);

        noti.success({
          message: 'Query Executed Successfully',
          description: `Retrieved ${queryResponse.records.length} rows with ${queryResponse.columns.length} columns`,
          duration: 4,
        });
      } else {
        console.error('Query execution failed:', data);
        setQueryResults(null);

        noti.error({
          message: 'Query Execution Failed',
          description: data.message || 'An error occurred while executing the query',
          duration: 6,
        });
      }
    } catch (error) {
      console.error('Query execution error:', error);
      setQueryResults(null);

      noti.error({
        message: 'Query Execution Error',
        description: 'Network error or server unavailable',
        duration: 6,
      });
    } finally {
      setIsExecuting(false);
    }
  }

  const handleAssetModalCancel = () => {
    setIsAssetModalVisible(false);
    setSelectedQuerySource(null);
  };

  const handleTableModalCancel = () => {
    setIsTableModalVisible(false);
    setSelectedQuerySource(null);
  };

  const convertArgumentsToDict = (arguments_: IDataQueryArgument[]): Record<string, any> => {
    const argumentsObj: Record<string, IDataQueryArgument> = {};

    arguments_
      .filter(arg => arg.param.name.trim() && arg.value !== null && arg.value !== undefined && arg.value !== '')
      .forEach(arg => {
        argumentsObj[arg.param.name.trim()] = arg;
      });

    return argumentsObj;
  };

  return (
    <div className="app">
      {contextHolder}
      <main className="editor-container">
        <div className="query-info">
          <h3>Query Builder</h3>
          <div className='btn-group flex flex-col gap-2'>
            <Button onClick={onInsertTable('table_1', DEFAULT_UUID)} type='primary'>
              ✨ Insert Table
            </Button>
            <Button onClick={onInsertAssetTimeseries} type='primary'>
              ✨ Insert Timeseries (Multiple)
            </Button>
            <Button onClick={onInsertSingleTimeseries} type='primary'>
              ✨ Insert Timeseries (Single)
            </Button>
            <Button onClick={onInsertTable('table_2', 'e2d4d7fe-9722-44df-b8a2-500acc8c7101')} type='primary'>
              ✨ Insert Invalid Table
            </Button>
            <Button onClick={onCopyConvertedQuery} type='primary'>
              ✨ Copy Converted Query
            </Button>
            <Button onClick={onExecuteQuery} disabled={isExecuting} type='primary'>
              {isExecuting ? '⏳ Executing...' : '✨ Execute Query'}
            </Button>
          </div>
        </div>

        <div className="editor-wrapper">
          <Editor
            height="100%"
            defaultLanguage="sql"
            defaultValue={sqlQuery}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: {
                enabled: true
              },
              suggest: {
                showKeywords: true,
                showSnippets: true,
                showFunctions: true,
                showVariables: true,
                showClasses: true,
                showModules: true,
                showProperties: true,
                showEvents: true,
                showOperators: true,
                showUnits: true,
                showValues: true,
                showConstants: true,
                showEnums: true,
                showEnumMembers: true,
                showColors: true,
                showFiles: true,
                showReferences: true,
                showFolders: true,
                showTypeParameters: true,
                showWords: true,
                showUsers: true,
                showIssues: true
              }
            }}
          />
        </div>

        <div className="query-params">
          <DataQueryArgumentPanel
            _arguments={queryArguments}
            setArguments={setQueryArguments}
          />
        </div>
      </main>

      {/* Query Results Table */}
      <QueryResultTable
        data={queryResults}
        loading={isExecuting}
      />

      {/* Asset Attribute Modal */}
      <AssetAttributeModal
        visible={isAssetModalVisible}
        onCancel={handleAssetModalCancel}
        querySource={selectedQuerySource}
      />

      {/* Asset Table Modal */}
      <AssetTableModal
        visible={isTableModalVisible}
        onCancel={handleTableModalCancel}
        querySource={selectedQuerySource}
      />

      <HiddenConvertEditor parentRef={componentRef.current} />
    </div>
  )
}

export default App
