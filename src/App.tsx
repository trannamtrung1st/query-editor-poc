import { useRef, useState } from 'react'
import Editor, { useMonaco, type Monaco } from '@monaco-editor/react'
import { editor as MonacoEditor, Range } from 'monaco-editor';
import './App.css'
import { APP_DECORATION_PREFIX, DEFAULT_UUID, QuerySource } from './constants';
import { uniqueId } from 'lodash';
import { newAssetTableQuerySource, type IRawQuerySource } from "./models/IRawQuerySource";
import { QueryProcessor } from './implementations/QueryProcessor';

const { TrackedRangeStickiness } = MonacoEditor;

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

  const [sqlQuery, setSqlQuery] = useState(``)

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
      editor.removeDecorations(affectedIds);
      affectedIds.forEach(id => delete decorationsRef.current[id]);
    });

    if (value !== undefined)
      setSqlQuery(value)
  }

  const handleEditorDidMount = (editor: MonacoEditor.IStandaloneCodeEditor, _: Monaco) => {
    editorRef.current = editor;
  }

  const onInsertTable = () => {
    const editor = editorRef.current!;
    const selection = editor.getSelection();
    if (!selection) return;

    const TABLE_NAME = `table_1`;
    const SQL_TABLE_NAME = `"${TABLE_NAME}"`;
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

    const querySource = newAssetTableQuerySource(uniqueId('markup_'), DEFAULT_UUID);
    const decorations = editor.createDecorationsCollection([
      {
        range: insertedRange,
        options: {
          inlineClassName: `${APP_DECORATION_PREFIX}asset-table-tag`,
          stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `Asset: ${ASSET_NAME}\n\nTable: ${TABLE_NAME}`
          },
          after: {
            content: '',
            attachedData: querySource
          }
        }
      }
    ]);

    const range = decorations.getRange(0);
    if (range) {
      const decorationId = (decorations as any)._decorationIds[0];
      decorationsRef.current[decorationId] = { range, content: SQL_TABLE_NAME };
    }

    console.log('Table name inserted and highlighted:', TABLE_NAME, decorations);

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
        case QuerySource.ASSET_TABLE: {
          queryProcessor.replace(decorationRange, `"{{${querySource.markup}}}"`);
          break;
        }
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
    const { query, sources } = getFinalQuery();
    const response = await fetch('http://localhost:5053/dqry/queries/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, sources })
    });
    const data = await response.json();
    console.log('Query executed:', data);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>SQL Query Editor</h1>
        <p>Write and edit your SQL queries with syntax highlighting and IntelliSense</p>
      </header>

      <main className="editor-container">
        <div className="editor-wrapper">
          <Editor
            height="65vh"
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
            <button
              className='bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md cursor-pointer transition-colors duration-200 mr-2'
              onClick={onInsertTable}
            >
              ✨ Insert Table
            </button>
            <button
              className='bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md cursor-pointer transition-colors duration-200 mr-2'
              onClick={onCopyFinalQuery}
            >
              ✨ Copy Final Query
            </button>
            <button
              className='bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md cursor-pointer transition-colors duration-200 mr-2'
              onClick={onExecuteQuery}
            >
              ✨ Execute Query
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
