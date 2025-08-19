import { Editor } from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { editor as MonacoEditor, type IRange } from 'monaco-editor';
import type { RawQuerySourceVM } from "../models/IRawQuerySource";
import './HiddenConvertEditor.scss';

export interface IHiddenConvertCommand {
  sourceDecorations: { source: RawQuerySourceVM, decoration: MonacoEditor.IModelDecoration }[];
  query: string;
}

export interface IHiddenConvertResult {
  query: string;
  sourceRangeMap: { [key: string]: IRange };
}

export interface IHiddenConvertEditorRef {
  hiddenConvert: (command: IHiddenConvertCommand) => Promise<IHiddenConvertResult>;
}

export interface IHiddenConvertEditorProps { }

const HiddenConvertEditor = forwardRef<IHiddenConvertEditorRef, IHiddenConvertEditorProps>((_, ref) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor>(null);

  const handleEditorDidMount = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  }

  const hiddenConvert = async (command: IHiddenConvertCommand): Promise<IHiddenConvertResult> => {
    const { sourceDecorations, query } = command;
    const editor = editorRef.current!;
    const model = editor.getModel()!;
    const oldDecorations = model.getAllDecorations();
    editor.setValue(query);
    editor.removeDecorations(oldDecorations.map(d => d.id));

    const trackingDecorations = editor.createDecorationsCollection(sourceDecorations.map(({ decoration }) => ({
      range: decoration.range, options: {}
    })));
    const decorationIds: string[] = (trackingDecorations as any)._decorationIds;
    const sourceTrackingDecorationMap: { [key: string]: string } = {};
    sourceDecorations.forEach(({ source }, index) => {
      sourceTrackingDecorationMap[source.markup] = decorationIds[index];
    });

    const sourceRangeMap: { [key: string]: IRange } = {};
    for (const { source } of sourceDecorations) {
      const decorationId = sourceTrackingDecorationMap[source.markup];
      const decorationRange = model.getDecorationRange(decorationId);
      if (!decorationRange) continue;

      const text = `"{{${source.markup}}}"`;
      editor.executeEdits('hidden-convert', [{
        range: decorationRange, text,
        forceMoveMarkers: true
      }]);

      sourceRangeMap[source.markup] = {
        startLineNumber: decorationRange.startLineNumber,
        startColumn: decorationRange.startColumn,
        endLineNumber: decorationRange.endLineNumber,
        endColumn: decorationRange.startColumn + text.length
      };
    }

    const currentQuery = model.getValue();
    return {
      query: currentQuery,
      sourceRangeMap
    };
  };

  useImperativeHandle(ref, () => ({
    hiddenConvert
  }));

  return (
    <Editor
      loading=""
      className="hidden-convert-editor"
      height={0}
      width={0}
      defaultLanguage="sql"
      theme="vs-dark" // [IMPORTANT] must same with the main editor
      onMount={handleEditorDidMount}
    />
  )
});

export default HiddenConvertEditor;
