import { MindMapData } from "./types";
import { MindMapCanvas } from "./MindMapCanvas";

interface MindMapViewerProps {
  data: MindMapData;
  height?: number | string;
}

export const MindMapViewer = ({ data, height = "100%" }: MindMapViewerProps) => {
  return (
    <div className="w-full h-full" style={{ height }}>
      <MindMapCanvas data={data} />
    </div>
  );
};
