import { MindMapData } from "./types";
import { MindMapCanvas } from "./MindMapCanvas";

interface MindMapViewerProps {
  data: MindMapData;
  height?: number | string;
  preview?: boolean;
  maxDepth?: number;
}

export const MindMapViewer = ({ data, height = "100%", preview, maxDepth }: MindMapViewerProps) => {
  return (
    <div className="w-full h-full" style={{ height }}>
      <MindMapCanvas data={data} preview={preview} maxDepth={maxDepth} />
    </div>
  );
};
