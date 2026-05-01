export interface MindMapNode {
  id: string;
  title: string;
  description?: string;
  children: MindMapNode[];
}

export interface MindMapData {
  root: MindMapNode;
}

export const createEmptyMindMap = (rootTitle = "Tema central"): MindMapData => ({
  root: {
    id: crypto.randomUUID(),
    title: rootTitle,
    description: "",
    children: [],
  },
});

export const createNode = (title = "Nuevo nodo"): MindMapNode => ({
  id: crypto.randomUUID(),
  title,
  description: "",
  children: [],
});

// Tree helpers
export const updateNode = (
  node: MindMapNode,
  id: string,
  updater: (n: MindMapNode) => MindMapNode
): MindMapNode => {
  if (node.id === id) return updater(node);
  return {
    ...node,
    children: node.children.map((c) => updateNode(c, id, updater)),
  };
};

export const removeNode = (node: MindMapNode, id: string): MindMapNode => ({
  ...node,
  children: node.children
    .filter((c) => c.id !== id)
    .map((c) => removeNode(c, id)),
});

export const addChild = (
  node: MindMapNode,
  parentId: string,
  child: MindMapNode
): MindMapNode => {
  if (node.id === parentId) {
    return { ...node, children: [...node.children, child] };
  }
  return {
    ...node,
    children: node.children.map((c) => addChild(c, parentId, child)),
  };
};
