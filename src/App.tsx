import { useRef, useState } from 'react'
import Editor, { useMonaco, type Monaco } from '@monaco-editor/react'
import { editor as MonacoEditor, type IRange } from 'monaco-editor';
import './App.css'
import { APP_DECORATION_PREFIX, APP_MAIN_DECORATION, DEFAULT_ATTRIBUTE_NAMES, DEFAULT_UUID, QuerySource, TimeseriesMode } from './constants';
import { debounce, uniqueId } from 'lodash';
import { newAssetTableQuerySource, newTimeseriesQuerySource, type IDataQuerySourceDto, DataQuerySourceVM } from "./models/IDataQuerySourceDto";
import type { IExecuteDataQueryResponse } from './models/IExecuteDataQueryResponse';
import QueryResultTable from './components/QueryResultTable';
import AssetAttributeModal from './components/AssetAttributeModal';
import AssetTableModal from './components/AssetTableModal';
import DataQueryArgumentPanel from './components/DataQueryArgumentPanel';
import { DataQueryArgumentVM } from './models/IDataQueryArgument';
import { Button, notification } from 'antd';
import JsonModelModal from './components/JsonModelModal';
import HiddenConvertEditor, { type IHiddenConvertEditorRef } from './components/HiddenConvertEditor';
import type { IDataQuery } from './models/IDataQuery';
import { DataQueryParamVM } from './models/IDataQueryParam';
import type { IExecuteDataQueryRequest } from './models/IExecuteDataQueryRequest';

const { TrackedRangeStickiness } = MonacoEditor;

type QuerySourceRef = {
  [key: string]: DataQuerySourceVM;
}

function App() {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco()!;
  const querySourcesRef = useRef<QuerySourceRef>({});
  const hiddenEditorRef = useRef<IHiddenConvertEditorRef>(null);
  const [noti, contextHolder] = notification.useNotification();

  const [queryResults, setQueryResults] = useState<IExecuteDataQueryResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAssetModalVisible, setIsAssetModalVisible] = useState(false);
  const [isTableModalVisible, setIsTableModalVisible] = useState(false);
  const [selectedQuerySource, setSelectedQuerySource] = useState<DataQuerySourceVM | null>(null);
  const [queryArguments, setQueryArguments] = useState<DataQueryArgumentVM[]>([]);
  const [isJsonModelModalVisible, setIsJsonModelModalVisible] = useState(false);

  const _removeAffectedSources = (ev: MonacoEditor.IModelContentChangedEvent) => {
    const editor = editorRef.current!;
    const model = editor.getModel()!;
    ev.changes.forEach(change => {
      const lineCount = change.text?.split('\n').length + 1 || 1;
      const hasMoreLines = change.range.endLineNumber - change.range.startLineNumber + 1 < lineCount;
      const endLineNumber = hasMoreLines ? lineCount + 1 : change.range.endLineNumber;
      const endColumn = hasMoreLines ? 0 : change.range.endColumn;
      const decorations = model.getDecorationsInRange(new monaco.Range(
        change.range.startLineNumber,
        change.range.startColumn,
        endLineNumber,
        endColumn
      ));

      const affectedSources = decorations
        .filter(d => d.options?.inlineClassName?.startsWith(APP_MAIN_DECORATION))
        .map(d => {
          const querySource = d.options?.after?.attachedData as DataQuerySourceVM;
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
          delete querySourcesRef.current[source.querySource.markup];
        });
      }
    });
  }

  const componentRef = useRef<{
    _removeAffectedSources: typeof _removeAffectedSources;
    removeAffectedSources: typeof _removeAffectedSources;
  }>({
    _removeAffectedSources,
    removeAffectedSources: debounce((ev) => componentRef.current._removeAffectedSources(ev), 100)
  });
  componentRef.current._removeAffectedSources = _removeAffectedSources;

  const handleEditorChange = (_: string | undefined, ev: MonacoEditor.IModelContentChangedEvent) => {
    // console.log(ev);
    componentRef.current.removeAffectedSources(ev);
  }

  const handleClickQuerySource = (querySource: DataQuerySourceVM) => {
    // console.log('Clicked on a clickable decoration:', querySource);
    setSelectedQuerySource(querySource);

    switch (querySource.sourceType) {
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
      const hasAppClass = classList && Array.from(classList).includes(APP_MAIN_DECORATION);
      if (!hasAppClass) return;

      const decoration = model.getDecorationsInRange(e.target.range)
        ?.find(d => d.options?.inlineClassName?.startsWith(APP_MAIN_DECORATION));

      const attachedData = decoration?.options?.after?.attachedData as DataQuerySourceVM;
      if (!attachedData) return;

      handleClickQuerySource(attachedData);
    });
  }

  const onInsertTable = (args: { selection: IRange | null, source?: IDataQuerySourceDto, tableName?: string, tableId?: string }) => () => {
    let { selection, source, tableName, tableId } = args;
    const editor = editorRef.current!;
    selection ??= editor.getSelection();
    if (!selection) return;

    tableId ??= source?.sourceId ?? DEFAULT_UUID;
    tableName ??= tableId === DEFAULT_UUID ? 'table_1' : 'table_2';
    const markup = source?.markup ?? uniqueId('markup_');
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
    const querySource = new DataQuerySourceVM(
      source ?? newAssetTableQuerySource(markup, tableId),
      decorationIds,
      SQL_TABLE_NAME
    );
    querySourcesRef.current[querySource.markup] = querySource;

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_MAIN_DECORATION} ${APP_DECORATION_PREFIX}asset-table-tag`,
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
    }

    editor.focus();
    // console.log('Table name inserted and highlighted:', tableName, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const onInsertAssetTimeseries = (args: { selection: IRange | null, source?: IDataQuerySourceDto }) => () => {
    let { selection, source } = args;
    const editor = editorRef.current!;
    selection ??= editor.getSelection();
    if (!selection) return;

    const assetId = source?.sourceId ?? DEFAULT_UUID;
    const assetName = assetId === DEFAULT_UUID ? 'asset_1' : 'asset_2';
    const markup = source?.markup ?? uniqueId('markup_');
    const SQL_ASSET_NAME = `"${assetName}"`;

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
    const querySource = new DataQuerySourceVM(
      source ?? newTimeseriesQuerySource(markup, assetId),
      decorationIds,
      SQL_ASSET_NAME
    );
    querySourcesRef.current[querySource.markup] = querySource;

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_MAIN_DECORATION} ${APP_DECORATION_PREFIX}asset-timeseries-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value:
              `**Asset:** ${assetName}`
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
    }

    editor.focus();
    // console.log('Asset timeseries inserted and highlighted:', assetName, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const onInsertSingleTimeseries = (args: { selection: IRange | null, source?: IDataQuerySourceDto }) => () => {
    let { selection, source } = args;
    const editor = editorRef.current!;
    selection ??= editor.getSelection();
    if (!selection) return;

    const assetId = source?.sourceId ?? DEFAULT_UUID;
    const assetName = assetId === DEFAULT_UUID ? 'asset_1' : 'asset_2';
    const target = source?.sourceConfig?.target ?? DEFAULT_ATTRIBUTE_NAMES[2];
    const markup = source?.markup ?? uniqueId('markup_');
    const SQL_ASSET_NAME = `"${assetName}"`;
    const SQL_TARGET = `"${target}"`;
    const INSERT_TEXT = SQL_ASSET_NAME + '.' + SQL_TARGET;

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
    const querySource = new DataQuerySourceVM(
      source ?? newTimeseriesQuerySource(markup, assetId, target),
      decorationIds,
      INSERT_TEXT
    );
    querySourcesRef.current[querySource.markup] = querySource;

    const hoverMessage = {
      value:
        `**Asset:** ${assetName}`
        + `\n\n**Attribute**: ${target}`
        + '\n\n**Parent**: Level 1 / Level 2'
    };

    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_MAIN_DECORATION} ${APP_DECORATION_PREFIX}asset-timeseries-container`,
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
      });
    }

    editor.focus();
    // console.log('Asset timeseries inserted and highlighted:', assetName, target, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const getConvertedQuery = async () => {
    const hiddenEditor = hiddenEditorRef.current;
    if (!hiddenEditor) throw new Error('Hidden editor not mounted');

    const model = editorRef.current!.getModel()!;
    const sources = Object.values(querySourcesRef.current);
    const decorations = model.getAllDecorations();
    const decorationsMap: { [key: string]: MonacoEditor.IModelDecoration } = {};
    decorations.forEach(d => decorationsMap[d.id] = d);
    const sourceDecorations = sources.map(source => ({
      source, decoration: decorationsMap[source.decorationIds[0]]
    }));

    const { query, sourceRangeMap } = await hiddenEditor.hiddenConvert({
      sourceDecorations,
      query: model.getValue()
    });

    sources.forEach(source => {
      const range = sourceRangeMap[source.markup];
      if (range) source.markupRange = range;
    });

    return { query, sources };
  }

  const onLoadJsonModel = async () => {
    setIsJsonModelModalVisible(true);
  }

  const handleJsonModelLoad = (queryModel: IDataQuery) => {
    const { query, sources, parameters } = queryModel;
    setQueryArguments(parameters.map(param => new DataQueryArgumentVM(DataQueryParamVM.from(param))));

    const editor = editorRef.current!;
    const model = editor.getModel()!;
    console.log(sources);

    const oldDecorations = model.getAllDecorations();
    editor.removeDecorations(oldDecorations.map(d => d.id));
    model.setValue(query);

    const trackingDecorations = editor.createDecorationsCollection(sources.map(source => ({ range: source.markupRange!, options: {} })));
    const decorationIds: string[] = (trackingDecorations as any)._decorationIds;
    const sourceTrackingDecorationMap: { [key: string]: string } = {};
    sources.forEach((source, index) => {
      sourceTrackingDecorationMap[source.markup] = decorationIds[index];
    });

    sources.forEach(source => {
      const decorationId = sourceTrackingDecorationMap[source.markup];
      const range = model.getDecorationRange(decorationId);
      if (!range) return;

      switch (source.sourceType) {
        case QuerySource.ASSET_TABLE:
          onInsertTable({ selection: range, source })();
          break;
        case QuerySource.TIMESERIES:
          if (source.sourceConfig?.mode === TimeseriesMode.SINGLE) {
            onInsertSingleTimeseries({ selection: range, source })();
          } else {
            onInsertAssetTimeseries({ selection: range, source })();
          }
          break;
      }
    });

    editor.removeDecorations(decorationIds);
    setIsJsonModelModalVisible(false);
  };

  const handleJsonModelModalCancel = () => {
    setIsJsonModelModalVisible(false);
  };

  const onCopyJsonModel = async () => {
    const { query, sources } = await getConvertedQuery();
    const parameters = queryArguments.map(arg => arg.parameter);
    const model: IDataQuery = { query, sources, parameters };
    navigator.clipboard.writeText(JSON.stringify(model, null, 2));
  }

  const onExecuteQuery = async () => {
    try {
      setIsExecuting(true);
      setQueryResults(null);

      const { query, sources } = await getConvertedQuery();
      const parameters = queryArguments.map(arg => arg.parameter);
      const requestBody: IExecuteDataQueryRequest = {
        query, sources, parameters, arguments: queryArguments
      };

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

  return (
    <div className="app">
      {contextHolder}
      <main className="editor-container">
        <div className="query-info">
          <h3>Query Builder</h3>
          <div className='btn-group flex flex-col gap-2'>
            <Button onClick={onInsertTable({ selection: null, tableName: 'table_1', tableId: DEFAULT_UUID })} type='primary'>
              ✨ Insert Table
            </Button>
            <Button onClick={onInsertAssetTimeseries({ selection: null })} type='primary'>
              ✨ Insert Timeseries (Multiple)
            </Button>
            <Button onClick={onInsertSingleTimeseries({ selection: null })} type='primary'>
              ✨ Insert Timeseries (Single)
            </Button>
            <Button onClick={onInsertTable({ selection: null, tableName: 'table_2', tableId: 'e2d4d7fe-9722-44df-b8a2-500acc8c7101' })} type='primary'>
              ✨ Insert Invalid Table
            </Button>
            <Button onClick={onCopyJsonModel} type='primary'>
              ✨ Copy JSON Model
            </Button>
            <Button onClick={onLoadJsonModel} type='primary'>
              ✨ Load JSON Model
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
            defaultValue={''}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
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

      <HiddenConvertEditor ref={hiddenEditorRef} />

      {/* JSON Model Modal */}
      <JsonModelModal
        visible={isJsonModelModalVisible}
        onCancel={handleJsonModelModalCancel}
        onLoad={handleJsonModelLoad}
      />
    </div>
  )
}

export default App
