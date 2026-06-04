/**
 * CollectionGraph — the whole collection as a single React Flow graph.
 *
 * Every name lands on one canvas. Names that share an owner form a constellation
 * (a star with its co-owned siblings); names with a different owner become their
 * own constellation in the same space. The address is never drawn — it's the
 * invisible glue between siblings. Tapping a node selects it, driving the detail
 * panel above.
 *
 * Nodes are our own React components, so the themed chips carry over verbatim;
 * React Flow owns the viewport (pan / fit-to-view) and interaction so we don't.
 */
"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CollectionCluster, CollectionName } from "@/lib/zns/collection";

// Keep node counts sane: a single constellation can breathe; many must share space.
function siblingCap(clusterCount: number): number {
  return clusterCount === 1 ? 16 : 8;
}

function starOf(cluster: CollectionCluster, selected: string | null): CollectionName {
  return (
    cluster.names.find((n) => n.name === selected) ??
    cluster.names.find((n) => n.isSeed) ??
    cluster.names[0]
  );
}

type NameNodeData = {
  name: CollectionName;
  variant: "star" | "node";
  selected: boolean;
};
type NameNode = Node<NameNodeData, "name">;

// The node renderer — our themed chip. Hidden handles give React Flow something
// to anchor the edges to without drawing connection dots.
function NameNodeView({ data }: NodeProps<NameNode>) {
  const { name, variant, selected } = data;
  const isStar = variant === "star";
  const isUnregistered = !!name.unregistered;
  return (
    <div
      title={isUnregistered ? `${name.name} — not registered yet` : name.forSale ? `${name.name} — listed for sale` : name.name}
      className="inline-flex max-w-[9rem] cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{
        background: "var(--color-raised)",
        opacity: isUnregistered ? 0.5 : 1,
        borderStyle: isUnregistered ? "dashed" : "solid",
        borderColor: selected
          ? "var(--hero-headline-accent)"
          : name.forSale
            ? "var(--home-result-status-forsale-border)"
            : "var(--leaders-card-border)",
        boxShadow: selected
          ? "0 0 0 2px var(--hero-headline-accent)"
          : isStar && !isUnregistered
            ? "0 8px 22px rgba(0,0,0,0.2)"
            : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} isConnectable={false} />
      {name.forSale && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--home-result-status-forsale-fg)" }}
          aria-hidden="true"
        />
      )}
      <span
        className={`truncate text-[0.8rem] ${isStar && !isUnregistered ? "font-bold" : "font-semibold"}`}
        style={{ color: isStar && !isUnregistered ? "var(--fg-heading)" : "var(--fg-muted)" }}
      >
        {name.name}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} isConnectable={false} />
    </div>
  );
}

const nodeTypes: NodeTypes = { name: NameNodeView };

export default function CollectionGraph({
  clusters,
  selected,
  onNameClick,
}: {
  clusters: CollectionCluster[];
  selected: string | null;
  onNameClick: (name: string) => void;
}) {
  const { nodes, edges } = useMemo(() => {
    const k = clusters.length;
    const cap = siblingCap(k);
    const nodes: NameNode[] = [];
    const edges: Edge[] = [];

    // Constellation centre (in flow px). fitView scales the whole thing to fit,
    // so absolute values only need to be internally consistent.
    function anchorFor(i: number) {
      if (k === 1) return { x: 0, y: 0 };
      const R = 340;
      const theta = (i / k) * Math.PI * 2 - Math.PI / 2;
      return { x: R * Math.cos(theta), y: R * Math.sin(theta) };
    }

    clusters.forEach((cluster, i) => {
      const anchor = anchorFor(i);
      const star = starOf(cluster, selected);
      const starId = `${cluster.key}:${star.name}`;
      nodes.push({
        id: starId,
        type: "name",
        position: anchor,
        data: { name: star, variant: "star", selected: star.name === selected },
        draggable: false,
      });

      const siblings = cluster.names.filter((n) => n !== star).slice(0, cap);
      const rx = k === 1 ? 230 : 150;
      const ry = k === 1 ? 160 : 130;
      siblings.forEach((sib, j) => {
        const angle = (j / siblings.length) * Math.PI * 2 - Math.PI / 2;
        const id = `${cluster.key}:${sib.name}`;
        nodes.push({
          id,
          type: "name",
          position: { x: anchor.x + rx * Math.cos(angle), y: anchor.y + ry * Math.sin(angle) },
          data: { name: sib, variant: "node", selected: sib.name === selected },
          draggable: false,
        });
        edges.push({
          id: `${starId}->${id}`,
          source: starId,
          target: id,
          type: "straight",
          style: { stroke: "var(--leaders-card-border)", strokeWidth: 1.5 },
        });
      });
    });

    return { nodes, edges };
  }, [clusters, selected]);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)", height: 440 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNameClick((node as NameNode).data.name.name)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: false }}
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--leaders-card-border)" />
      </ReactFlow>
    </div>
  );
}
