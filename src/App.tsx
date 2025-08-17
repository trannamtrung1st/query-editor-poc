import { useRef, useState } from 'react'
import Editor, { useMonaco, type Monaco } from '@monaco-editor/react'
import { editor as MonacoEditor, Range } from 'monaco-editor';
import './App.css'
import { APP_DECORATION_PREFIX, DEFAULT_ATTRIBUTE_NAMES, DEFAULT_UUID, QuerySource } from './constants';
import { uniqueId } from 'lodash';
import { newAssetTableQuerySource, newTimeseriesQuerySource, type IRawQuerySource } from "./models/IRawQuerySource";
import { QueryProcessor } from './implementations/QueryProcessor';
import type { IExecuteDataQueryResponse } from './models/IExecuteDataQueryResponse';
import QueryResultTable from './components/QueryResultTable';
import AssetAttributeModal from './components/AssetAttributeModal';
import { Button, notification } from 'antd';

const { TrackedRangeStickiness, InjectedTextCursorStops } = MonacoEditor;

type DecorationRef = {
  [key: string]: {
    range: Range;
    content: string;
  }
}

function App() {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor>(null);
  const monaco = useMonaco()!;
  const decorationsRef = useRef<DecorationRef>({});
  const [noti, contextHolder] = notification.useNotification();

  const [sqlQuery, setSqlQuery] = useState(``)
  const [queryResults, setQueryResults] = useState<IExecuteDataQueryResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isAssetModalVisible, setIsAssetModalVisible] = useState(false);
  const [selectedQuerySource, setSelectedQuerySource] = useState<IRawQuerySource | null>(null);

  const handleEditorChange = (value: string | undefined, ev: MonacoEditor.IModelContentChangedEvent) => {
    const editor = editorRef.current!;
    console.log(ev);

    ev.changes.forEach(change => {
      const changedRange = new monaco.Range(change.range.startLineNumber, change.range.startColumn, change.range.endLineNumber, change.range.endColumn);
      const affectedIds = (editor.getDecorationsInRange(changedRange) || [])
        .filter(d => d.options?.inlineClassName?.startsWith(APP_DECORATION_PREFIX))
        .filter(d => {
          const cachedDecoration = decorationsRef.current[d.id];
          const content = editor.getModel()?.getValueInRange(d.range);
          return content !== cachedDecoration?.content;
        }).map(d => d.id);

      if (affectedIds.length) {
        editor.removeDecorations(affectedIds);
        affectedIds.forEach(id => delete decorationsRef.current[id]);
      }
    });

    if (value !== undefined)
      setSqlQuery(value)
  }

  const handleAssetColumnCountClick = (querySource: IRawQuerySource) => {
    console.log('Clicked on a clickable decoration:', querySource);
    setSelectedQuerySource(querySource);
    setIsAssetModalVisible(true);
  }

  const handleEditorDidMount = (editor: MonacoEditor.IStandaloneCodeEditor, _: Monaco) => {
    editorRef.current = editor;
    editor.onMouseDown((e) => {
      if (!('detail' in e.target) || typeof e.target.detail !== 'object' || !('injectedText' in e.target.detail))
        return;

      const injectedText = e.target.detail.injectedText as any;
      const attachedData = injectedText?.options?.attachedData as IRawQuerySource;
      if (!attachedData || attachedData.type !== QuerySource.TIMESERIES) return;

      handleAssetColumnCountClick(attachedData);
    });
  }

  const onInsertTable = (tableName: string, tableId: string) => () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const SQL_TABLE_NAME = `"${tableName}"`;
    const COLUMN_COUNT = 3;
    const ASSET_NAME = `asset_1`;
    // Execute the edit to insert the table name
    editor.executeEdits('insert-table', [{
      range: selection,
      text: SQL_TABLE_NAME
    }]);

    // After inserting, create decoration to highlight the inserted text
    const insertedRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + SQL_TABLE_NAME.length
    );

    const querySource = newAssetTableQuerySource(uniqueId('markup_'), tableId);
    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-table-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `**Asset:** ${ASSET_NAME}\n\n**Table:** ${tableName}`
          },
          before: {
            content: 'TBL',
            cursorStops: InjectedTextCursorStops.Both,
            inlineClassName: `${APP_DECORATION_PREFIX}asset-table-before`,
            inlineClassNameAffectsLetterSpacing: true
          },
          after: {
            attachedData: querySource,
            content: `${COLUMN_COUNT}☷`,
            cursorStops: InjectedTextCursorStops.Both,
            inlineClassName: `${APP_DECORATION_PREFIX}asset-table-after`,
            inlineClassNameAffectsLetterSpacing: true
          }
        }
      }
    ]);

    const range = decorations.getRange(0);
    if (range) {
      const decorationId = (decorations as any)._decorationIds[0];
      decorationsRef.current[decorationId] = { range, content: SQL_TABLE_NAME };
    }

    console.log('Table name inserted and highlighted:', tableName, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const onInsertAssetTimeseries = () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const COLUMN_COUNT = 5;
    const ASSET_NAME = `asset_1`;
    const SQL_ASSET_NAME = `'${ASSET_NAME}'`;
    // Execute the edit to insert the table name
    editor.executeEdits('insert-asset', [{
      range: selection,
      text: SQL_ASSET_NAME
    }]);

    // After inserting, create decoration to highlight the inserted text
    const insertedRange = new monaco.Range(
      selection.startLineNumber,
      selection.startColumn,
      selection.startLineNumber,
      selection.startColumn + SQL_ASSET_NAME.length
    );

    const querySource = newTimeseriesQuerySource(uniqueId('markup_'), DEFAULT_UUID, DEFAULT_ATTRIBUTE_NAMES);
    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `**Asset:** ${ASSET_NAME}\n${DEFAULT_ATTRIBUTE_NAMES.map(name => `- ${name}`).join('\n')}`
          },
          before: {
            content: 'AST',
            cursorStops: InjectedTextCursorStops.Both,
            inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-before`,
            inlineClassNameAffectsLetterSpacing: true
          },
          after: {
            attachedData: querySource,
            content: `${COLUMN_COUNT}☷`,
            cursorStops: InjectedTextCursorStops.Both,
            inlineClassName: `${APP_DECORATION_PREFIX}asset-timeseries-after`,
            inlineClassNameAffectsLetterSpacing: true
          }
        }
      }
    ]);

    const range = decorations.getRange(0);
    if (range) {
      const decorationId = (decorations as any)._decorationIds[0];
      decorationsRef.current[decorationId] = { range, content: SQL_ASSET_NAME };
    }

    console.log('Asset timeseries inserted and highlighted:', ASSET_NAME, decorations);

    // Store decoration reference for potential removal later
    return decorations;
  }

  const getFinalQuery = () => {
    const model = editorRef.current!.getModel()!;
    const queryProcessor = new QueryProcessor(sqlQuery);
    const sources: IRawQuerySource[] = [];

    for (const [decorationId] of Object.entries(decorationsRef.current)) {
      const decorationOpts = model.getDecorationOptions(decorationId)!;
      const decorationRange = model.getDecorationRange(decorationId)!;
      const querySource = decorationOpts?.after?.attachedData as IRawQuerySource;
      if (!querySource) continue;

      sources.push(querySource);
      switch (querySource.type) {
        case QuerySource.ASSET_TABLE:
          queryProcessor.replace(decorationRange, `"{{${querySource.markup}}}"`);
          break;
        case QuerySource.TIMESERIES:
          queryProcessor.replace(decorationRange, `'{{${querySource.markup}}}'`);
          break;
      }
    }

    return { query: queryProcessor.query, sources };
  }

  const onCopyFinalQuery = () => {
    const { query } = getFinalQuery();
    console.log('Final query:', query);
    navigator.clipboard.writeText(query);
  }

  const onExecuteQuery = async () => {
    try {
      setIsExecuting(true);
      setQueryResults(null);

      const { query, sources } = getFinalQuery();
      const response = await fetch('http://localhost:5053/dqry/queries/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, sources })
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

  const handleAssetModalSave = (updatedQuerySource: IRawQuerySource) => {
    // Update the decoration with the new query source
    if (editorRef.current && selectedQuerySource) {
      const model = editorRef.current.getModel();
      if (model) {
        // Find and update the decoration
        const decorations = model.getAllDecorations();
        const targetDecoration = decorations.find(d => {
          const attachedData = d.options?.after?.attachedData as IRawQuerySource;
          return attachedData?.markup === selectedQuerySource.markup;
        });

        if (targetDecoration) {
          // Create new decoration options with updated attached data
          const afterOptions = targetDecoration.options?.after;
          if (afterOptions) {
            const newDecorationOptions = {
              ...targetDecoration.options,
              after: {
                ...afterOptions,
                content: `${updatedQuerySource.sourceConfig?.attributeNames?.length}☷`,
                attachedData: updatedQuerySource
              }
            };

            // Remove old decoration and create new one
            editorRef.current.removeDecorations([targetDecoration.id]);
            delete decorationsRef.current[targetDecoration.id];

            const newDecorations = editorRef.current.createDecorationsCollection([{
              range: targetDecoration.range,
              options: newDecorationOptions
            }]);

            // Update the decorationsRef
            const newDecorationId = (newDecorations as any)._decorationIds[0];
            if (newDecorationId) {
              decorationsRef.current[newDecorationId] = {
                range: targetDecoration.range,
                content: model.getValueInRange(targetDecoration.range)
              };
            }
          }
        }
      }
    }

    setIsAssetModalVisible(false);
    setSelectedQuerySource(null);
  };

  return (
    <div className="app">
      {contextHolder}
      <main className="editor-container">
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

        <div className="query-info">
          <h3>Query Information</h3>
          <div className="info-item">
            <strong>Lines:</strong> {sqlQuery.split('\n').length}
          </div>
          <div className="info-item">
            <strong>Characters:</strong> {sqlQuery.length}
          </div>
          <div className="info-item">
            <strong>Words:</strong> {sqlQuery.split(/\s+/).filter(word => word.length > 0).length}
          </div>

          <div className='btn-group flex flex-col gap-2'>
            <Button onClick={onInsertTable('table_1', DEFAULT_UUID)} type='primary'>
              ✨ Insert Table
            </Button>
            <Button onClick={onInsertAssetTimeseries} type='primary'>
              ✨ Insert Asset Timeseries
            </Button>
            <Button onClick={onInsertTable('table_2', 'e2d4d7fe-9722-44df-b8a2-500acc8c7101')} type='primary'>
              ✨ Insert Invalid Table
            </Button>
            <Button onClick={onCopyFinalQuery} type='primary'>
              ✨ Copy Final Query
            </Button>
            <Button onClick={onExecuteQuery} disabled={isExecuting} type='primary'>
              {isExecuting ? '⏳ Executing...' : '✨ Execute Query'}
            </Button>
          </div>
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
        onSave={handleAssetModalSave}
        querySource={selectedQuerySource}
      />
    </div>
  )
}

export default App
